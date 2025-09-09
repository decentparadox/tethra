"use client";

import { useEffect } from "react";

export default function GlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;
      // Still allow shortcuts while typing; uncomment next lines to disable while typing
      // const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      // const isTyping = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable;
      // if (isTyping) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        window.location.href = '/dashboard';
      } else if (e.key === ',') {
        e.preventDefault();
        window.location.href = '/settings';
      }
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, false);
  }, []);
  return null;
}


