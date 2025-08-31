import { Loader2 } from "lucide-react";

export function MessageSkeleton() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-white/60" />
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-4 w-4 animate-spin text-white/60" />
    </div>
  );
}
