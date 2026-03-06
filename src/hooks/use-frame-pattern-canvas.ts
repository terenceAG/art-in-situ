"use client";

import { useMemo } from "react";
import {
  makeGoldClassicFramePattern,
  makeBlackModernFramePattern,
  makeWhiteFramePattern,
  makeLightOakFramePattern,
} from "@/lib/in-situ-patterns";
import type { FrameStyleId } from "@/lib/in-situ-constants";

export function useFramePatternCanvas(
  frameStyle: FrameStyleId,
): HTMLCanvasElement | null {
  return useMemo(() => {
    if (typeof document === "undefined" || frameStyle === "none") return null;
    if (frameStyle === "gold-classic") return makeGoldClassicFramePattern(128, 2026);
    if (frameStyle === "white") return makeWhiteFramePattern(320, 4042);
    if (frameStyle === "light-oak") return makeLightOakFramePattern(320, 5053);
    return makeBlackModernFramePattern(320, 3031);
  }, [frameStyle]);
}
