import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SettingsSection, Row } from "./_SettingsSection";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Appearance = {
  theme?: string | null;
  font_size?: string | null;
  code_show_line_numbers?: boolean | null;
  code_theme?: string | null;
  chat_width?: string | null;
  window_bg?: string | null;
  app_bg?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  destructive_color?: string | null;
};

type AppSettings = { appearance?: Appearance | null };

function applyAppearance(appearance?: Appearance | null) {
  const root = document.documentElement;
  const theme = appearance?.theme ?? "system";
  if (theme === "dark") root.classList.add("dark");
  else if (theme === "light") root.classList.remove("dark");
  const size = appearance?.font_size ?? "medium";
  root.style.setProperty(
    "--app-font-size",
    size === "small" ? "13px" : size === "large" ? "16px" : "14px"
  );
  const chat = appearance?.chat_width ?? "compact";
  root.style.setProperty("--chat-width", chat === "full" ? "100%" : "720px");
  const codeTheme = appearance?.code_theme ?? "github-dark";
  root.style.setProperty("--code-theme", codeTheme);
  // notify listeners (e.g., chat view) that code theme changed
  window.dispatchEvent(
    new CustomEvent("code-theme-changed", { detail: codeTheme })
  );
  if (appearance?.window_bg)
    root.style.setProperty("--sidebar", appearance.window_bg);
  if (appearance?.app_bg)
    root.style.setProperty("--background", appearance.app_bg);
  if (appearance?.primary_color)
    root.style.setProperty("--primary", appearance.primary_color);
  if (appearance?.accent_color)
    root.style.setProperty("--accent", appearance.accent_color);
  if (appearance?.destructive_color)
    root.style.setProperty("--destructive", appearance.destructive_color);
}

