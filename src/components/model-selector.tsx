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
import { listChatModels, type ListedModel } from "../lib/chat";
import ModelIcon, { type ModelType } from "@/components/model-icon";

function toIcon(adapter: string): ModelType {
  if (!adapter) return "gemini";
  const key = adapter.toLowerCase();
  if (key.includes("openai")) return "openai";
  if (key.includes("anthropic")) return "anthropic";
  if (key.includes("gemini")) return "gemini";
  if (key.includes("groq")) return "mistral"; // fallback icon
  if (key.includes("openrouter")) return "openrouter";
  if (key.includes("mistral")) return "mistral";
  if (key.includes("ollama")) return "ollama";
  if (key.includes("x.ai") || key.includes("grok")) return "xai";
  return key as ModelType;
}

export default function ModelSelector() {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ListedModel[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const list = await listChatModels();
        setModels(list);
        const enabled = list.filter((m:any) => m.enabled);
        const def = enabled[0]?.model ?? list[0]?.model;
        if (def) {
          setSelected((s) => {
            const newSelected = s ?? def;
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
                  onSelect={(current) => {
                    // Allow selection of disabled models too, but show warning
                    setSelected(current);
                    setOpen(false);
                    // Notify listeners (e.g., chat view)
                    window.dispatchEvent(new CustomEvent("model-selected", { detail: current }));
                  }}
                  className={cn(!m.enabled && "opacity-50")}
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


