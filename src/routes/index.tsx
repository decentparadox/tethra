import { createFileRoute } from "@tanstack/react-router";
import AuthKeyTab from "../components/authKeyTab";
export const Route = createFileRoute("/")({
	component: App,
});

async function App() {
	try {
		//@ts-ignore
		const ok = (await window.__TAURI__?.core?.invoke)
			? window.__TAURI__.core.invoke("has_settings")
			: null;
		if (ok) {
			window.location.href = "/dashboard";
		}
	} catch (e) {
		// ignore
	}
	return (
		<main className="min-h-screen w-full bg-transparent text-white relative overflow-hidden dark">
			{/* radial glow */}
			<div className="pointer-events-none absolute inset-x-0 left-[-20%] h-[100%] w-[90%] rounded-full bg-gradient-to-r from-[#E6181B] via-[#F4292C]/70 to-transparent blur-3xl" />
			<div className="absolute sm:right-4 sm:translate-x-0 top-1/2 -translate-y-1/2 right-1/2 translate-x-1/2">
				<AuthKeyTab />
			</div>
			<div className="relative  flex h-screen max-w-md flex-col justify-end px-6 py-10">
				<div className="flex flex-col gap-2 items-center sm:items-start">
					<div className="flex items-center gap-2 pointer-events-none select-none">
						<img src="/longLogo.svg" alt="tethra" height={32} />
					</div>

					<p className="text-[12px] text-center sm:text-left leading-tight text-white/60 select-none">
						This app is still in beta.
						<br />
						Visit my website for more details.
						<br />
						tethra.decentparadox.me
					</p>
				</div>
			</div>
		</main>
	);
}
