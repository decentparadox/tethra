import { useEffect, useState } from "react";
//@ts-ignore
const invoke = window.__TAURI__.core.invoke;

import { SettingsSection, Row } from "./_SettingsSection";
import { toast } from "sonner";

type GeneralInfo = {
	app_version: string;
	app_data_dir: string;
	logs_dir: string;
};

type AppSettings = { experimental?: boolean | null };

export default function GeneralTab() {
	const [info, setInfo] = useState<GeneralInfo | null>(null);
	const [settings, setSettings] = useState<AppSettings>({});
	const [checking, setChecking] = useState(false);
	const [installing, setInstalling] = useState(false);
	const [updateAvailable, setUpdateAvailable] = useState<{
		version: string;
		date: string;
		body: string;
	} | null>(null);
	
	useEffect(() => {
		(async () => {
			try {
				const d = await invoke<GeneralInfo>("get_general_info");
				setInfo(d);
				const s = await invoke<any>("get_settings");
				setSettings(s);
			} catch {}
		})();
	}, []);

	const openLogs = async () => {
		try {
			if (info) await invoke("open_path_in_explorer", { path: info.logs_dir });
		} catch {}
	};
	const showDataDir = async () => {
		try {
			if (info) await invoke("reveal_path", { path: info.app_data_dir });
		} catch {}
	};

	const update = async (patch: Partial<AppSettings>) => {
		try {
			const saved = await invoke<any>("update_settings", { update: patch });
			setSettings(saved);
		} catch {}
	};

	const checkForUpdates = async () => {
		setChecking(true);
		setUpdateAvailable(null);
		try {
			//@ts-ignore
			const { check } = await import("@tauri-apps/plugin-updater");
			const update = await check();
			
			if (update) {
				setUpdateAvailable({
					version: update.version,
					date: update.date,
					body: update.body || "No release notes available.",
				});
				toast.success(`Update available: v${update.version}`, {
					description: "A new version is ready to install.",
				});
			} else {
				toast.info("You're up to date!", {
					description: `Current version: ${info?.app_version}`,
				});
			}
		} catch (error) {
			console.error("Update check failed:", error);
			toast.error("Failed to check for updates", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setChecking(false);
		}
	};

	const installUpdate = async () => {
		setInstalling(true);
		try {
			//@ts-ignore
			const { check } = await import("@tauri-apps/plugin-updater");
			//@ts-ignore
			const { relaunch } = await import("@tauri-apps/plugin-process");
			
			const update = await check();
			if (!update) {
				toast.error("No update available");
				return;
			}

			let downloaded = 0;
			let contentLength = 0;

			toast.info("Downloading update...", {
				description: "Please wait while the update is downloaded.",
			});

			await update.downloadAndInstall((event: any) => {
				switch (event.event) {
					case "Started":
						contentLength = event.data.contentLength;
						console.log(`Started downloading ${event.data.contentLength} bytes`);
						break;
					case "Progress":
						downloaded += event.data.chunkLength;
						const progress = Math.round((downloaded / contentLength) * 100);
						console.log(`Downloaded ${downloaded} from ${contentLength} (${progress}%)`);
						break;
					case "Finished":
						console.log("Download finished");
						break;
				}
			});

			toast.success("Update installed successfully!", {
				description: "The application will restart now.",
			});

			// Wait a moment for the toast to be visible
			setTimeout(async () => {
				await relaunch();
			}, 1000);
		} catch (error) {
			console.error("Update installation failed:", error);
			toast.error("Failed to install update", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		} finally {
			setInstalling(false);
		}
	};

	return (
		<div className="flex flex-col gap-4">
			<SettingsSection title="App Version">
				<Row
					left={
						<>
							<div className="text-xs opacity-70">Version</div>
							<div>{info?.app_version ?? "-"}</div>
						</>
					}
					right={null}
				/>
			</SettingsSection>

			<SettingsSection title="Updates">
				<Row
					left={
						<>
							<div className="text-sm">Check for Updates</div>
							<div className="text-xs opacity-70">
								Manually check for available updates to Tethra.
							</div>
						</>
					}
					right={
						<button
							className="px-3 py-1.5 text-xs rounded-md bg-white/10 border border-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={checkForUpdates}
							disabled={checking}
						>
							{checking ? "Checking..." : "Check for Updates"}
						</button>
					}
				/>
				{updateAvailable && (
					<>
						<Row
							left={
								<>
									<div className="text-sm font-medium text-green-400">
										Update Available: v{updateAvailable.version}
									</div>
									<div className="text-xs opacity-70">
										Released: {new Date(updateAvailable.date).toLocaleDateString()}
									</div>
									{updateAvailable.body && (
										<div className="text-xs opacity-70 mt-2 p-2 bg-white/5 rounded border border-white/10 max-h-32 overflow-y-auto">
											{updateAvailable.body}
										</div>
									)}
								</>
							}
							right={
								<button
									className="px-3 py-1.5 text-xs rounded-md bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									onClick={installUpdate}
									disabled={installing}
								>
									{installing ? "Installing..." : "Install Update"}
								</button>
							}
						/>
					</>
				)}
			</SettingsSection>

			<SettingsSection title="Data Folder">
				<Row
					left={
						<>
							<div className="text-xs opacity-70">
								Default location for messages and other user data.
							</div>
						</>
					}
					right={null}
				/>
				<Row
					left={
						<>
							<input
								className="w-full bg-white/5 rounded px-2 py-1 text-xs border border-white/10"
								readOnly
								value={info?.app_data_dir ?? ""}
							/>
						</>
					}
					right={
						<button
							className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10"
							onClick={showDataDir}
						>
							Show in File Explorer
						</button>
					}
				/>
				<Row
					left={
						<>
							<div className="flex gap-2">
								<button
									className="px-2 py-1 text-xs rounded-md bg-white/10 border border-white/10"
									onClick={openLogs}
								>
									Open Logs
								</button>
							</div>
						</>
					}
					right={null}
				/>
			</SettingsSection>

			<SettingsSection title="Advanced">
				<Row
					left={
						<>
							<div className="text-sm">Experimental Features</div>
							<div className="text-xs opacity-70">
								Enable experimental features. They may be unstable or change at
								any time.
							</div>
						</>
					}
					right={
						<label className="inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								className="sr-only peer"
								checked={!!settings.experimental}
								onChange={(e) => update({ experimental: e.target.checked })}
							/>
							<div className="w-9 h-5 bg-white/10 peer-checked:bg-white/20 rounded-full relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white/80 after:rounded-full after:transition-all peer-checked:after:translate-x-4"></div>
						</label>
					}
				/>
			</SettingsSection>
		</div>
	);
}
