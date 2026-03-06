"use client";

import { useRef } from "react";
import {
  FLOOR_COLORS,
  FRAME_WIDTH_DEFAULT_CM,
  DEFAULT_ARTWORK_SRC,
  DEFAULT_CHAIR_SRC,
  type WallColors,
  type FloorColors,
  type FloorTextureId,
  type FrameStyleId,
  type ArtworkAnchors,
  type ChairAnchors,
} from "@/lib/in-situ-constants";
import type { DimensionsCm } from "@/lib/utils";
import { makeFramePreviewLShape } from "@/lib/in-situ-patterns";
import {
  useFloorPatternCanvas,
  useFramePatternCanvas,
  useArtworkImage,
  useChairImage,
  useInSituRender,
  useResizeRender,
} from "@/hooks";

export type { WallColors, FloorColors };
export type { FloorTextureId, FrameStyleId };
export { makeFramePreviewLShape };

export interface InSituCanvasProps {
  showDebug?: boolean;
  artworkImageSrc?: string;
  showChair?: boolean;
  chairImageSrc?: string;
  dimensionsCm?: DimensionsCm | null;
  wallColors?: WallColors | null;
  floorColors?: FloorColors | null;
  floorTexture?: FloorTextureId;
  frameStyle?: FrameStyleId;
  frameWidthCm?: number;
  artworkAnchors?: Partial<ArtworkAnchors>;
  chairAnchors?: Partial<ChairAnchors>;
}

export function InSituCanvas({
  showDebug = false,
  artworkImageSrc = DEFAULT_ARTWORK_SRC,
  showChair = true,
  chairImageSrc = DEFAULT_CHAIR_SRC,
  dimensionsCm = null,
  wallColors = null,
  floorColors = null,
  floorTexture = "none",
  frameStyle = "none",
  frameWidthCm = FRAME_WIDTH_DEFAULT_CM,
  artworkAnchors,
  chairAnchors,
}: InSituCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const noiseRef = useRef<HTMLCanvasElement | null>(null);
  const artImageRef = useRef<HTMLImageElement | null>(null);
  const chairImageRef = useRef<HTMLImageElement | null>(null);

  const floorForWood = floorColors ?? FLOOR_COLORS;
  const floorPatternCanvas = useFloorPatternCanvas(
    floorTexture,
    floorForWood.top,
    floorForWood.bottom,
  );
  const framePatternCanvas = useFramePatternCanvas(frameStyle);

  const render = useInSituRender({
    canvasRef,
    noiseRef,
    artImageRef,
    chairImageRef,
    floorPatternCanvas,
    framePatternCanvas,
    showDebug,
    showChair,
    dimensionsCm,
    wallColors,
    floorColors,
    floorTexture,
    frameStyle,
    frameWidthCm,
    artworkAnchors,
    chairAnchors,
  });

  useArtworkImage(artworkImageSrc, artImageRef, render);
  useChairImage(showChair, chairImageSrc, chairImageRef, render);
  useResizeRender(render);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
