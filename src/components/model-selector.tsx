import { useEffect, useMemo, useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { listChatModels, type ListedModel, getConversation, updateConversationModel } from "../lib/chat";
import { PROVIDERS } from "../components/providers";
import { getCachedProviders } from "../lib/api-keys";
import ModelIcon, { type ModelType } from "@/components/model-icon";

function toIcon(adapter: string): ModelType {
  if (!adapter) return "gemini";
  const key = adapter.toLowerCase();
  if (key.includes("openai")) return "openai";
  if (key.includes("anthropic")) return "anthropic";
  if (key.includes("gemini") || key.includes("google")) return "gemini";
  if (key.includes("groq")) return "grok"; // use grok icon for groq
  if (key.includes("openrouter")) return "openrouter";
  if (key.includes("mistral")) return "mistral";
  if (key.includes("ollama")) return "ollama";
  if (key.includes("x.ai") || key.includes("grok")) return "xai";
  return key as ModelType;
}

// helper for provider icons (reserved for future use)
// function getProviderIcon(providerName: string): ModelType {
//   switch (providerName) {
//     case "google": return "gemini";
//     case "openai": return "openai";
//     case "anthropic": return "anthropic";
//     case "groq": return "grok";
//     case "openrouter": return "openrouter";
//     default: return "gemini";
//   }
// }

export default function ModelSelector({ conversationId }: { conversationId?: string }) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ListedModel[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);

  // Get available AI SDK models from providers
  const aiSdkModels = useMemo(() => {
    const cachedProviders = getCachedProviders();
    const availableModels: ListedModel[] = [];

    // Add provider models if they have cached API keys
    Object.entries(PROVIDERS).forEach(([providerName, provider]) => {
      if (cachedProviders.includes(providerName)) {
        provider.models.forEach(model => {
          availableModels.push({
            model,
            adapter_kind: provider.displayName,
            enabled: true,
          });
        });
      }
    });

    console.log('AI SDK Models:', availableModels);
    console.log('Cached Providers:', cachedProviders);

    return availableModels;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // First, try to initialize Google provider to ensure it's available
        try {
          const { initializeGoogle } = await import("../components/providers/google");
          await initializeGoogle();
          console.log("Google provider initialized successfully");
        } catch (error) {
          console.warn("Google provider not available:", error);
        }
        
        const backendModels = await listChatModels();
        console.log('Backend Models:', backendModels);
        
        // Merge backend models with AI SDK models
        const allModels = [
          ...backendModels,
          ...aiSdkModels.filter(sdkModel => 
            !backendModels.some(backendModel => backendModel.model === sdkModel.model)
          )
        ];
        
        console.log('All Models:', allModels);
        setModels(allModels);
        // All models from backend are now enabled by default if API key is set
        const def = allModels[0]?.model;
        
        // Try to load from localStorage first, fallback to default
        const storedModel = localStorage.getItem("selected-model");
        const modelToUse = storedModel && allModels.find(m => m.model === storedModel) ? storedModel : def;
        
        if (modelToUse) {
          setSelected((s) => {
            const newSelected = s ?? modelToUse;
            // Store in localStorage for new conversations
            localStorage.setItem("selected-model", newSelected);
            // Notify chat view of the initial selection
            if (!s) {
              window.dispatchEvent(new CustomEvent("model-selected", { detail: newSelected }));
            }
            return newSelected;
          });
        }
      } catch {}
    })();
  }, []);

  // Load conversation's stored model when conversationId changes
  useEffect(() => {
    if (conversationId) {
      (async () => {
        try {
          const conversation = await getConversation(conversationId);
          if (conversation.model) {
            setSelected(conversation.model);
            // Store in localStorage for consistency
            localStorage.setItem("selected-model", conversation.model);
            // Notify chat view of the conversation's model
            window.dispatchEvent(new CustomEvent("model-selected", { detail: conversation.model }));
          }
        } catch (error) {
          console.warn("Failed to load conversation model:", error);
        }
      })();
    }
  }, [conversationId]);

  const selectedMeta = useMemo(() => models.find((m) => m.model === selected), [models, selected]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 px-2 gap-2 bg-black/10 text-white border-white/10 hover:bg-black/15"
        >
          {selectedMeta ? (
            <>
              <ModelIcon className="size-4" model={toIcon(selectedMeta.adapter_kind)} />
              <span className="hidden sm:block truncate max-w-[180px]">
                {selectedMeta.model}
                {!selectedMeta.enabled ? " (API key required)" : ""}
              </span>
            </>
          ) : (
            <span>Select model</span>
          )}
          <ChevronsUpDown className="opacity-70" size={14} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Search model..." className="h-9" />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            <CommandGroup>
              {models.map((m) => (
                <CommandItem
                  key={m.model}
                  value={m.model}
                  onSelect={async (current) => {
                    // All models are now enabled by default if API key is set
                    setSelected(current);
                    setOpen(false);
                    
                    // Store current selection in localStorage for new conversations
                    localStorage.setItem("selected-model", current);
                    
                    // Persist the model selection if we have a conversation
                    if (conversationId) {
                      try {
                        await updateConversationModel(conversationId, current);
                      } catch (error) {
                        console.warn("Failed to persist model selection:", error);
                      }
                    }
                    
                    // Notify listeners (e.g., chat view)
                    window.dispatchEvent(new CustomEvent("model-selected", { detail: current }));
                  }}
                  className=""
                >
                  <ModelIcon className="mr-2 size-4" model={toIcon(m.adapter_kind)} />
                  <span className="truncate">{m.model}</span>
                  <Check
                    className={cn(
                      "ml-auto",
                      selected === m.model ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


