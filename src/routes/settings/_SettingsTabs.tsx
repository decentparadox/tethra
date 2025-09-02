import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import HardwareTab from "./_HardwareTab";
import ProvidersTab from "./_ProvidersTab";
import GeneralTab from "./_GeneralTab";
import AppearanceTab from "./_AppearanceTab";

type HardwareInfo = {
  os_name: string;
  os_version?: string | null;
  cpu: { model: string; architecture: string; physical_cores?: number | null };
  memory: { total_gb: number; available_gb: number; used_percent: number };
  gpus: Array<{ name: string; vram_mb?: number | null }>;
}

type UsageSnapshot = { cpu_percent: number; mem_used_percent: number; available_gb: number; total_gb: number }

export default function SettingsTabs() {
  const [hw, setHw] = useState<HardwareInfo | null>(null)
  const [usage, setUsage] = useState<UsageSnapshot | null>(null)
  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore invoke exists in tauri runtime
        const data = await invoke<HardwareInfo>("get_hardware_info")
        setHw(data)
      } catch {}
    })()
  }, [])
  useEffect(()=>{
    let id: any
    const tick = async () => {
      try {
        const snap = await invoke<UsageSnapshot>("get_usage_snapshot")
        setUsage(snap)
      } catch {}
      id = setTimeout(tick, 1000)
    }
    tick()
    return () => { if (id) clearTimeout(id) }
  }, [])
  return (
    <div className="flex w-full h-full text-white border-t border-border/70 no-scrollbar">
      
      <Tabs defaultValue="general" className="flex w-full flex-row items-start justify-start gap-0">
      <div className="border-r border-border/70 h-full">
        <TabsList className="w-56 shrink-0 p-4 space-y-2 h-full flex flex-col bg-transparent">
          <TabsTrigger value="general" className="justify-start w-full">General</TabsTrigger>
          <TabsTrigger value="appearance" className="justify-start w-full">Appearance</TabsTrigger>
          <TabsTrigger value="privacy" className="justify-start w-full">Privacy</TabsTrigger>
          <TabsTrigger value="providers" className="justify-start w-full">Model Providers</TabsTrigger>
          <TabsTrigger value="shortcuts" className="justify-start w-full">Shortcuts</TabsTrigger>
          <TabsTrigger value="hardware" className="justify-start w-full">Hardware</TabsTrigger>
          
        </TabsList>
        </div>
        

        <div className="flex-1 min-h-screen min-w-0 w-full p-6 space-y-6">
          <TabsContent value="general" className="m-0 flex flex-col gap-2">
            <h1 className="text-2xl font-mondwest mb-4">General</h1>
            <GeneralTab />
          </TabsContent>

          <TabsContent value="appearance" className="m-0 flex flex-col gap-4">
            <h1 className="text-2xl font-mondwest mb-2">Appearance</h1>
            <AppearanceTab />
          </TabsContent>

          <TabsContent value="privacy" className="m-0 flex flex-col gap-2">
            <h1 className="text-2xl font-mondwest mb-4">Privacy</h1>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3 relative">
              <div className="absolute top-4 right-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-white/10 peer-checked:bg-white/20 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white/80 after:rounded-full after:transition-all peer-checked:after:translate-x-4"></div>
                </label>
              </div>
              <h2 className="text-lg font-mondwest">Analytics</h2>
              <div className="space-y-2 text-sm opacity-90">
                <div className="font-medium">Help us improve</div>
                <p>To help us improve Jan, you can share anonymous data like feature usage and user counts. We never collect your chats or personal information.</p>
              </div>
              <div className="my-2 border-t border-white/10" />
              <div className="space-y-2 text-sm opacity-90">
                <p>You have full control over your data. Learn more in our Privacy Policy.</p>
                <p>To improve Jan, we need to understand how it's used—but only with your help. You can change this setting anytime.</p>
                <p>Your choice here won't change our core privacy promises:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><span className="font-medium">Your conversations stay private and on your device</span></li>
                  <li>We never collect your personal information or chat content</li>
                  <li>All data sharing is anonymous and aggregated</li>
                  <li>You can opt out anytime without losing functionality</li>
                  <li>We're transparent about what we collect and why</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          

          <TabsContent value="shortcuts" className="m-0 flex flex-col gap-4">
            <h1 className="text-2xl font-mondwest mb-2">Shortcuts</h1>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-mondwest mb-3">Application</h2>
              {[{
                title:'New Chat', desc:'Create a new chat.', keys:['Ctrl','N']
              },{
                title:'Toggle Sidebar', desc:'Show or hide the sidebar.', keys:['Ctrl','B']
              },{
                title:'Zoom In', desc:'Increase the zoom level.', keys:['Ctrl','+']
              },{
                title:'Zoom Out', desc:'Decrease the zoom level.', keys:['Ctrl','-']
              }].map((row, idx)=> (
                <div key={row.title}>
                  {idx>0 && <div className="my-2 border-t border-white/10" />}
                  <div className="flex items-start justify-between py-1">
                    <div>
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs opacity-70">{row.desc}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {row.keys.map((k,i)=> (
                        <span key={`${row.title}-${i}`} className="px-2 py-0.5 text-xs rounded-md bg-white/10 border border-white/10">{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-mondwest mb-3">Chat</h2>
              {[{
                title:'Send Message', desc:'Send the current message.', keys:['Enter']
              },{
                title:'New Line', desc:'Insert a new line.', keys:['Shift','+','Enter']
              }].map((row, idx)=> (
                <div key={row.title}>
                  {idx>0 && <div className="my-2 border-t border-white/10" />}
                  <div className="flex items-start justify-between py-1">
                    <div>
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs opacity-70">{row.desc}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {row.keys.map((k,i)=> (
                        <span key={`${row.title}-${i}`} className="px-2 py-0.5 text-xs rounded-md bg-white/10 border border-white/10">{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-mondwest mb-3">Navigation</h2>
              {[{
                title:'Go to Settings', desc:'Open settings.', keys:['Ctrl',',']
              }].map((row)=> (
                <div key={row.title}>
                  <div className="flex items-start justify-between py-1">
                    <div>
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs opacity-70">{row.desc}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {row.keys.map((k,i)=> (
                        <span key={`${row.title}-${i}`} className="px-2 py-0.5 text-xs rounded-md bg-white/10 border border-white/10">{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hardware" className="m-0 flex flex-col gap-4">
            <h1 className="text-2xl font-mondwest mb-2">Hardware</h1>
            <HardwareTab />
          </TabsContent>

          <TabsContent value="providers" className="m-0 flex flex-col gap-4">
            <h1 className="text-2xl font-mondwest mb-2">Model Providers</h1>
            <ProvidersTab />
          </TabsContent>

          {/* Removed Local API Server */}
          {/* <TabsContent value="local-api" className="m-0 flex flex-col gap-4">
            <h1 className="text-2xl font-mondwest mb-2">Local API Server</h1>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mondwest mb-1">Local API Server</div>
                  <div className="text-xs opacity-70">Run an OpenAI-compatible server locally.</div>
                </div>
                <button className="px-3 py-1 text-xs rounded-md bg-red-500/20 border border-red-500/30">Start Server</button>
              </div>
              <div className="my-3 border-t border-white/10" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mondwest mb-1">Server Logs</div>
                  <div className="text-xs opacity-70">View detailed logs of the local API server.</div>
                </div>
                <button className="px-3 py-1 text-xs rounded-md bg-white/10 border border-white/10">Open Logs</button>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <h2 className="text-lg font-mondwest">Server Configuration</h2>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Server Host</div>
                  <div className="text-xs opacity-70">Network address for the server.</div>
                </div>
                <input className="w-28 text-sm bg-white/5 rounded px-2 py-1 border border-white/10" defaultValue="127.0.0.1" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Server Port</div>
                  <div className="text-xs opacity-70">Port number for the API server.</div>
                </div>
                <input className="w-24 text-sm bg-white/5 rounded px-2 py-1 border border-white/10" defaultValue="1337" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">API Prefix</div>
                  <div className="text-xs opacity-70">Path prefix for API endpoints.</div>
                </div>
                <input className="w-20 text-sm bg-white/5 rounded px-2 py-1 border border-white/10" defaultValue="/v1" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">API Key</div>
                  <div className="text-xs opacity-70">Authenticate requests with an API key.</div>
                </div>
                <div className="flex items-center gap-2">
                  <input className="w-44 text-sm bg-white/5 rounded px-2 py-1 border border-white/10" placeholder="Enter API Key" type="password" />
                  <button className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10">Show</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Trusted Hosts</div>
                  <div className="text-xs opacity-70">Hosts allowed to access the server, separated by commas.</div>
                </div>
                <input className="w-64 text-sm bg-white/5 rounded px-2 py-1 border border-white/10" placeholder="Enter trusted hosts" />
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <h2 className="text-lg font-mondwest">Advanced Settings</h2>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Cross-Origin Resource Sharing (CORS)</div>
                  <div className="text-xs opacity-70">Allow cross-origin requests to the API server.</div>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-9 h-5 bg-white/10 peer-checked:bg-white/20 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white/80 after:rounded-full after:transition-all peer-checked:after:translate-x-4"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm">Verbose Server Logs</div>
                  <div className="text-xs opacity-70">Enable detailed server logging.</div>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-9 h-5 bg-white/10 peer-checked:bg-white/20 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white/80 after:rounded-full after:transition-all peer-checked:after:translate-x-4"></div>
                </label>
              </div>
            </div>
          </TabsContent> */}

          {/* Removed HTTPS Proxy */}
          {/* <TabsContent value="https-proxy" className="m-0 flex flex-col gap-4">
            <h1 className="text-2xl font-mondwest mb-2">HTTPS Proxy</h1>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4 relative">
              <div className="absolute top-4 right-4">
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-9 h-5 bg-white/10 peer-checked:bg-white/20 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white/80 after:rounded-full after:transition-all peer-checked:after:translate-x-4"></div>
                </label>
              </div>

              <div>
                <div className="font-mondwest mb-1">Proxy URL</div>
                <div className="text-xs opacity-70">The URL and port of your proxy server.</div>
                <input className="mt-2 w-full bg-white/5 rounded px-3 py-2 text-sm border border-white/10" placeholder="http://proxy.example.com:8080" />
              </div>

              <div>
                <div className="font-mondwest mb-1">Authentication</div>
                <div className="text-xs opacity-70">Credentials for the proxy server, if required.</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input className="bg-white/5 rounded px-3 py-2 text-sm border border-white/10" placeholder="Username" />
                  <div className="flex items-center gap-2">
                    <input className="flex-1 bg-white/5 rounded px-3 py-2 text-sm border border-white/10" placeholder="Password" type="password" />
                    <button className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10">Show</button>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-mondwest mb-1">No Proxy</div>
                <div className="text-xs opacity-70">A comma-separated list of hosts to bypass the proxy.</div>
                <input className="mt-2 w-full bg-white/5 rounded px-3 py-2 text-sm border border-white/10" defaultValue="localhost,127.0.0.1,.local" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mondwest mb-1">Ignore SSL Certificates</div>
                  <div className="text-xs opacity-70">Allow self-signed or unverified certificates. Enable only if you trust your proxy.</div>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-9 h-5 bg-white/10 peer-checked:bg-white/20 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white/80 after:rounded-full after:transition-all peer-checked:after:translate-x-4"></div>
                </label>
              </div>
            </div>
          </TabsContent> */}

          {/* Removed Extensions */}
          {/* <TabsContent value="extensions" className="m-0 flex flex-col gap-2">
            <h1 className="text-2xl font-mondwest mb-4">Extensions</h1>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">Coming soon…</div>
          </TabsContent> */}
        </div>
      </Tabs>
    </div>
  );
}
