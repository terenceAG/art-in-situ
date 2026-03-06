"use client";

import { useMemo } from "react";
import { hexToHsl } from "@/lib/utils";
import { averageHueDegrees } from "@/lib/in-situ-math";
import { makeRealWoodPlankPattern, makePolishedConcretePattern } from "@/lib/in-situ-patterns";
import type { FloorTextureId } from "@/lib/in-situ-constants";

export function useFloorPatternCanvas(
  floorTexture: FloorTextureId,
  floorTopHex: string,
  floorBottomHex: string,
): HTMLCanvasElement | null {
  return useMemo(() => {
    if (floorTexture === "none") return null;
    const hslTop = hexToHsl(floorTopHex);
    const hslBottom = hexToHsl(floorBottomHex);
    const baseHue = averageHueDegrees(hslTop.h, hslBottom.h);
    const sat = Math.min(100, Math.max(0, (hslTop.s + hslBottom.s) / 2));
    const lightMin = Math.min(hslTop.l, hslBottom.l);
    const lightMax = Math.max(hslTop.l, hslBottom.l);
    const lightRange = Math.max(8, lightMax - lightMin);
    const midLight = (lightMin + lightMax) / 2;
    if (floorTexture === "wood-planks") {
      const boostedMid = Math.min(85, midLight + 14);
      return makeRealWoodPlankPattern({
        plankH: 34,
        minLen: 1200,
        maxLen: 2300,
        plankW: 96,
        seed: 123,
        baseHue,
        sat: Math.round(sat),
        lightMin: Math.max(55, boostedMid - lightRange / 2),
        lightMax: Math.min(100, boostedMid + lightRange / 2),
      });
    }
    const concreteSat = Math.max(0, Math.min(100, sat));
    return makePolishedConcretePattern({
      tileSize: 1024,
      seed: 1234,
      baseHue,
      sat: Math.round(concreteSat),
      light: Math.max(0, Math.min(100, midLight + 12)),
      cloudAmount: 8.5 + lightRange * 0.2,
      grainAmount: 7.2 + lightRange * 0.16,
      speckDensity: 0.0012,
      sheen: 0.05,
    });
  }, [floorTexture, floorTopHex, floorBottomHex]);
}
