"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      richColors
      position="top-right"
      toastOptions={{
        className:
          "!border-border !bg-card !text-card-foreground !shadow-2xl",
      }}
    />
  );
}
