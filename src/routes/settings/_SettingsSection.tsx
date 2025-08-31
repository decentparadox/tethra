import type { ReactNode } from "react"

export function ProgressBar({ percent }: { percent: number }){
  const clamped = Math.min(Math.max(percent || 0, 0), 100)
  return (
    <div className="w-full h-2 bg-white/10 rounded">
      <div className="h-2 rounded bg-blue-500" style={{ width: `${clamped}%`}} />
    </div>
  )
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }){
  return (
    <div className="rounded-lg border border-white/10 bg-white/5">
      <div className="p-2 px-4">
        <h2 className="text-lg font-mondwest">{title}</h2>
      </div>
      <div className="divide-y divide-white/10">
        {children}
      </div>
    </div>
  )
}

export function Row({ left, right, children }: { left?: ReactNode; right?: ReactNode; children?: ReactNode }){
  return (
    <div className="flex items-start justify-between p-4 gap-4">
      <div className="text-sm">
        {left}
      </div>
      <div className="shrink-0">
        {right}
      </div>
      {children}
    </div>
  )
}
