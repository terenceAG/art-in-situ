import type { DimensionsCm } from "@/lib/utils";
import {
  SEAM_Y,
  REF_ART_WORLD,
  REF_ART_CM,
  REF_LONG_EDGE_CM,
  ART_ZOOM_FACTOR_MIN,
  ART_ZOOM_FACTOR_MAX,
  W_DESKTOP,
  BOTTOM_GAP_REF,
  BOTTOM_GAP_MIN,
  BOTTOM_GAP_SMALL_ART,
  BOTTOM_GAP_HEIGHT_FACTOR,
} from "./in-situ-constants";

export function getBottomGapForArtHeight(
  artWorldH: number,
  dimensionsCm: DimensionsCm | null,
  viewW: number,
): number {
  if (viewW >= W_DESKTOP && dimensionsCm && dimensionsCm.widthCm < 100 && dimensionsCm.heightCm < 100) {
    return BOTTOM_GAP_SMALL_ART;
  }
  const reduction = (artWorldH - REF_ART_WORLD.h) * BOTTOM_GAP_HEIGHT_FACTOR;
  return Math.max(BOTTOM_GAP_MIN, BOTTOM_GAP_REF - reduction);
}

export function getSeamYForDimensions(dimensionsCm: DimensionsCm | null): number {
  if (!dimensionsCm) return SEAM_Y;
  const w = dimensionsCm.widthCm;
  const h = dimensionsCm.heightCm;
  if (w >= 300 || h >= 300) return SEAM_Y;
  if (w >= 200 || h >= 200) return 800;
  return SEAM_Y;
}

export function dimensionsCmToWorldSize(d: DimensionsCm): { w: number; h: number } {
  return {
    w: (d.widthCm / REF_ART_CM.w) * REF_ART_WORLD.w,
    h: (d.heightCm / REF_ART_CM.h) * REF_ART_WORLD.h,
  };
}

export function getArtZoomFactor(dimensionsCm: DimensionsCm | null): number {
  if (!dimensionsCm) return 1;
  const w = dimensionsCm.widthCm;
  const h = dimensionsCm.heightCm;
  const longEdgeCm = Math.max(w, h);
  let factor = REF_LONG_EDGE_CM / longEdgeCm;
  let maxFactor = ART_ZOOM_FACTOR_MAX;
  if (w >= 200 || h >= 200) {
    const wideBoost = w >= 300 || h >= 300 ? 1.1 : 1.3;
    factor *= wideBoost;
    maxFactor = 1.4;
  }
  return Math.max(ART_ZOOM_FACTOR_MIN, Math.min(maxFactor, factor));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

export function rand(seed: number): number {
  seed ^= seed << 13;
  seed ^= seed >> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}

export function tiledNoise(x: number, y: number, periodX: number, periodY: number, seed: number): number {
  const xx = ((x % periodX) + periodX) % periodX;
  const yy = ((y % periodY) + periodY) % periodY;
  let n = (xx * 374761393 + yy * 668265263 + seed * 69069) | 0;
  n = (n ^ (n >> 13)) | 0;
  n = (n * 1274126177) | 0;
  n ^= n >> 16;
  return (n >>> 0) / 4294967296 - 0.5;
}

export function averageHueDegrees(a: number, b: number): number {
  const aRad = (a * Math.PI) / 180;
  const bRad = (b * Math.PI) / 180;
  const x = Math.cos(aRad) + Math.cos(bRad);
  const y = Math.sin(aRad) + Math.sin(bRad);
  if (x === 0 && y === 0) return a;
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}
