import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Eye, EyeOff, Copy, Plus, Pencil, Trash, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import ModelIcon, { type ModelType } from "@/components/model-icon";

type Settings = {
  openai_api_key?: string | null;
  anthropic_api_key?: string | null;
  gemini_api_key?: string | null;
  groq_api_key?: string | null;
  openrouter_api_key?: string | null;
  deepseek_api_key?: string | null;
  openai_base_url?: string | null;
  anthropic_base_url?: string | null;
  gemini_base_url?: string | null;
  groq_base_url?: string | null;
  openrouter_base_url?: string | null;
  deepseek_base_url?: string | null;
  openai_models?: string[] | null;
  anthropic_models?: string[] | null;
  gemini_models?: string[] | null;
  groq_models?: string[] | null;
  openrouter_models?: string[] | null;
  deepseek_models?: string[] | null;
  openai_enabled?: boolean | null;
  anthropic_enabled?: boolean | null;
  gemini_enabled?: boolean | null;
  groq_enabled?: boolean | null;
  openrouter_enabled?: boolean | null;
  deepseek_enabled?: boolean | null;
};

type ProviderKey = "OpenAI" | "Anthropic" | "Gemini" | "Groq" | "OpenRouter" | "DeepSeek";

const providerMeta: Record<ProviderKey, {
  keyField: keyof Settings;
  baseUrlField: keyof Settings;
  modelsField: keyof Settings;
  placeholder: string;
  docs: string;
}> = {
  OpenAI: {
    keyField: "openai_api_key",
    baseUrlField: "openai_base_url",
    modelsField: "openai_models",
    placeholder: "sk-...",
    docs: "https://platform.openai.com/docs/overview",
  },
  Anthropic: {
    keyField: "anthropic_api_key",
    baseUrlField: "anthropic_base_url",
    modelsField: "anthropic_models",
    placeholder: "sk-ant-...",
    docs: "https://docs.anthropic.com/",
  },
  Gemini: {
    keyField: "gemini_api_key",
    baseUrlField: "gemini_base_url",
    modelsField: "gemini_models",
    placeholder: "AIza...",
    docs: "https://ai.google.dev/gemini-api/docs",
  },
  Groq: {
    keyField: "groq_api_key",
    baseUrlField: "groq_base_url",
    modelsField: "groq_models",
    placeholder: "gsk_...",
    docs: "https://console.groq.com/docs",
  },
  OpenRouter: {
    keyField: "openrouter_api_key",
    baseUrlField: "openrouter_base_url",
    modelsField: "openrouter_models",
    placeholder: "or-...",
    docs: "https://openrouter.ai/docs",
  },
  DeepSeek: {
    keyField: "deepseek_api_key",
    baseUrlField: "deepseek_base_url",
    modelsField: "deepseek_models",
    placeholder: "sk-...",
    docs: "https://platform.deepseek.com/docs",
  },
};

