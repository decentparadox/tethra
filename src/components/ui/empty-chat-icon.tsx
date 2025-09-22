import { type FC } from "react";

export const EmptyChatIcon: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative ${className}`}>
      <svg
        width="48"
        height="48"
        viewBox="0 0 32 33"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white/60"
      >
        <path d="M19.2002 3.7002L22.4004 6.90039H25.5996V10.0996L28.7998 13.2998H32V19.7002H28.7998L25.5996 22.9004V26.0996H22.4004L19.2002 29.2998V32.5H12.7998V29.2998L9.59961 26.0996H6.40039V22.709L3.3916 19.7002H0V13.2998H3.2002L6.40039 10.0996V6.90039H9.59961L12.7998 3.7002V0.5H19.2002V3.7002Z" fill="currentColor"/>
      </svg>
    </div>
  );
};
