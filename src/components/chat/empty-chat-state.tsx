import { type FC, useEffect, useState } from "react";
import { EmptyChatIcon } from "@/components/ui/empty-chat-icon";

//@ts-ignore
const invoke = window.__TAURI__.core.invoke;

export const EmptyChatState: FC = () => {
  const [username, setUsername] = useState<string>("User");

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const username = await invoke<string>("get_username");
        setUsername(username);
      } catch (error) {
        console.error("Failed to fetch username:", error);
        setUsername("User");
      }
    };
    fetchUsername();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="flex flex-col items-center gap-4 max-w-md">
        <EmptyChatIcon className="animate-pulse" />
        <div className="space-y-1">
          <h1 className="font-mondwest text-2xl font-medium text-white/90">
            Hello {username}
          </h1>
          <p className="text-white/70 text-xl">
              how can I help you today?
          </p>
        </div>
      </div>
    </div>
  );
};
