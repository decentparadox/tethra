import { type FC } from "react";

export const ChatHeader: FC = () => {
  return (
    <div className="mb-3 flex items-center gap-2 text-white">
      <img src="/logo.svg" alt="Lumen" width={24} height={24} />
      <span className="text-2xl font-mondwest">Tethra</span>
    </div>
  );
};