export default function ProvidersTab() {
  const [active, setActive] = useState<ProviderKey | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [showKey, setShowKey] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [customModelInput, setCustomModelInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cur = await invoke<any>("get_settings");
        setSettings(cur);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (active) {
      fetchAdapterModels(active);
    } else {
      setFetchedModels([]);
      setFetchError(null);
    }
  }, [active]);

  const update = async (patch: Partial<Settings>) => {
    try {
      const saved = await invoke<any>("update_settings", { update: patch });
      setSettings(saved);
      
      // Auto-load models if an API key was just set
      if (active) {
        const meta = providerMeta[active];
        const oldKeyValue = (settings[meta.keyField] as string) ?? "";
        const newKeyValue = (patch[meta.keyField] as string) ?? oldKeyValue;
        
        // If API key was added and we don't have models yet, auto-fetch them
        if (!oldKeyValue && newKeyValue && newKeyValue.trim().length > 0) {
          const currentModels = (saved[meta.modelsField] as string[] | null) ?? [];
          if (currentModels.length === 0) {
            try {
              const fetchedModelsList = await invoke<string[]>("get_adapter_models", { adapterKind: active });
              if (fetchedModelsList.length > 0) {
                // Auto-add all fetched models
                await invoke<any>("update_settings", { 
                  update: { [meta.modelsField]: fetchedModelsList } as any 
                });
                // Refresh settings to get the updated models
                const finalSettings = await invoke<any>("get_settings");
                setSettings(finalSettings);
              }
            } catch (error) {
              console.log("Failed to auto-fetch models:", error);
            }
          }
        }
      }
    } catch {}
  };

  const fetchAdapterModels = async (adapterKind: ProviderKey) => {
    setIsFetchingModels(true);
    setFetchError(null);
    try {
      const models = await invoke<string[]>("get_adapter_models", { adapterKind });
      setFetchedModels(models);
    } catch (error) {
      setFetchError(error as string);
      setFetchedModels([]);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Check if API key is set for the active provider
  const hasApiKey = useMemo(() => {
    if (!active) return false;
    const meta = providerMeta[active];
    const keyValue = settings[meta.keyField] as string;
    return keyValue && keyValue.trim().length > 0;
  }, [active, settings]);

  const models: string[] = useMemo(() => {
    if (!active) return [];
    const meta = providerMeta[active];
    return (settings[meta.modelsField] as string[] | null | undefined) ?? [];
  }, [settings, active]);

  const addModel = () => {
    if (!active) return;
    
    // For OpenRouter, use custom input UI instead of prompt
    if (active === "OpenRouter") {
      setShowCustomInput(true);
      return;
    }
    
    // For other providers, use prompt
    const name = prompt("Add model id (e.g. gemini-1.5-flash)")?.trim();
    if (!name) return;
    const set = Array.from(new Set([...(models || []), name]));
    const meta = providerMeta[active];
    void update({ [meta.modelsField]: set } as any);
  };
  const editModel = (oldName: string) => {
    if (!active) return;
    const name = prompt("Edit model id", oldName)?.trim();
    if (!name || name === oldName) return;
    const set = (models || []).map((m) => (m === oldName ? name : m));
    const meta = providerMeta[active];
    void update({ [meta.modelsField]: set } as any);
  };
  const deleteModel = (id: string) => {
    if (!active) return;
    const set = (models || []).filter((m) => m !== id);
    const meta = providerMeta[active];
    void update({ [meta.modelsField]: set } as any);
  };

  const addCustomModel = () => {
    if (!active || !customModelInput.trim()) return;
    const meta = providerMeta[active];
    const models = (settings[meta.modelsField] as string[] | null) ?? [];
    const newModel = customModelInput.trim();
    
    // Check if model already exists
    if (models.includes(newModel)) {
      return; // Model already exists, don't add duplicate
    }
    
    const updatedModels = [...models, newModel];
    update({ [meta.modelsField]: updatedModels } as any);
    setCustomModelInput("");
    setShowCustomInput(false);
  };

  const providerToIcon = (p: ProviderKey): ModelType => {
    switch (p) {
      case "OpenAI":
        return "openai";
      case "Anthropic":
        return "anthropic";
      case "Gemini":
        return "gemini";
      case "Groq":
        return "mistral"; // fallback icon for Groq
      case "OpenRouter":
        return "openrouter";
      case "DeepSeek":
        return "deepseek"
      default:
        return "openai";
    }
  };

  return (
    <div className="flex w-full gap-4">
      {active === null ? (
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-mondwest">Model Providers</div>
            <button className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10 inline-flex items-center gap-1" disabled>
              + Add Provider
            </button>
          </div>
          <div className="divide-y divide-white/10 rounded-lg border border-white/10">
            {(["OpenAI","Anthropic","Gemini","Groq","OpenRouter","DeepSeek"] as ProviderKey[]).map((p) => {
              const enabledField = `${p.toLowerCase()}_enabled` as keyof Settings;
              const modelsField = providerMeta[p].modelsField;
              const modelCount = ((settings[modelsField] as string[] | null) ?? []).length;
              const isEnabled = (settings[enabledField] as boolean | null) ?? true;
              return (
                <div key={p} className="flex items-center justify-between px-3 py-3 hover:bg-white/5">
                  <div className="flex items-center gap-4">
                    <ModelIcon className="size-7" model={providerToIcon(p)} />
                    <div className="flex flex-col">
                      <div className="font-medium">{p}</div>
                      <div className="text-xs opacity-70">{modelCount} Models</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10"
                      title="Settings"
                      onClick={() => setActive(p)}
                    >
                      <SettingsIcon size={14} />
                    </button>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!!isEnabled}
                        onChange={(e) => update({ [enabledField]: e.target.checked } as any)}
                      />
                      <div className="w-10 h-5 bg-white/10 peer-checked:bg-blue-500/70 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white/80 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4">
          <button className="inline-flex items-center gap-1 text-xs opacity-70 hover:opacity-100" onClick={() => setActive(null)}>
            <ArrowLeft size={14} /> Back to Model Providers
          </button>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="text-xl font-mondwest mb-1 flex items-center gap-2">
              <ModelIcon className="size-5" model={providerToIcon(active)} />
              {active}
            </div>
            <div className="text-xs opacity-70 mb-3">Enter your API key. See <a className="underline" href={providerMeta[active].docs} target="_blank" rel="noreferrer">docs</a>.</div>
            <div className="flex items-center gap-2">
              <input
                type={showKey ? "text" : "password"}
                name="key"
                className="w-full bg-white/5 rounded px-3 py-2 text-sm border border-white/10"
                placeholder={providerMeta[active].placeholder}
                value={(settings[providerMeta[active].keyField] as string) ?? ""}
                onChange={(e) => update({ [providerMeta[active].keyField]: e.target.value } as any)}
              />
              <button className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10" onClick={() => setShowKey((v)=>!v)}>
                {showKey ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
              <button
                className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10"
                onClick={() => {
                  const v = (settings[providerMeta[active].keyField] as string) ?? "";
                  if (v) navigator.clipboard.writeText(v);
                }}
              >
                <Copy size={16} />
              </button>
            </div>
            <div className="mt-3">
              <div className="text-sm mb-1">Base URL</div>
              <input
                className="w-full bg-white/5 rounded px-3 py-2 text-sm border border-white/10"
                name="baseurl"
                placeholder={providerMeta[active].baseUrlField}
                value={(settings[providerMeta[active].baseUrlField] as string) ?? ""}
                onChange={(e) => update({ [providerMeta[active].baseUrlField]: e.target.value } as any)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="text-lg font-mondwest">Models</div>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => fetchAdapterModels(active!)}
                  disabled={isFetchingModels}
                >
                  {isFetchingModels ? (
                    <div className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <SettingsIcon size={14} />
                  )}
                  {isFetchingModels ? 'Fetching...' : 'Fetch Models'}
                </button>
                <button className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10" onClick={addModel}>
                  <Plus size={14}/> Add
                </button>
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {/* Fetched models from API */}
              {fetchedModels.length > 0 && (
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="text-sm font-medium mb-2 text-white/80">
                    Available Models from API:
                    {!hasApiKey && (
                      <span className="text-xs text-red-400 ml-2">
                        (API key required to add models)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {fetchedModels
                      .filter((model) => !models.includes(model)) // Filter out already configured models
                      .map((model) => (
                        <div key={model} className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 flex items-center justify-between">
                          <span className="truncate">{model}</span>
                          <button
                            className="ml-2 p-0.5 rounded bg-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                              const set = Array.from(new Set([...(models || []), model]));
                              const meta = providerMeta[active!];
                              void update({ [meta.modelsField]: set } as any);
                            }}
                            disabled={!hasApiKey}
                            title={hasApiKey ? "Add to my models" : "Set API key first"}
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      ))}
                    {fetchedModels.filter((model) => !models.includes(model)).length === 0 && fetchedModels.length > 0 && (
                      <div className="col-span-full text-xs text-white/60 text-center py-2">
                        All available models have been added to your list
                      </div>
                    )}
                  </div>
                  {fetchedModels.filter((model) => !models.includes(model)).length > 0 && hasApiKey && (
                    <div className="mt-2 flex justify-center">
                      <button
                        className="px-3 py-1 text-xs rounded-md bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-200"
                        onClick={() => {
                          const newModels = fetchedModels.filter((model) => !models.includes(model));
                          const set = Array.from(new Set([...(models || []), ...newModels]));
                          const meta = providerMeta[active!];
                          void update({ [meta.modelsField]: set } as any);
                        }}
                      >
                        Add All Available Models ({fetchedModels.filter((model) => !models.includes(model)).length})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Error message */}
              {fetchError && (
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="text-sm text-red-400">
                    <div className="font-medium mb-1">Failed to fetch models:</div>
                    <div className="text-xs opacity-70">{fetchError}</div>
                  </div>
                </div>
              )}

              {/* Manually configured models */}
              {models.length === 0 ? (
                <div className="px-4 py-3 text-sm opacity-70">No models configured.</div>
              ) : (
                models.map((m) => (
                  <div key={m} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div>{m}</div>
                    <div className="flex items-center gap-2">
                      <button className="p-1 rounded bg-white/5 border border-white/10" onClick={() => editModel(m)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button className="p-1 rounded bg-white/5 border border-white/10" onClick={() => deleteModel(m)} title="Delete">
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Custom model input for OpenRouter */}
              {active === "OpenRouter" && showCustomInput && (
                <div className="px-4 py-3 border-t border-white/10 bg-white/5">
                  <div className="text-sm font-medium mb-2 text-white/80">Add Custom Model</div>
                  <div className="text-xs text-white/60 mb-3">
                    Enter a model ID from OpenRouter (e.g., "anthropic/claude-3.5-sonnet", "openai/gpt-4o", "meta-llama/llama-3.1-70b-instruct")
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      placeholder="provider/model-name"
                      className="flex-1 bg-white/5 rounded px-3 py-2 text-sm border border-white/10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addCustomModel();
                        } else if (e.key === "Escape") {
                          setShowCustomInput(false);
                          setCustomModelInput("");
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={addCustomModel}
                      disabled={!customModelInput.trim()}
                      className="px-3 py-2 text-sm rounded bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomModelInput("");
                      }}
                      className="px-3 py-2 text-sm rounded bg-white/10 border border-white/20 hover:bg-white/15"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