const palette = [
  { label: "Black", value: "#000000" },
  { label: "White", value: "#ffffff" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f59e0b" },
  { label: "Green", value: "#22c55e" },
  { label: "Lime", value: "#a3e635" },
  { label: "Purple", value: "#9333ea" },
];

export default function AppearanceTab() {
  const [settings, setSettings] = useState<AppSettings>({});

  useEffect(() => {
    (async () => {
      try {
        const s = await invoke<AppSettings>("get_settings");
        setSettings(s);
        applyAppearance(s.appearance);
      } catch {}
    })();
  }, []);

  const updateAppearance = async (patch: Partial<Appearance>) => {
    const next: AppSettings = {
      appearance: { ...settings.appearance, ...patch },
    };
    try {
      const saved = await invoke<AppSettings>("update_settings", {
        update: next,
      });
      setSettings(saved);
      applyAppearance(saved.appearance);
    } catch {}
  };

  const reset = async () => {
    try {
      const saved = await invoke<AppSettings>("reset_appearance");
      setSettings(saved);
      applyAppearance(saved.appearance);
    } catch {}
  };

  const theme = settings.appearance?.theme ?? "system";
  const font = settings.appearance?.font_size ?? "medium";
  const chat = settings.appearance?.chat_width ?? "compact";
  const showLines = settings.appearance?.code_show_line_numbers ?? true;
  const codeTheme = settings.appearance?.code_theme ?? "github-dark";
  const windowBg = settings.appearance?.window_bg ?? "#000000";
  const appBg = settings.appearance?.app_bg ?? "#000000";
  const primary = settings.appearance?.primary_color ?? "#3b82f6";
  const accent = settings.appearance?.accent_color ?? "#1d4ed8";
  const destructive = settings.appearance?.destructive_color ?? "#ef4444";

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection title="Appearance">
        <Row
          left={
            <>
              <div className="font-mondwest mb-1">Theme</div>
              <div className="text-xs opacity-70">Match the OS theme.</div>
            </>
          }
          right={
            <select
              className="bg-white/10 border border-white/10 rounded px-2 py-1 text-xs"
              value={theme}
              onChange={(e) => updateAppearance({ theme: e.target.value })}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          }
        />

        <Row
          left={
            <>
              <div className="font-mondwest mb-1">Font Size</div>
              <div className="text-xs opacity-70">
                Adjust the app's font size.
              </div>
            </>
          }
          right={
            <select
              className="bg-white/10 border border-white/10 rounded px-2 py-1 text-xs"
              value={font}
              onChange={(e) => updateAppearance({ font_size: e.target.value })}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          }
        />

        <Row
          left={
            <>
              <div className="font-mondwest mb-1">Window Background</div>
              <div className="text-xs opacity-70">
                Set the app window's background color.
              </div>
            </>
          }
          right={
            <select
              className="bg-white/10 border border-white/10 rounded px-2 py-1 text-xs"
              value={windowBg}
              onChange={(e) => updateAppearance({ window_bg: e.target.value })}
            >
              {palette.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          }
        />

        <Row
          left={
            <>
              <div className="font-mondwest mb-1">App Main View</div>
              <div className="text-xs opacity-70">
                Set the main content area's background color.
              </div>
            </>
          }
          right={
            <select
              className="bg-white/10 border border-white/10 rounded px-2 py-1 text-xs"
              value={appBg}
              onChange={(e) => updateAppearance({ app_bg: e.target.value })}
            >
              {[palette[0], palette[1]].map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          }
        />

        <Row
          left={
            <>
              <div className="font-mondwest mb-1">Primary</div>
              <div className="text-xs opacity-70">
                Set the primary color for UI components.
              </div>
            </>
          }
          right={
            <select
              className="bg-white/10 border border-white/10 rounded px-2 py-1 text-xs"
              value={primary}
              onChange={(e) =>
                updateAppearance({ primary_color: e.target.value })
              }
            >
              {palette.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          }
        />

        <Row
          left={
            <>
              <div className="font-mondwest mb-1">Accent</div>
              <div className="text-xs opacity-70">
                Set the accent color for UI highlights.
              </div>
            </>
          }
          right={
            <select
              className="bg-white/10 border border-white/10 rounded px-2 py-1 text-xs"
              value={accent}
              onChange={(e) =>
                updateAppearance({ accent_color: e.target.value })
              }
            >
              {palette.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          }
        />

        <Row
          left={
            <>
              <div className="font-mondwest mb-1">Destructive</div>
              <div className="text-xs opacity-70">
                Set the color for destructive actions.
              </div>
            </>
          }
          right={
            <select
              className="bg-white/10 border border-white/10 rounded px-2 py-1 text-xs"
              value={destructive}
              onChange={(e) =>
                updateAppearance({ destructive_color: e.target.value })
              }
            >
              {palette.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          }
        />

        <Row
          left={
            <>
              <div className="font-mondwest mb-1">Chat Width</div>
              <div className="text-xs opacity-70">
                Customize the width of the chat view.
              </div>
            </>
          }
          right={
            <select
              className="bg-white/10 border border-white/10 rounded px-2 py-1 text-xs"
              value={chat}
              onChange={(e) => updateAppearance({ chat_width: e.target.value })}
            >
              <option value="compact">Compact Width</option>
              <option value="full">Full Width</option>
            </select>
          }
        />

        <Row
          left={<div className="text-sm">Show Line Numbers</div>}
          right={
            <label className="inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showLines}
                onChange={(e) =>
                  updateAppearance({ code_show_line_numbers: e.target.checked })
                }
              />
              <div className="w-9 h-5 bg-white/10 peer-checked:bg-white/20 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white/80 after:rounded-full after:transition-all peer-checked:after:translate-x-4"></div>
            </label>
          }
        />

        <Row
          left={<div className="text-sm">Syntax Theme</div>}
          right={
            <Select
              value={codeTheme}
              onValueChange={(v) => updateAppearance({ code_theme: v })}
            >
              <SelectTrigger className="w-48 bg-white/10 border border-white/10">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="github-dark">GitHub Dark</SelectItem>
                <SelectItem value="github">GitHub Light</SelectItem>
                <SelectItem value="atom-one-dark">Atom One Dark</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <Row
          left={
            <>
              <div className="font-mondwest mb-1">Reset to Default</div>
              <div className="text-xs opacity-70">
                Reset all appearance settings to default.
              </div>
            </>
          }
          right={
            <button
              className="px-3 py-1 text-xs rounded-md bg-red-500/20 border border-red-500/30"
              onClick={reset}
            >
              Reset
            </button>
          }
        />
      </SettingsSection>
    </div>
  );
}
