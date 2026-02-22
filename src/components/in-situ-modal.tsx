"use client";

import { useCallback, useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { InSituCanvas } from "./in-situ-canvas";
import type { DimensionsCm } from "@/lib/utils";

interface InSituModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Product dimensions in cm; when not set, canvas uses default 96×80 */
  dimensionsCm?: DimensionsCm | null;
  /** Artwork image URL for the canvas */
  artworkImageUrl?: string | null;
  /** For accessibility (e.g. modal title / img alt) */
  artworkTitle?: string;
}

const TEST_SIZE_PRESETS: { label: string; dimensionsCm: DimensionsCm }[] = [
  { label: "48×40", dimensionsCm: { widthCm: 48, heightCm: 40 } },
  { label: "96×80", dimensionsCm: { widthCm: 96, heightCm: 80 } },
  { label: "100×80", dimensionsCm: { widthCm: 100, heightCm: 80 } },
  { label: "120×100", dimensionsCm: { widthCm: 120, heightCm: 100 } },
  { label: "150×120", dimensionsCm: { widthCm: 150, heightCm: 120 } },
  { label: "263×325", dimensionsCm: { widthCm: 263, heightCm: 325 } },
  { label: "300×400", dimensionsCm: { widthCm: 300, heightCm: 400 } },
  { label: "400×500", dimensionsCm: { widthCm: 400, heightCm: 500 } },
  { label: "500×400", dimensionsCm: { widthCm: 500, heightCm: 400 } },
  { label: "400×300", dimensionsCm: { widthCm: 400, heightCm: 300 } },
  { label: "300×200", dimensionsCm: { widthCm: 300, heightCm: 200 } },
];

export function InSituModal({
  open,
  onOpenChange,
  dimensionsCm: productDimensionsCm = null,
  artworkImageUrl: productArtworkImageUrl = null,
  artworkTitle,
}: InSituModalProps) {
  const [showDebug, setShowDebug] = useState(false);
  const [dimensionsOverride, setDimensionsOverride] = useState<DimensionsCm | null>(null);
  const [imageUrlOverride, setImageUrlOverride] = useState<string | null>(null);

  const resolvedDimensionsCm = dimensionsOverride ?? productDimensionsCm ?? null;
  const resolvedArtworkImageUrl =
    imageUrlOverride ?? productArtworkImageUrl ?? undefined;

  const useProductData = useCallback(() => {
    setDimensionsOverride(null);
    setImageUrlOverride(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setDimensionsOverride(null);
        setImageUrlOverride(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

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

  const isDev = process.env.NODE_ENV === "development";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
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

          {isDev && (
            <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-xs text-white/90 backdrop-blur-sm">
              <span className="mr-1 text-white/60">Artwork size:</span>
              {TEST_SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setDimensionsOverride(preset.dimensionsCm);
                  }}
                  className="rounded bg-white/20 px-2 py-1 hover:bg-white/30 focus:outline-none focus:ring-1 focus:ring-white/50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          <div className="h-full w-full">
            <InSituCanvas
              showDebug={showDebug}
              dimensionsCm={resolvedDimensionsCm}
              artworkImageSrc={resolvedArtworkImageUrl}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
