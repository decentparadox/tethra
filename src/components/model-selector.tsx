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

export default function ModelSelector({ conversationId }: { conversationId?: string }) {
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
        
        // Try to load from localStorage first, fallback to default
        const storedModel = localStorage.getItem("selected-model");
        const modelToUse = storedModel && list.find(m => m.model === storedModel) ? storedModel : def;
        
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
              {models.filter(m => m.enabled).map((m) => (
                <CommandItem
                  key={m.model}
                  value={m.model}
                  onSelect={async (current) => {
                    // Only enabled models are shown, so this is always a valid selection
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


