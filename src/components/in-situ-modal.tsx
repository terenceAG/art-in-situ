"use client";

import { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { InSituCanvas } from "./in-situ-canvas";

interface InSituModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InSituModal({ open, onOpenChange }: InSituModalProps) {
  // Track if the debug overlay should be shown (toggle with "D" key)
  const [showDebug, setShowDebug] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "d" || e.key === "D") {
      setShowDebug((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay — fully opaque black so we get a clean canvas background */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content — full screen, no border/padding/rounding */}
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Accessibility: visually hidden title */}
          <DialogPrimitive.Title className="sr-only">
            In situ art preview
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Full-screen preview of the artwork displayed in a room setting with
            wall, floor, and furniture.
          </DialogPrimitive.Description>

          {/* Close button */}
          <DialogPrimitive.Close
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Close in situ preview"
          >
            <XIcon className="h-5 w-5" />
          </DialogPrimitive.Close>

          {/* Debug toggle hint 
          <div className="absolute bottom-4 left-4 z-10 text-xs text-white/40 select-none pointer-events-none">
            Press &ldquo;D&rdquo; for debug overlay
          </div>*/}

          {/* Full-screen canvas */}
          <div className="h-full w-full">
            <InSituCanvas showDebug={showDebug} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
