use serde::Serialize;
use std::sync::Mutex;
use sysinfo::System;

#[derive(Default)]
pub struct AppSys(pub Mutex<System>);

#[derive(Debug, Clone, Serialize)]
pub struct CpuInfo {
    pub model: String,
    pub architecture: String,
    pub physical_cores: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MemoryInfo {
    pub total_gb: f64,
    pub available_gb: f64,
    pub used_percent: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct GpuInfo {
    pub name: String,
    pub vram_mb: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct HardwareInfo {
    pub os_name: String,
    pub os_version: Option<String>,
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub gpus: Vec<GpuInfo>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UsageSnapshot {
    pub cpu_percent: f64,
    pub mem_used_percent: f64,
    pub available_gb: f64,
    pub total_gb: f64,
}

#[tauri::command]
pub async fn get_hardware_info(state: tauri::State<'_, AppSys>) -> Result<HardwareInfo, String> {
    let mut sys = state.0.lock().map_err(|_| "lock poisoned")?;
    if sys.cpus().is_empty() {
        *sys = System::new_all();
    }
    sys.refresh_all();

    // OS
    let os_name = sysinfo::System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = sysinfo::System::long_os_version();

    // CPU
    let mut cpu_model = sys.global_cpu_info().brand().to_string();
    let arch = std::env::consts::ARCH.to_string();
    let physical_cores = sys.physical_core_count();
    #[cfg(windows)]
    {
        if cpu_model.trim().is_empty() || cpu_model == "Unknown" {
            use serde::Deserialize as De;
            use wmi::{COMLibrary, WMIConnection};
            #[derive(De)]
            #[allow(non_snake_case)]
            struct Win32Processor {
                Name: Option<String>,
            }
            if let Ok(com) = COMLibrary::new() {
                if let Ok(wmi_con) = WMIConnection::new(com) {
                    if let Ok(results) =
                        wmi_con.raw_query::<Win32Processor>("SELECT Name FROM Win32_Processor")
                    {
                        if let Some(first) = results.into_iter().next() {
                            cpu_model = first.Name.unwrap_or(cpu_model);
                        }
                    }
                }
            }
        }
    }
    let cpu = CpuInfo {
        model: cpu_model,
        architecture: arch,
        physical_cores,
    };

    // Memory
    let total_gb = (sys.total_memory() as f64) / (1024.0 * 1024.0 * 1024.0);
    let avail_gb = (sys.available_memory() as f64) / (1024.0 * 1024.0 * 1024.0);
    let used_percent = if total_gb > 0.0 {
        ((total_gb - avail_gb) / total_gb) * 100.0
    } else {
        0.0
    };
    let memory = MemoryInfo {
        total_gb: (total_gb * 100.0).round() / 100.0,
        available_gb: (avail_gb * 100.0).round() / 100.0,
        used_percent: (used_percent * 100.0).round() / 100.0,
    };

    // GPUs
    let mut gpus: Vec<GpuInfo> = Vec::new();
    #[cfg(windows)]
    {
        use serde::Deserialize as De;
        use wmi::{COMLibrary, WMIConnection};
        #[derive(De)]
        #[allow(non_snake_case)]
        struct Win32VideoController {
            Name: Option<String>,
            AdapterRAM: Option<i64>,
        }
        if let Ok(com) = COMLibrary::new() {
            if let Ok(wmi_con) = WMIConnection::new(com) {
                if let Ok(results) = wmi_con.raw_query::<Win32VideoController>(
                    "SELECT Name, AdapterRAM FROM Win32_VideoController",
                ) {
                    for r in results {
                        gpus.push(GpuInfo {
                            name: r.Name.unwrap_or_else(|| "GPU".into()),
                            vram_mb: r.AdapterRAM.map(|b| (b as u64) / (1024 * 1024)),
                        });
                    }
                }
            }
        }
    }
    #[cfg(not(windows))]
    {
        // Fallback: sysinfo does not provide GPUs; return empty and let UI handle it
    }

    Ok(HardwareInfo {
        os_name,
        os_version,
        cpu,
        memory,
        gpus,
    })
}

#[tauri::command]
pub async fn get_usage_snapshot(state: tauri::State<'_, AppSys>) -> Result<UsageSnapshot, String> {
    let mut sys = state.0.lock().map_err(|_| "lock poisoned")?;
    sys.refresh_cpu();
    sys.refresh_memory();
    let cpu = sys.global_cpu_info().cpu_usage() as f64;
    let total_gb = (sys.total_memory() as f64) / (1024.0 * 1024.0 * 1024.0);
    let avail_gb = (sys.available_memory() as f64) / (1024.0 * 1024.0 * 1024.0);
    let used_percent = if total_gb > 0.0 {
        ((total_gb - avail_gb) / total_gb) * 100.0
    } else {
        0.0
    };
    Ok(UsageSnapshot {
        cpu_percent: (cpu * 100.0).round() / 100.0,
        mem_used_percent: (used_percent * 100.0).round() / 100.0,
        available_gb: (avail_gb * 100.0).round() / 100.0,
        total_gb: (total_gb * 100.0).round() / 100.0,
    })
}

#[tauri::command]
pub async fn open_path_in_explorer(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn reveal_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        // Fallback: open the containing directory
        let p = std::path::Path::new(&path);
        let dir = p.parent().unwrap_or_else(|| std::path::Path::new("."));
        std::process::Command::new("xdg-open")
            .arg(dir)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_username() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::env;
        env::var("USERNAME")
            .or_else(|_| env::var("USER"))
            .map_err(|e| format!("Failed to get username: {}", e))
    }
    #[cfg(target_os = "macos")]
    {
        use std::env;
        env::var("USER").map_err(|e| format!("Failed to get username: {}", e))
    }
    #[cfg(target_os = "linux")]
    {
        use std::env;
        env::var("USER")
            .or_else(|_| env::var("LOGNAME"))
            .map_err(|e| format!("Failed to get username: {}", e))
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported platform".to_string())
    }
}
