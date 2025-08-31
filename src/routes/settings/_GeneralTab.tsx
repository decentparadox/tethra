import { useEffect, useState } from "react"
//@ts-ignore
const invoke = window.__TAURI__.core.invoke;

import { SettingsSection, Row } from "./_SettingsSection"

type GeneralInfo = { app_version: string; app_data_dir: string; logs_dir: string }

type AppSettings = { spell_check?: boolean | null; experimental?: boolean | null; huggingface_token?: string | null }

export default function GeneralTab(){
  const [info, setInfo] = useState<GeneralInfo | null>(null)
  const [settings, setSettings] = useState<AppSettings>({})
  useEffect(()=>{ (async()=>{ try{ const d = await invoke<GeneralInfo>("get_general_info"); setInfo(d); const s = await invoke<any>("get_settings"); setSettings(s) }catch{}})() }, [])

  const openLogs = async () => { try { if(info) await invoke("open_path_in_explorer", { path: info.logs_dir }) } catch {} }
  const showDataDir = async () => { try { if(info) await invoke("reveal_path", { path: info.app_data_dir }) } catch {} }

  const update = async (patch: Partial<AppSettings>) => {
    try { const saved = await invoke<any>("update_settings", { update: patch }); setSettings(saved) } catch {}
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection title="App Version">
        <Row left={<>
          <div className="text-xs opacity-70">Version</div>
          <div>{info?.app_version ?? '-'}</div>
        </>} right={null} />
      </SettingsSection>

      <SettingsSection title="Data Folder">
        <Row left={<>
          <div className="text-xs opacity-70">Default location for messages and other user data.</div>
        </>} right={null} />
        <Row left={<>
          <input className="w-full bg-white/5 rounded px-2 py-1 text-xs border border-white/10" readOnly value={info?.app_data_dir ?? ''} />
        </>} right={<button className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10" onClick={showDataDir}>Show in File Explorer</button>} />
        <Row left={<>
          <div className="flex gap-2">
            <button className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10" onClick={openLogs}>Open Logs</button>
          </div>
        </>} right={null} />
      </SettingsSection>

      <SettingsSection title="Advanced">
        <Row left={<>
          <div className="text-sm">Experimental Features</div>
          <div className="text-xs opacity-70">Enable experimental features. They may be unstable or change at any time.</div>
        </>} right={<label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={!!settings.experimental} onChange={(e)=>update({ experimental: e.target.checked })} />
          <div className="w-9 h-5 bg-white/10 peer-checked:bg-white/20 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white/80 after:rounded-full after:transition-all peer-checked:after:translate-x-4"></div>
        </label>} />
      </SettingsSection>

      <SettingsSection title="Other">
        <Row left={<div className="text-sm">Spell Check</div>} right={<label className="inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={!!settings.spell_check} onChange={(e)=>update({ spell_check: e.target.checked })} />
          <div className="w-9 h-5 bg-white/10 peer-checked:bg-white/20 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white/80 after:rounded-full after:transition-all peer-checked:after:translate-x-4"></div>
        </label>} />
        <Row left={<>
          <div className="text-sm mb-1">HuggingFace Token</div>
          <div className="text-xs opacity-70 mb-2">Your HuggingFace API token for accessing models.</div>
          <input className="w-full bg-white/5 rounded px-2 py-1 text-xs border border-white/10" placeholder="hf_xxx" value={settings.huggingface_token ?? ''} onChange={(e)=>update({ huggingface_token: e.target.value })} />
        </>} right={null} />
      </SettingsSection>
    </div>
  )
}
