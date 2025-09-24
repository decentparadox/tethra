import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { invoke } from "@tauri-apps/api/core";

const TetherFormSchema = z.object({
	apiKey: z.string().min(2, {
		message: "API Key must be at least 2 characters.",
	}),
});

const SelfHostFormSchema = z.object({
	apiKey: z.string().min(2, {
		message: "API Key must be at least 2 characters.",
	}),
	apiUrl: z.string().min(2, {
		message: "API URL must be at least 2 characters.",
	}),
});

export default function authKeyTab() {
	const tetherform = useForm<z.infer<typeof TetherFormSchema>>({
		resolver: zodResolver(TetherFormSchema as any),
		defaultValues: {
			apiKey: "",
		},
	});
	const selfhostform = useForm<z.infer<typeof SelfHostFormSchema>>({
		resolver: zodResolver(SelfHostFormSchema as any),
		defaultValues: {
			apiKey: "",
			apiUrl: "",
		},
	});
	async function onSelfhostSubmit(data: z.infer<typeof SelfHostFormSchema>) {
		try {
			await invoke("save_settings", {
				apiKey: data.apiKey,
				apiUrl: data.apiUrl,
			});
			window.location.href = "/dashboard";
		} catch (err) {
			toast("Failed to save settings", { description: String(err) });
		}
	}
	async function onTetherSubmit(data: z.infer<typeof TetherFormSchema>) {
		try {
			await invoke("save_settings", { apiKey: data.apiKey, apiUrl: null });
			window.location.href = "/dashboard";
		} catch (err) {
			toast("Failed to save settings", { description: String(err) });
		}
	}
	return (
		<div className="flex w-[300px] sm:w-[400px] max-w-sm flex-col gap-6">
			<Tabs defaultValue="tethra">
				<TabsList>
					<TabsTrigger value="tethra">Use Tethra</TabsTrigger>
					<TabsTrigger value="selfhost">Self Host</TabsTrigger>
				</TabsList>
				<TabsContent value="tethra" className="w-full">
					<Card>
						<CardHeader>
							<CardTitle>Instant access. No setup.</CardTitle>
							<CardDescription>
								Use Tethra directly from your browser — fast, seamless, and
								ready anywhere. All chats are synced online so you can share,
								publish, and access them from any device.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-6">
							<Form {...tetherform}>
								<form
									onSubmit={tetherform.handleSubmit(onTetherSubmit)}
									className="w-full space-y-6"
								>
									<FormField
										control={tetherform.control}
										name="apiKey"
										render={({ field }) => (
											<FormItem>
												<FormLabel>API Key</FormLabel>
												<FormControl>
													<Input placeholder="sk-xxxx" {...field} />
												</FormControl>
												<FormDescription>
													This is your Tethra API key. get it from{" "}
													<a
														href="https://tethra.decentparadox.me/dashboard"
														target="_blank"
														className="text-blue-700"
														rel="noreferrer"
													>
														here
													</a>
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button type="submit" className="w-full">
										Submit
									</Button>
								</form>
							</Form>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="selfhost" className="w-full">
					<Card>
						<CardHeader>
							<CardTitle>Full control. Your data, your rules.</CardTitle>
							<CardDescription>
								Run Tethra locally on your own machine or server. Keep all
								conversations private, with the option to share only what you
								choose. Perfect for privacy-focused and power users.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-6">
							<Form {...selfhostform}>
								<form
									onSubmit={selfhostform.handleSubmit(onSelfhostSubmit)}
									className="w-full space-y-6"
								>
									<FormField
										control={selfhostform.control}
										name="apiKey"
										render={({ field }) => (
											<FormItem>
												<FormLabel>API Key</FormLabel>
												<FormControl>
													<Input placeholder="sk-xxxx" {...field} />
												</FormControl>
												<FormDescription>
													This is your Tethra API key. get it from{" "}
													<a
														href="https://tethra.decentparadox.me/dashboard"
														target="_blank"
														className="text-blue-700"
														rel="noreferrer"
													>
														here
													</a>
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={selfhostform.control}
										name="apiUrl"
										render={({ field }) => (
											<FormItem>
												<FormLabel>API URL</FormLabel>
												<FormControl>
													<Input
														placeholder="https://api.tethra.com"
														{...field}
													/>
												</FormControl>
												<FormDescription>
													This is the URL of your Tethra API.
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button type="submit" className="w-full">
										Submit
									</Button>
								</form>
							</Form>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
