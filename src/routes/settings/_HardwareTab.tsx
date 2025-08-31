import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { ProgressBar, SettingsSection, Row } from "./_SettingsSection"

type HardwareInfo = {
  os_name: string;
  os_version?: string | null;
  cpu: { model: string; architecture: string; physical_cores?: number | null };
  memory: { total_gb: number; available_gb: number; used_percent: number };
  gpus: Array<{ name: string; vram_mb?: number | null }>;
}

type UsageSnapshot = { cpu_percent: number; mem_used_percent: number; available_gb: number; total_gb: number }

export default function HardwareTab(){
  const [hw, setHw] = useState<HardwareInfo | null>(null)
  const [usage, setUsage] = useState<UsageSnapshot | null>(null)
  useEffect(() => { (async () => { try { const data = await invoke<HardwareInfo>("get_hardware_info"); setHw(data) } catch {} })() }, [])
  useEffect(()=>{ let id:any; const tick=async()=>{ try{ const s=await invoke<UsageSnapshot>("get_usage_snapshot"); setUsage(s)}catch{} id=setTimeout(tick,1000)}; tick(); return ()=>id&&clearTimeout(id)}, [])

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection title="Operating System">
        <Row left={<>
          <div className="text-xs opacity-70">Name</div>
        </>} right={<>
          <div>{hw?.os_name ?? '-'}</div>
        </>} />
        <Row left={<>
          <div className="text-xs opacity-70">Version</div>
        </>} right={<>
          <div>{hw?.os_version ?? '-'}</div>
        </>} />
      </SettingsSection>

      <SettingsSection title="CPU">
        <Row left={<>
          <div className="text-xs opacity-70">Model</div>
        </>} right={<>
          <div>{hw?.cpu.model || 'Unknown'}</div>
        </>} />
        <Row left={<>
          <div className="text-xs opacity-70">Architecture</div>
        </>} right={<>
          <div>{hw?.cpu.architecture ?? '-'}</div>
        </>} />
        <Row left={<>
          <div className="text-xs opacity-70">Cores</div>
        </>} right={<>
          <div>{hw?.cpu.physical_cores ?? '-'}</div>
        </>} />
        <Row left={<>
          <div className="text-xs opacity-70">Usage</div>
        </>} right={<>
          <ProgressBar percent={usage?.cpu_percent ?? 0} />
          <div className="text-right text-xs opacity-70 mt-1">{usage ? `${usage.cpu_percent.toFixed(2)}%` : '-'}</div>
        </>} />
      </SettingsSection>

      <SettingsSection title="Memory">
        <Row left={<>
          <div className="text-xs opacity-70">Total RAM</div>
        </>} right={<>
          <div>{(usage?.total_gb ?? hw?.memory.total_gb ?? 0).toFixed(2)} GB</div>
        </>} />
        <Row left={<>
          <div className="text-xs opacity-70">Available RAM</div>
        </>} right={<>
          <div>{(usage?.available_gb ?? hw?.memory.available_gb ?? 0).toFixed(2)} GB</div>
        </>} />
        <Row left={<>
          <div className="text-xs opacity-70">Usage</div>
        </>} right={<>
          <ProgressBar percent={usage?.mem_used_percent ?? hw?.memory.used_percent ?? 0} />
          <div className="text-right text-xs opacity-70 mt-1">{(usage?.mem_used_percent ?? hw?.memory.used_percent ?? 0).toFixed(2)}%</div>
        </>} />
      </SettingsSection>

      <SettingsSection title="GPUs">
        {(hw?.gpus?.length ? hw.gpus : [{name:'Unknown GPU'}]).map((g, i)=> (
          <Row key={`${g.name}-${i}`} left={<>
            <div className="text-sm">{g.name}</div>
            {g.vram_mb ? <div className="text-xs opacity-70">VRAM <span className="opacity-90">{(g.vram_mb/1024).toFixed(2)} GB</span></div> : null}
          </>} right={null} />
        ))}
      </SettingsSection>
    </div>
  )
}
