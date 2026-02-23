"use client";

import { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { InSituCanvas, type WallColors, type FloorColors } from "./in-situ-canvas";
import type { DimensionsCm } from "@/lib/utils";

interface InSituModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensionsCm?: DimensionsCm | null;
  artworkImageUrl?: string | null;
  wallColors?: WallColors | null;
  floorColors?: FloorColors | null;
  showChair?: boolean;
  chairImageSrc?: string | null;
  artworkTitle?: string;
}

export function InSituModal({
  open,
  onOpenChange,
  dimensionsCm = null,
  artworkImageUrl = null,
  wallColors = null,
  floorColors = null,
  showChair = true,
  chairImageSrc = null,
  artworkTitle,
}: InSituModalProps) {
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content
          className="fixed inset-0 z-50 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {artworkTitle ? `${artworkTitle} — in situ preview` : "In situ art preview"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Full-screen preview of the artwork displayed in a room setting with
            wall, floor, and furniture.
          </DialogPrimitive.Description>

          <DialogPrimitive.Close
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Close in situ preview"
          >
            <XIcon className="h-5 w-5" />
          </DialogPrimitive.Close>

          <div className="h-full w-full">
            <InSituCanvas
              showDebug={showDebug}
              dimensionsCm={dimensionsCm}
              artworkImageSrc={artworkImageUrl ?? undefined}
              wallColors={wallColors}
              floorColors={floorColors}
              showChair={showChair}
              chairImageSrc={chairImageSrc ?? undefined}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
