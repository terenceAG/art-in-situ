"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import { hexToHsl } from "@/lib/utils";

// World / layout
const WORLD = { w: 1600, h: 900 } as const;
const SEAM_Y = 720; 

// Colors for the wall and floor
const WALL_COLORS = {
  top: "#f8f7f6",
  bottom: "#f2f0ed",
} as const;

const FLOOR_COLORS = {
  top: "#d2d0cc",
  bottom: "#bdbab6",
} as const;

// Default image paths for the artwork and chair
const DEFAULT_ARTWORK_SRC = "/assets/images/testArtwork.webp";
const DEFAULT_CHAIR_SRC = "/assets/images/chair2.png";

// Anchor points for the artwork and chair
interface ArtworkAnchors {
  cx: number;
  w: number;
  h: number;
  bottomGap: number;
}

interface ChairAnchors {
  cx: number;
  w: number;
  h: number;
  floorOffset: number;
}

const DEFAULT_ART: ArtworkAnchors = {
  cx: WORLD.w * 0.5,
  w: 414,
  h: 345,
  bottomGap: 280,
};

const DEFAULT_CHAIR: ChairAnchors = {
  cx: WORLD.w * 0.5 + 414 / 2 + 200,
  w: 460,
  h: 430,
  floorOffset: 100,
};

const REF_ART_CM = { w: 96, h: 80 } as const;
const REF_ART_WORLD = { w: 414, h: 345 } as const;
const REF_LONG_EDGE_CM = Math.max(REF_ART_CM.w, REF_ART_CM.h);
const CHAIR_GAP_RIGHT_OF_ART = 200;

const ART_ZOOM_FACTOR_MIN = 0.32;
const ART_ZOOM_FACTOR_MAX = 1.12;

const BOTTOM_GAP_REF = 280;
const BOTTOM_GAP_MIN = 100;
const BOTTOM_GAP_SMALL_ART = 190;
const BOTTOM_GAP_HEIGHT_FACTOR = 0.6;
const W_DESKTOP = 1400;
const MOBILE_ART_WIDTH_RATIO = 0.9;
const FRAME_WIDTH_DEFAULT_CM = 2;
const CM_TO_WORLD = REF_ART_WORLD.w / REF_ART_CM.w;

// Calculate the bottom gap for the artwork based on its height and the viewport width
function getBottomGapForArtHeight(
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

// Calculate the seam Y position based on the artwork dimensions
function getSeamYForDimensions(dimensionsCm: DimensionsCm | null): number {
  if (!dimensionsCm) return SEAM_Y;
  const w = dimensionsCm.widthCm;
  const h = dimensionsCm.heightCm;
  if (w >= 300 || h >= 300) return SEAM_Y;
  if (w >= 200 || h >= 200) return 800;
  return SEAM_Y;
}

// Dimensions in centimeters
interface DimensionsCm {
  widthCm: number;
  heightCm: number;
}

// Convert dimensions in centimeters to world size
function dimensionsCmToWorldSize(d: DimensionsCm): { w: number; h: number } {
  return {
    w: (d.widthCm / REF_ART_CM.w) * REF_ART_WORLD.w,
    h: (d.heightCm / REF_ART_CM.h) * REF_ART_WORLD.h,
  };
}

// Calculate the zoom factor for the artwork based on the artwork dimensions
function getArtZoomFactor(dimensionsCm: DimensionsCm | null): number {
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

// Linear interpolation
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Smoothstep function
function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

// Random number generator
function rand(seed: number): number {
  seed ^= seed << 13;
  seed ^= seed >> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}

function tiledNoise(x: number, y: number, periodX: number, periodY: number, seed: number): number {
  const xx = ((x % periodX) + periodX) % periodX;
  const yy = ((y % periodY) + periodY) % periodY;
  let n = (xx * 374761393 + yy * 668265263 + seed * 69069) | 0;
  n = (n ^ (n >> 13)) | 0;
  n = (n * 1274126177) | 0;
  n ^= n >> 16;
  return (n >>> 0) / 4294967296 - 0.5;
}

function averageHueDegrees(a: number, b: number): number {
  const aRad = (a * Math.PI) / 180;
  const bRad = (b * Math.PI) / 180;
  const x = Math.cos(aRad) + Math.cos(bRad);
  const y = Math.sin(aRad) + Math.sin(bRad);
  if (x === 0 && y === 0) return a;
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

// Options for the wood plank pattern
interface WoodPlankOptions {
  plankH?: number;
  minLen?: number;
  maxLen?: number;
  plankW?: number;
  seam?: number;
  tilesX?: number;
  tilesY?: number;
  baseHue?: number;
  sat?: number;
  lightMin?: number;
  lightMax?: number;
  seed?: number;
}

const WOOD_TILE_MIN = 1536; // Minimum size of the wood plank pattern tile

function makeRealWoodPlankPattern({
  plankH = 34,
  minLen = 140,
  maxLen = 360,
  plankW = 90,
  seam = 2,
  tilesX = 18,
  tilesY = 24,
  baseHue = 28,
  sat = 55,
  lightMin = 50,
  lightMax = 70,
  seed = 1337,
}: WoodPlankOptions = {}): HTMLCanvasElement {
  const baseSpan = Math.max(1, maxLen - minLen);
  const minLenJitter = baseSpan * 0.35;
  const maxLenJitter = baseSpan * 0.45;
  const tileMinLenRaw =
    minLen + (rand((seed * 92821) | 0) - 0.5) * 2 * minLenJitter;
  const tileMinLen = Math.max(48, Math.min(maxLen - 24, tileMinLenRaw));
  const tileMaxLenRaw =
    maxLen + (rand((seed * 68917) | 0) - 0.5) * 2 * maxLenJitter;
  const tileMaxLen = Math.max(tileMinLen + 24, tileMaxLenRaw);

  const p = document.createElement("canvas");
  const minTileWidth = 2 * tileMinLen + 2 * seam;
  p.width = Math.max(WOOD_TILE_MIN, plankW * tilesX, minTileWidth);
  p.height = Math.max(WOOD_TILE_MIN, plankH * tilesY);
  const g = p.getContext("2d")!;
  const tileW = p.width;
  const tileH = p.height;

  g.fillStyle = `hsl(${baseHue}, ${sat}%, ${(lightMin + lightMax) / 2}%)`;
  g.fillRect(0, 0, p.width, p.height);

  function forEachWrappedPlacement(
    x: number,
    y: number,
    w: number,
    h: number,
    draw: (dx: number, dy: number) => void,
  ) {
    const startX = ((x % tileW) + tileW) % tileW;
    const startY = ((y % tileH) + tileH) % tileH;
    const xs = [startX];
    const ys = [startY];
    if (startX + w > tileW) xs.push(startX - tileW);
    if (startY + h > tileH) ys.push(startY - tileH);
    for (const dx of xs) {
      for (const dy of ys) {
        draw(dx, dy);
      }
    }
  }

  function drawPlank(x: number, y: number, w: number, h: number, localSeed: number) {
    const r1 = rand((localSeed * 99991) | 0);
    const lightMid = (lightMin + lightMax) * 0.5;
    const lightSpread = (lightMax - lightMin) * 0.28;
    const l = lightMid + (r1 - 0.5) * 2 * lightSpread;
    const hue = baseHue + (r1 * 1.2 - 0.6);
    const topEdgeAlpha = 0.008 + rand((localSeed * 17011) | 0) * 0.02;
    const bottomEdgeAlpha = 0.04 + rand((localSeed * 19531) | 0) * 0.08;
    forEachWrappedPlacement(x, y, w, h, (dx, dy) => {
      g.fillStyle = `hsl(${hue}, ${sat}%, ${l}%)`;
      g.fillRect(dx, dy, w, h);

      g.save();
      g.beginPath();
      g.rect(dx, dy, w, h);
      g.clip();

      const bandCount = 1 + ((rand((localSeed * 31337) | 0) * 3) | 0);
      for (let i = 0; i < bandCount; i++) {
        const rr = rand(((localSeed + i) * 7777) | 0);
        const yy = dy + rr * h;
        const amp = 0.07 + rr * 0.15;
        const phase = rand(((localSeed + i) * 1597) | 0) * Math.PI * 2;
        const freq1 = 2.1 + rr * 1.2;
        const freq2 = 5.2 + rr * 2.0;
        const darkness = 0.01 + rr * 0.02;
        g.strokeStyle = `rgba(0,0,0,${darkness})`;
        g.lineWidth = 0.8 + rand(((localSeed + i) * 2309) | 0) * 0.8;
        g.beginPath();
        let px = dx - 10;
        let py = yy;
        g.moveTo(px, py);
        const steps = 14;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          px = dx + t * (w + 20);
          py =
            yy +
            Math.sin((t * freq1 + rr * 2) * Math.PI + phase) * amp +
            Math.sin((t * freq2 + rr) * Math.PI + phase * 0.5) * amp * 0.22;
          g.lineTo(px, py);
        }
        g.stroke();

        if (rr > 0.68) {
          g.strokeStyle = `rgba(255,255,255,${0.005 + rr * 0.01})`;
          g.lineWidth = 0.6;
          g.beginPath();
          g.moveTo(dx - 10, yy + amp * 0.35);
          for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const lx = dx + t * (w + 20);
            const ly =
              yy +
              amp * 0.35 +
              Math.sin((t * (freq1 + 0.8) + rr) * Math.PI + phase * 0.7) * amp * 0.45;
            g.lineTo(lx, ly);
          }
          g.stroke();
        }
      }
      g.restore();

      g.fillStyle = `rgba(255,255,255,${topEdgeAlpha})`;
      g.fillRect(dx, dy, w, 1);
      g.fillStyle = `rgba(0,0,0,${bottomEdgeAlpha})`;
      g.fillRect(dx, dy + h - 1, w, 1);
    });
  }

  const rows = Math.ceil(tileH / plankH);
  const maxRemainingForTwoPlanks = 2 * tileMaxLen + 2 * seam;
  const minRemainingToContinue = 3 * tileMinLen + 3 * seam;

  for (let r = 0; r < rows; r++) {
    const y = r * plankH;
    let localSeed = (seed + r * 999) | 0;
    let remaining = tileW;
    const rowPlanks: Array<{ len: number; h: number; plankSeed: number }> = [];

    while (remaining > maxRemainingForTwoPlanks && remaining >= minRemainingToContinue) {
      localSeed = (localSeed + 1013904223) | 0;
      const maxLenThisPlank = Math.min(
        tileMaxLen,
        remaining - 2 * tileMinLen - 3 * seam,
      );
      const rr = rand(localSeed);
      const len = tileMinLen + rr * (maxLenThisPlank - tileMinLen);
      const h = plankH + (rand((localSeed * 3) | 0) - 0.5) * 4;
      rowPlanks.push({ len, h, plankSeed: localSeed });
      remaining -= len + seam;
    }

    const sumTwo = remaining - 2 * seam;
    const l1Min = Math.max(tileMinLen, sumTwo - tileMaxLen);
    const l1Max = Math.min(tileMaxLen, sumTwo - tileMinLen);
    const l1Range = Math.max(0, l1Max - l1Min);
    const l1 = l1Min + rand((localSeed + 1013904223) | 0) * l1Range;
    const l2 = sumTwo - l1;
    const h1 = plankH + (rand((localSeed * 5) | 0) - 0.5) * 4;
    const h2 = plankH + (rand((localSeed * 7) | 0) - 0.5) * 4;
    rowPlanks.push({ len: l1, h: h1, plankSeed: (localSeed + 1) | 0 });
    rowPlanks.push({ len: l2, h: h2, plankSeed: (localSeed + 2) | 0 });

    const rowCount = rowPlanks.length;
    const plankStarts: number[] = [];
    let cursor = 0;
    for (let i = 0; i < rowCount; i++) {
      plankStarts.push(cursor);
      cursor += rowPlanks[i].len + seam;
    }

    const anchorIndex = rowCount > 0
      ? Math.floor(rand((seed ^ ((r + 1) * 1103515245)) | 0) * rowCount)
      : 0;
    const anchorPlank = rowPlanks[anchorIndex];
    const anchorMargin = Math.min(80, Math.max(12, anchorPlank.len * 0.12));
    const anchorUsable = Math.max(0, anchorPlank.len - anchorMargin * 2);
    const anchorOffsetInPlank =
      anchorMargin + rand((seed ^ ((r + 1) * 214013 + 2531011)) | 0) * anchorUsable;
    const rowStartOffset = plankStarts[anchorIndex] + anchorOffsetInPlank;

    for (let i = 0; i < rowCount; i++) {
      const plank = rowPlanks[i];
      const drawX = plankStarts[i] - rowStartOffset;
      drawPlank(drawX, y, plank.len, plank.h, plank.plankSeed);
      forEachWrappedPlacement(drawX + plank.len, y, seam, plank.h, (dx, dy) => {
        g.fillStyle = "rgba(0,0,0,0.01)";
        g.fillRect(dx, dy, seam, plank.h);
      });
    }

  }

  // Get the image data
  const img = g.getImageData(0, 0, p.width, p.height);
  const d = img.data;
  const noiseSeed = (seed + 99999) | 0;
  const w = p.width;
  const h = p.height;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const n = tiledNoise(px, py, w, h, noiseSeed) * 12;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
      const fx = (px + 0.5) / w;
      const fy = (py + 0.5) / h;
      const blend =
        1 +
        0.04 * Math.sin(2 * Math.PI * fx) * Math.sin(2 * Math.PI * fy) +
        0.02 * Math.sin(4 * Math.PI * fx) * Math.sin(4 * Math.PI * fy);
      d[i] = Math.max(0, Math.min(255, d[i] * blend));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] * blend));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] * blend));
    }
  }

  g.putImageData(img, 0, 0);

  return p;
}

interface PolishedConcreteOptions {
  tileSize?: number;
  baseHue?: number;
  sat?: number;
  light?: number;
  cloudAmount?: number;
  grainAmount?: number;
  speckDensity?: number;
  sheen?: number;
  seed?: number;
}

function makePolishedConcretePattern({
  tileSize = 1024,
  baseHue = 34,
  sat = 8,
  light = 62,
  cloudAmount = 7.8,
  grainAmount = 4.2,
  speckDensity = 0.001,
  sheen = 0.05,
  seed = 991,
}: PolishedConcreteOptions = {}): HTMLCanvasElement {
  const p = document.createElement("canvas");
  const size = Math.max(1024, tileSize);
  p.width = size;
  p.height = size;
  const g = p.getContext("2d")!;
  const w = p.width;
  const h = p.height;

  g.fillStyle = `hsl(${baseHue}, ${sat}%, ${light}%)`;
  g.fillRect(0, 0, w, h);

  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const cloudSeed = (seed + 12345) | 0;
  const grainSeed = (seed + 45678) | 0;
  const speckSeed = (seed + 78901) | 0;
  const poreSeed = (seed + 24680) | 0;
  const polishSeed = (seed + 97531) | 0;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;

      const cloud1 = tiledNoise(px * 0.22, py * 0.22, w * 0.22, h * 0.22, cloudSeed);
      const cloud2 = tiledNoise(px * 0.58, py * 0.58, w * 0.58, h * 0.58, cloudSeed ^ 0x5f356495);
      const micro = tiledNoise(px * 2.2, py * 2.2, w * 2.2, h * 2.2, grainSeed);
      let delta = cloud1 * cloudAmount + cloud2 * (cloudAmount * 0.5) + micro * grainAmount;

      const veinField = tiledNoise(px * 0.14 + py * 0.04, py * 0.09, w * 0.14, h * 0.09, cloudSeed ^ 0x2f6e2b1);
      const vein = Math.abs(veinField);
      if (vein > 0.26) {
        delta += (vein - 0.26) * 11;
      }

      const poreCluster = tiledNoise(px * 0.85, py * 0.85, w * 0.85, h * 0.85, poreSeed ^ 0x3f2a1b9);
      const poreField = tiledNoise(px * 6.8, py * 6.8, w * 6.8, h * 6.8, poreSeed);
      const poreThreshold = 0.468 - speckDensity * 38 - poreCluster * 0.036;
      if (poreField < -poreThreshold) {
        delta -= 1.9 + ((-poreThreshold) - poreField) * 4.8;
      }

      const speck = tiledNoise(px * 2.4, py * 2.4, w * 2.4, h * 2.4, speckSeed);
      if (speck > 0.5 - speckDensity) {
        delta += 2.0 + (speck - (0.5 - speckDensity)) * 5.4;
      } else if (speck < -0.5 + speckDensity) {
        delta -= 2.4 + ((-0.5 + speckDensity) - speck) * 6.0;
      }

      const fx = (px + 0.5) / w;
      const fy = (py + 0.5) / h;
      const nx = fx - 0.5;
      const ny = fy - 0.5;
      const proj = nx * 0.78 + ny * -0.62;
      const polishBand = Math.exp(-Math.pow((proj - 0.08) * 2.4, 2));
      const polishBreak = tiledNoise(px * 0.72, py * 0.72, w * 0.72, h * 0.72, polishSeed);
      const polishStreak = tiledNoise(
        px * 0.16 + py * 0.045,
        py * 0.12,
        w * 0.16,
        h * 0.12,
        polishSeed ^ 0x12b4d91,
      );
      const sheenDelta =
        (polishBand * (0.76 + polishBreak * 0.36) + polishStreak * 0.12 - 0.16) *
        255 *
        sheen *
        0.1;
      delta += sheenDelta;
      delta *= 1.55;

      d[i] = Math.max(0, Math.min(255, d[i] + delta));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + delta));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + delta));
    }
  }
  g.putImageData(img, 0, 0);

  return p;
}

export function makeGoldClassicFramePattern(tileSize: number = 320, seed: number = 2026): HTMLCanvasElement {
  const p = document.createElement("canvas");
  const size = Math.max(192, tileSize);
  p.width = size;
  p.height = size;
  const g = p.getContext("2d")!;
  const w = p.width;
  const h = p.height;

  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "hsl(47, 56%, 71%)");
  base.addColorStop(0.22, "hsl(45, 52%, 63%)");
  base.addColorStop(0.5, "hsl(42, 45%, 49%)");
  base.addColorStop(0.78, "hsl(46, 48%, 58%)");
  base.addColorStop(1, "hsl(48, 50%, 66%)");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const cloudSeed = (seed + 1024) | 0;
  const grainSeed = (seed + 2048) | 0;
  const tarnishSeed = (seed + 4096) | 0;
  const poreSeed = (seed + 8192) | 0;
  const streakSeed = (seed + 16384) | 0;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const cloud = tiledNoise(px * 0.22, py * 0.22, w * 0.22, h * 0.22, cloudSeed);
      const grain = tiledNoise(px * 1.2, py * 1.2, w * 1.2, h * 1.2, grainSeed);
      const tarnish = tiledNoise(px * 0.48, py * 0.48, w * 0.48, h * 0.48, tarnishSeed);
      const pore = tiledNoise(px * 3.1, py * 3.1, w * 3.1, h * 3.1, poreSeed);
      const streak = tiledNoise(px * 0.12 + py * 0.9, py * 0.9, w * 0.12, h * 0.9, streakSeed);
      const ridge =
        Math.sin((py / h) * Math.PI * 7.6) * 12 +
        Math.sin((py / h) * Math.PI * 13.2 + 0.8) * 6;
      let delta =
        cloud * 16 +
        grain * 7 +
        ridge * 0.72 +
        Math.max(0, streak - 0.2) * 12 -
        Math.max(0, tarnish - 0.22) * 18;
      if (pore < -0.47) {
        delta -= 7 + (-0.47 - pore) * 18;
      }
      d[i] = Math.max(0, Math.min(255, d[i] + delta));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + delta * 0.84));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + delta * 0.46));
    }
  }
  g.putImageData(img, 0, 0);

  const streakCount = 30;
  for (let i = 0; i < streakCount; i++) {
    const rr = rand((seed * 7919 + i * 1877) | 0);
    const y = rr * h + (rand((seed * 9151 + i * 3217) | 0) - 0.5) * 10;
    g.strokeStyle = `rgba(250,238,196,${0.02 + rr * 0.05})`;
    g.lineWidth = 0.5 + rr * 1.0;
    g.beginPath();
    g.moveTo(-10, y);
    g.lineTo(w + 10, y + (rr - 0.5) * 8);
    g.stroke();
  }

  const bands = [
    { a: 0.02, b: 0.12, color: "rgba(252,244,208,0.24)" },
    { a: 0.14, b: 0.22, color: "rgba(96,79,36,0.14)" },
    { a: 0.26, b: 0.37, color: "rgba(250,240,198,0.14)" },
    { a: 0.42, b: 0.54, color: "rgba(89,72,31,0.18)" },
    { a: 0.59, b: 0.7, color: "rgba(244,234,190,0.09)" },
    { a: 0.76, b: 0.9, color: "rgba(76,61,24,0.2)" },
  ];
  for (const band of bands) {
    g.fillStyle = band.color;
    g.fillRect(0, Math.round(h * band.a), w, Math.max(1, Math.round(h * (band.b - band.a))));
  }

  return p;
}

export function makeBlackModernFramePattern(tileSize: number = 320, seed: number = 3031): HTMLCanvasElement {
  const p = document.createElement("canvas");
  const size = Math.max(192, tileSize);
  p.width = size;
  p.height = size;
  const g = p.getContext("2d")!;
  const w = p.width;
  const h = p.height;

  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "hsl(225, 13%, 26%)");
  base.addColorStop(0.45, "hsl(228, 11%, 20%)");
  base.addColorStop(1, "hsl(230, 10%, 16%)");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const cloudSeed = (seed + 1234) | 0;
  const grainSeed = (seed + 5678) | 0;
  const sheenSeed = (seed + 91011) | 0;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const cloud = tiledNoise(px * 0.2, py * 0.2, w * 0.2, h * 0.2, cloudSeed);
      const grain = tiledNoise(px * 2.0, py * 2.0, w * 2.0, h * 2.0, grainSeed);
      const sheen = tiledNoise(px * 0.12 + py * 0.04, py * 0.08, w * 0.12, h * 0.08, sheenSeed);
      const delta = cloud * 8 + grain * 5 + Math.max(0, sheen - 0.28) * 16;
      d[i] = Math.max(0, Math.min(255, d[i] + delta));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + delta));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + delta * 1.1));
    }
  }
  g.putImageData(img, 0, 0);

  return p;
}

export function makeFramePreviewLShape(
  style: "gold-classic" | "black-modern",
  boxSize: number = 80,
): string {
  const fw = Math.max(10, Math.round(boxSize * 0.18));
  const canvas = document.createElement("canvas");
  canvas.width = boxSize;
  canvas.height = boxSize;
  const ctx = canvas.getContext("2d")!;

  const tile = style === "gold-classic"
    ? makeGoldClassicFramePattern(128, 2026)
    : makeBlackModernFramePattern(320, 3031);
  const pattern = ctx.createPattern(tile, "repeat")!;

  const baseColor = style === "gold-classic" ? "#c8a84b" : "#2a2e38";
  const bg = "#fafafa";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, boxSize, boxSize);

  const cx = boxSize / 2;
  const cy = boxSize / 2;
  ctx.save();
  ctx.rect(0, 0, boxSize, boxSize);
  ctx.clip();
  ctx.translate(cx - fw, cy - fw);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(boxSize, 0);
  ctx.lineTo(boxSize, fw);
  ctx.lineTo(fw, fw);
  ctx.lineTo(fw, boxSize);
  ctx.lineTo(0, boxSize);
  ctx.closePath();

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = baseColor;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, boxSize, fw);
  ctx.clip();
  pattern.setTransform?.(new DOMMatrix());
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, boxSize, fw);
  ctx.restore();

  ctx.save();
  ctx.rotate(Math.PI / 2);
  ctx.beginPath();
  ctx.rect(0, -fw, boxSize, fw);
  ctx.clip();
  const patLeft = ctx.createPattern(tile, "repeat");
  if (patLeft) {
    ctx.fillStyle = patLeft;
    ctx.fillRect(0, -fw, boxSize, fw);
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(boxSize, 0);
  ctx.lineTo(boxSize, fw);
  ctx.lineTo(fw, fw);
  ctx.lineTo(fw, boxSize);
  ctx.lineTo(0, boxSize);
  ctx.closePath();
  ctx.clip();
  const bevelHighlight = ctx.createLinearGradient(0, 0, 0, boxSize);
  const bevelShadow = ctx.createLinearGradient(0, 0, 0, boxSize);
  if (style === "gold-classic") {
    bevelHighlight.addColorStop(0, "rgba(249,238,201,0.26)");
    bevelHighlight.addColorStop(0.45, "rgba(246,232,184,0.07)");
    bevelHighlight.addColorStop(1, "rgba(255,255,255,0)");
    bevelShadow.addColorStop(0, "rgba(0,0,0,0)");
    bevelShadow.addColorStop(0.55, "rgba(74,59,24,0.07)");
    bevelShadow.addColorStop(1, "rgba(58,45,18,0.14)");
  } else {
    bevelHighlight.addColorStop(0, "rgba(255,255,255,0.18)");
    bevelHighlight.addColorStop(0.45, "rgba(255,255,255,0.05)");
    bevelHighlight.addColorStop(1, "rgba(255,255,255,0)");
    bevelShadow.addColorStop(0, "rgba(0,0,0,0)");
    bevelShadow.addColorStop(0.55, "rgba(0,0,0,0.14)");
    bevelShadow.addColorStop(1, "rgba(0,0,0,0.3)");
  }
  ctx.fillStyle = bevelHighlight;
  ctx.fillRect(0, 0, boxSize, boxSize);
  ctx.fillStyle = bevelShadow;
  ctx.fillRect(0, 0, boxSize, boxSize);
  ctx.restore();

  if (style === "gold-classic") {
    const strokeBands = [
      { t: 0.1, color: "rgba(251,242,208,0.19)" },
      { t: 0.24, color: "rgba(86,68,29,0.14)" },
      { t: 0.42, color: "rgba(247,236,193,0.12)" },
      { t: 0.62, color: "rgba(79,62,25,0.16)" },
      { t: 0.82, color: "rgba(241,229,178,0.09)" },
    ];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(boxSize, 0);
    ctx.lineTo(boxSize, fw);
    ctx.lineTo(fw, fw);
    ctx.lineTo(fw, boxSize);
    ctx.lineTo(0, boxSize);
    ctx.closePath();
    ctx.clip();
    for (const band of strokeBands) {
      const inset = Math.max(0.5, fw * band.t);
      ctx.strokeStyle = band.color;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(inset, inset, Math.max(0, boxSize - inset * 2), Math.max(0, boxSize - inset * 2));
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(72,55,21,0.28)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(fw, fw);
    ctx.lineTo(fw, boxSize);
    ctx.moveTo(fw, fw);
    ctx.lineTo(boxSize, fw);
    ctx.stroke();
  }

  ctx.restore();

  return canvas.toDataURL("image/png");
}

// NOISE TEXTURE
function createNoiseTexture(size: number = 256): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const id = ctx.createImageData(size, size);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 40;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

interface WallColors {
  top: string;
  bottom: string;
}
interface FloorColors {
  top: string;
  bottom: string;
}

export type FloorTextureId = "none" | "wood-planks" | "polished-concrete";
export type FrameStyleId = "none" | "gold-classic" | "black-modern";

function drawBackground(
  ctx: CanvasRenderingContext2D,
  noiseCanvas: HTMLCanvasElement,
  pad: number = 800,
  seamY: number = SEAM_Y,
  wallColors?: WallColors | null,
  floorColors?: FloorColors | null,
  floorTexture: FloorTextureId = "none",
  floorPatternCanvas: HTMLCanvasElement | null = null,
) {
  const wall = wallColors ?? WALL_COLORS;
  const floor = floorColors ?? FLOOR_COLORS;

  const PAD = pad;
  const L = -PAD;
  const R = WORLD.w + PAD;
  const T = -PAD;
  const B = WORLD.h + PAD;
  const W = R - L;
  const wallH = seamY - T;
  const floorH = B - seamY;

  // Wall gradient
  const wallGrad = ctx.createLinearGradient(0, T, 0, seamY);
  wallGrad.addColorStop(0, wall.top);
  wallGrad.addColorStop(0.7, wall.bottom);
  wallGrad.addColorStop(1, wall.bottom);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(L, T, W, wallH);

  const hasPatternFloor = floorTexture !== "none" && !!floorPatternCanvas;
  if (hasPatternFloor) {
    const pat = ctx.createPattern(floorPatternCanvas, "repeat");
    if (pat) {
      const inset = W * 0.22;
      ctx.save();
      ctx.transform(1, 0, inset / floorH, -1, L, B);
      ctx.fillStyle = pat;
      ctx.fillRect(-inset, 0, W + 2 * inset, floorH);
      ctx.restore();

      if (floorTexture === "polished-concrete") {
        const floorGrad = ctx.createLinearGradient(0, seamY, 0, B);
        floorGrad.addColorStop(0, floor.top);
        floorGrad.addColorStop(1, floor.bottom);
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        ctx.globalAlpha = 0.1;
        ctx.transform(1, 0, inset / floorH, -1, L, B);
        ctx.fillStyle = floorGrad;
        ctx.fillRect(-inset, 0, W + 2 * inset, floorH);
        ctx.restore();
      }
    } else {
      const floorGrad = ctx.createLinearGradient(0, seamY, 0, B);
      floorGrad.addColorStop(0, floor.top);
      floorGrad.addColorStop(1, floor.bottom);
      ctx.fillStyle = floorGrad;
      ctx.fillRect(L, seamY, W, floorH);
    }
  } else {
    const floorGrad = ctx.createLinearGradient(0, seamY, 0, B);
    floorGrad.addColorStop(0, floor.top);
    floorGrad.addColorStop(1, floor.bottom);
    ctx.fillStyle = floorGrad;
    ctx.fillRect(L, seamY, W, floorH);
  }

  // Ambient occlusion at wall-floor junction
  ctx.save();
  const aoGrad = ctx.createLinearGradient(0, seamY - 30, 0, seamY + 40);
  aoGrad.addColorStop(0, "rgba(0,0,0,0)");
  aoGrad.addColorStop(0.4, "rgba(0,0,0,0.04)");
  aoGrad.addColorStop(0.6, "rgba(0,0,0,0.06)");
  aoGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aoGrad;
  ctx.fillRect(L, seamY - 30, W, 70);
  ctx.restore();

  // Fixed white baseboard
  const baseboardH = 12;
  const baseboardColor = "#f3f0e9";
  ctx.fillStyle = baseboardColor;
  ctx.fillRect(L, seamY - baseboardH, W, baseboardH);

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(L, seamY - baseboardH, W, 1);

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(L, seamY, W, 1);

  // Noise grain
  const pat = ctx.createPattern(noiseCanvas, "repeat");
  if (pat) {
    ctx.save();
    ctx.globalAlpha = 0.025;
    ctx.fillStyle = pat;
    ctx.fillRect(L, T, W, wallH);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.035;
    if (hasPatternFloor) {
      const inset = W * 0.22;
      ctx.transform(1, 0, inset / floorH, -1, L, B);
      ctx.fillStyle = pat;
      ctx.fillRect(-inset, 0, W + 2 * inset, floorH);
    } else {
      ctx.fillStyle = pat;
      ctx.fillRect(L, seamY, W, floorH);
    }
    ctx.restore();
  }

  // Floor bounce light
  ctx.save();
  const bounceGrad = ctx.createRadialGradient(
    WORLD.w / 2, seamY, 0,
    WORLD.w / 2, seamY + 200, WORLD.w * 0.6,
  );
  bounceGrad.addColorStop(0, "rgba(255,255,255,0.06)");
  bounceGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = bounceGrad;
  if (hasPatternFloor) {
    const inset = W * 0.22;
    ctx.transform(1, 0, inset / floorH, -1, L, B);
    ctx.fillRect(-inset, 0, W + 2 * inset, floorH);
  } else {
    ctx.fillRect(L, seamY, W, floorH);
  }
  ctx.restore();
}

function drawArtworkFromAnchors(
  ctx: CanvasRenderingContext2D,
  art: ArtworkAnchors,
  seamY: number,
  artImage: HTMLImageElement | null,
  frameStyle: FrameStyleId,
  frameWidthWorld: number,
  framePatternCanvas: HTMLCanvasElement | null,
) {
  const boxX = art.cx - art.w / 2;
  const boxY = seamY - art.bottomGap - art.h;

  let drawW = art.w;
  let drawH = art.h;
  let drawX = boxX;
  let drawY = boxY;

  if (artImage) {
    // Contain-fit
    const imgAspect = artImage.naturalWidth / artImage.naturalHeight;
    const boxAspect = art.w / art.h;
    if (imgAspect > boxAspect) {
      drawW = art.w;
      drawH = art.w / imgAspect;
      drawX = boxX;
      drawY = boxY + (art.h - drawH);
    } else {
      drawH = art.h;
      drawW = art.h * imgAspect;
      drawX = boxX + (art.w - drawW) / 2;
      drawY = boxY;
    }
  }

  if (frameStyle !== "none" && frameWidthWorld > 0) {
    const fw = frameWidthWorld;
    const outerX = drawX - fw;
    const outerY = drawY - fw;
    const outerW = drawW + fw * 2;
    const outerH = drawH + fw * 2;

    // Frame drop shadow (opaque fill so shadow is visible; frame drawn on top)
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = frameStyle === "gold-classic" ? "#c8a84b" : "#2a2e38";
    ctx.fillRect(outerX, outerY, outerW, outerH);
    ctx.restore();

    ctx.save();
    const fallbackFrameColor =
      frameStyle === "gold-classic" ? "#a7863d" : "#2a2e38";

    // Mitered trapezoids per side (45° corner cuts)
    const drawMiteredStrip = (side: "top" | "bottom" | "left" | "right") => {
      ctx.save();
      ctx.beginPath();
      if (side === "top") {
        ctx.moveTo(outerX, outerY);
        ctx.lineTo(outerX + outerW, outerY);
        ctx.lineTo(outerX + outerW - fw, outerY + fw);
        ctx.lineTo(outerX + fw, outerY + fw);
      } else if (side === "bottom") {
        ctx.moveTo(outerX, outerY + outerH);
        ctx.lineTo(outerX + outerW, outerY + outerH);
        ctx.lineTo(outerX + outerW - fw, outerY + outerH - fw);
        ctx.lineTo(outerX + fw, outerY + outerH - fw);
      } else if (side === "left") {
        ctx.moveTo(outerX, outerY);
        ctx.lineTo(outerX + fw, outerY + fw);
        ctx.lineTo(outerX + fw, outerY + outerH - fw);
        ctx.lineTo(outerX, outerY + outerH);
      } else {
        ctx.moveTo(outerX + outerW, outerY);
        ctx.lineTo(outerX + outerW - fw, outerY + fw);
        ctx.lineTo(outerX + outerW - fw, outerY + outerH - fw);
        ctx.lineTo(outerX + outerW, outerY + outerH);
      }
      ctx.closePath();
      ctx.clip();

      if (!framePatternCanvas) {
        ctx.fillStyle = fallbackFrameColor;
        ctx.fillRect(outerX, outerY, outerW, outerH);
        ctx.restore();
        return;
      }

      if (side === "left" || side === "right") {
        // Rotate 90° so gradient runs across strip width
        const stripX = side === "left" ? outerX : outerX + outerW - fw;
        ctx.translate(stripX, outerY);
        ctx.rotate(Math.PI / 2);
        const pat = ctx.createPattern(framePatternCanvas, "repeat");
        if (pat) {
          ctx.fillStyle = pat;
          ctx.fillRect(0, -fw, outerH, fw);
        } else {
          ctx.fillStyle = fallbackFrameColor;
          ctx.fillRect(0, -fw, outerH, fw);
        }
      } else {
        // Top/bottom: pattern upright, origin at outer corner
        const pat = ctx.createPattern(framePatternCanvas, "repeat");
        if (pat) {
          pat.setTransform?.(new DOMMatrix().translate(-outerX, -outerY));
          ctx.fillStyle = pat;
          ctx.fillRect(outerX, outerY, outerW, outerH);
        } else {
          ctx.fillStyle = fallbackFrameColor;
          ctx.fillRect(outerX, outerY, outerW, outerH);
        }
      }
      ctx.restore();
    };

    drawMiteredStrip("top");
    drawMiteredStrip("bottom");
    drawMiteredStrip("left");
    drawMiteredStrip("right");

    ctx.beginPath();
    ctx.rect(outerX, outerY, outerW, outerH);
    ctx.rect(drawX, drawY, drawW, drawH);
    ctx.clip("evenodd");
    const bevelHighlight = ctx.createLinearGradient(
      0,
      outerY,
      0,
      outerY + outerH,
    );
    const bevelShadow = ctx.createLinearGradient(
      0,
      outerY,
      0,
      outerY + outerH,
    );
    if (frameStyle === "gold-classic") {
      bevelHighlight.addColorStop(0, "rgba(249,238,201,0.26)");
      bevelHighlight.addColorStop(0.45, "rgba(246,232,184,0.07)");
      bevelHighlight.addColorStop(1, "rgba(255,255,255,0)");
      bevelShadow.addColorStop(0, "rgba(0,0,0,0)");
      bevelShadow.addColorStop(0.55, "rgba(74,59,24,0.07)");
      bevelShadow.addColorStop(1, "rgba(58,45,18,0.14)");
    } else {
      bevelHighlight.addColorStop(0, "rgba(255,255,255,0.18)");
      bevelHighlight.addColorStop(0.45, "rgba(255,255,255,0.05)");
      bevelHighlight.addColorStop(1, "rgba(255,255,255,0)");
      bevelShadow.addColorStop(0, "rgba(0,0,0,0)");
      bevelShadow.addColorStop(0.55, "rgba(0,0,0,0.14)");
      bevelShadow.addColorStop(1, "rgba(0,0,0,0.3)");
    }
    ctx.fillStyle = bevelHighlight;
    ctx.fillRect(outerX, outerY, outerW, outerH);
    ctx.fillStyle = bevelShadow;
    ctx.fillRect(outerX, outerY, outerW, outerH);

    if (frameStyle === "gold-classic") {
      const strokeBands = [
        { t: 0.1, color: "rgba(251,242,208,0.19)" },
        { t: 0.24, color: "rgba(86,68,29,0.14)" },
        { t: 0.42, color: "rgba(247,236,193,0.12)" },
        { t: 0.62, color: "rgba(79,62,25,0.16)" },
        { t: 0.82, color: "rgba(241,229,178,0.09)" },
      ];
      for (const band of strokeBands) {
        const inset = Math.max(0.5, fw * band.t);
        ctx.strokeStyle = band.color;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(
          outerX + inset,
          outerY + inset,
          Math.max(0, outerW - inset * 2),
          Math.max(0, outerH - inset * 2),
        );
      }

      ctx.strokeStyle = "rgba(72,55,21,0.28)";
      ctx.lineWidth = 0.9;
      const innerInset = Math.max(0.5, fw * 0.18);
      ctx.strokeRect(
        drawX - innerInset,
        drawY - innerInset,
        drawW + innerInset * 2,
        drawH + innerInset * 2,
      );
    }
    ctx.restore();

  }

  if (artImage) {
    if (frameStyle === "none") {
      // Unframed artwork keeps its own shadow
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.28)";
      ctx.shadowBlur = 32;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = "#fff";
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.restore();
    }

    ctx.drawImage(artImage, drawX, drawY, drawW, drawH);

    if (frameStyle !== "none") {
      const edge = Math.max(4, Math.min(18, Math.min(drawW, drawH) * 0.06));
      ctx.save();
      ctx.beginPath();
      ctx.rect(drawX, drawY, drawW, drawH);
      ctx.clip();

      const topGrad = ctx.createLinearGradient(0, drawY, 0, drawY + edge);
      topGrad.addColorStop(0, "rgba(0,0,0,0.22)");
      topGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(drawX, drawY, drawW, edge);

      const leftGrad = ctx.createLinearGradient(drawX, 0, drawX + edge, 0);
      leftGrad.addColorStop(0, "rgba(0,0,0,0.14)");
      leftGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = leftGrad;
      ctx.fillRect(drawX, drawY, edge, drawH);

      const bottomGrad = ctx.createLinearGradient(0, drawY + drawH - edge, 0, drawY + drawH);
      bottomGrad.addColorStop(0, "rgba(0,0,0,0)");
      bottomGrad.addColorStop(1, "rgba(0,0,0,0.16)");
      ctx.fillStyle = bottomGrad;
      ctx.fillRect(drawX, drawY + drawH - edge, drawW, edge);

      const rightGrad = ctx.createLinearGradient(drawX + drawW - edge, 0, drawX + drawW, 0);
      rightGrad.addColorStop(0, "rgba(0,0,0,0)");
      rightGrad.addColorStop(1, "rgba(0,0,0,0.1)");
      ctx.fillStyle = rightGrad;
      ctx.fillRect(drawX + drawW - edge, drawY, edge, drawH);
      ctx.restore();
    }
  } else {
    // Fallback placeholder
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
    const g = ctx.createLinearGradient(boxX, boxY, boxX + art.w, boxY + art.h);
    g.addColorStop(0, "#6b8f71");
    g.addColorStop(0.5, "#a3c4a8");
    g.addColorStop(1, "#8b6f47");
    ctx.fillStyle = g;
    ctx.fillRect(boxX, boxY, art.w, art.h);
    ctx.restore();
  }
}

function drawChairFromAnchors(
  ctx: CanvasRenderingContext2D,
  chair: ChairAnchors,
  seamY: number,
  chairImage: HTMLImageElement | null,
) {
  const chairX = chair.cx - chair.w / 2;
  const chairBottomY = seamY + chair.floorOffset;
  const chairTopY = chairBottomY - chair.h;

  if (chairImage) {
    const imgAspect = chairImage.naturalWidth / chairImage.naturalHeight;
    const boxAspect = chair.w / chair.h;

    let drawW: number, drawH: number, drawX: number, drawY: number;
    if (imgAspect > boxAspect) {
      drawW = chair.w;
      drawH = chair.w / imgAspect;
      drawX = chairX;
      drawY = chairBottomY - drawH;
    } else {
      drawH = chair.h;
      drawW = chair.h * imgAspect;
      drawX = chairX + (chair.w - drawW) / 2;
      drawY = chairTopY;
    }

    ctx.drawImage(chairImage, drawX, drawY, drawW, drawH);
  } else {
    ctx.save();
    ctx.fillStyle = "rgba(60,48,38,0.6)";
    ctx.fillRect(chairX, chairTopY, chair.w, chair.h);
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  zoom: number,
  art: ArtworkAnchors,
  chair: ChairAnchors,
  showDebug: boolean,
  dimensionsCm?: DimensionsCm | null,
  artZoomFactor?: number,
  seamY: number = SEAM_Y,
) {
  if (!showDebug) return;

  const lines = [
    `Viewport: ${Math.round(viewW)} × ${Math.round(viewH)} CSS px`,
    `zoom: ${zoom.toFixed(4)}`,
    `WORLD: ${WORLD.w} × ${WORLD.h}`,
    `seamY: ${seamY}`,
    ...(dimensionsCm
      ? [
          `Dimensions: ${dimensionsCm.heightCm} × ${dimensionsCm.widthCm} cm (H×W)`,
          `Art zoom factor: ${artZoomFactor?.toFixed(3) ?? "1"}`,
        ]
      : []),
    `Art: ${art.w.toFixed(0)}×${art.h.toFixed(0)} px  bottomGap: ${art.bottomGap}`,
    `Chair floorOffset: ${chair.floorOffset}  (feet at y=${seamY + chair.floorOffset})`,
    `DPR: ${window.devicePixelRatio}`,
  ];

  ctx.save();
  ctx.font = "12px monospace";
  ctx.textBaseline = "top";

  const padding = 10;
  const lineH = 17;
  const boxW = 380;
  const boxH = lines.length * lineH + padding * 2;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(ctx, 10, 10, boxW, boxH, 6);
  ctx.fill();

  ctx.fillStyle = "#fff";
  lines.forEach((line, i) => {
    ctx.fillText(line, 10 + padding, 10 + padding + i * lineH);
  });
  ctx.restore();
}

// IMAGE LOADER
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// REACT COMPONENT

export type { WallColors, FloorColors };

interface InSituCanvasProps {
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
  const floorTopHex = floorForWood.top;
  const floorBottomHex = floorForWood.bottom;

  const floorPatternCanvas = useMemo(() => {
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

  const framePatternCanvas = useMemo(() => {
    if (frameStyle === "none") return null;
    if (frameStyle === "gold-classic") {
      return makeGoldClassicFramePattern(128, 2026);
    }
    return makeBlackModernFramePattern(320, 3031);
  }, [frameStyle]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!noiseRef.current) noiseRef.current = createNoiseTexture(256);

    const dpr = window.devicePixelRatio || 1;
    const viewW = canvas.clientWidth;
    const viewH = canvas.clientHeight;

    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);

    const zoomFit = Math.min(viewW / WORLD.w, viewH / WORLD.h);

    // zoom and chair nudge interpolate with viewport width
    const W_MOBILE = 380;
    const W_TABLET = 768;

    let zoomFactor: number;
    let chairNudge: number;

    if (viewW <= W_MOBILE) {
      zoomFactor = 2.95;
      chairNudge = 350;
    } else if (viewW < W_TABLET) {
      const t = smoothstep((viewW - W_MOBILE) / (W_TABLET - W_MOBILE));
      zoomFactor = lerp(2.95, 1.65, t);
      chairNudge = lerp(350, 230, t);
    } else if (viewW < W_DESKTOP) {
      const t = smoothstep((viewW - W_TABLET) / (W_DESKTOP - W_TABLET));
      zoomFactor = lerp(1.65, 1, t);
      chairNudge = lerp(230, 0, t);
    } else {
      zoomFactor = 1;
      chairNudge = 0;
    }

    // Dynamic seam for large art: more visible floor
    const seamY = getSeamYForDimensions(dimensionsCm);

    // Art anchors (bottomGap depends on viewW for small-art on desktop)
    let art: ArtworkAnchors = { ...DEFAULT_ART, ...artworkAnchors };
    if (dimensionsCm) {
      const { w, h } = dimensionsCmToWorldSize(dimensionsCm);
      art = {
        ...art,
        w,
        h,
        bottomGap: getBottomGapForArtHeight(h, dimensionsCm, viewW),
      };
    }

    // Chair anchors
    let chair: ChairAnchors = { ...DEFAULT_CHAIR, ...chairAnchors };
    if (dimensionsCm) {
      chair = { ...chair, cx: art.cx + art.w / 2 + CHAIR_GAP_RIGHT_OF_ART };
    }
    const chairLayout = { ...chair, cx: chair.cx - chairNudge };
    const effectiveFrameWidthCm = frameStyle === "black-modern" ? 1.5 : frameWidthCm;
    const frameWidthWorld = Math.max(0, effectiveFrameWidthCm * CM_TO_WORLD);

    let artZoomFactor = getArtZoomFactor(dimensionsCm ?? null);
    if (viewW >= W_DESKTOP && dimensionsCm && dimensionsCm.widthCm < 200 && dimensionsCm.heightCm < 200) {
      artZoomFactor *= 1.25;
    }
    if (viewW >= W_DESKTOP && dimensionsCm) {
      const longEdge = Math.max(dimensionsCm.widthCm, dimensionsCm.heightCm);
      const shortEdge = Math.min(dimensionsCm.widthCm, dimensionsCm.heightCm);
      if (longEdge >= 263 && shortEdge >= 200) {
        artZoomFactor = Math.min(artZoomFactor, ART_ZOOM_FACTOR_MIN);
      }
    }

    // Cap zoom-in
    const baseZoom = zoomFit * zoomFactor;
    const maxZoomToSeeFloor = viewH / (2 * (seamY - WORLD.h / 2));
    const maxArtZoomForFloor = baseZoom > 0 ? maxZoomToSeeFloor / baseZoom : artZoomFactor;
    artZoomFactor = Math.min(artZoomFactor, maxArtZoomForFloor);
    let zoom = baseZoom * artZoomFactor;
    if (viewW <= W_TABLET && art.w > 0) {
      const zoomToFitArt = (viewW * MOBILE_ART_WIDTH_RATIO) / art.w;
      zoom = Math.min(zoom, zoomToFitArt);
    }

    const worldOffX = viewW / 2 - (WORLD.w / 2) * zoom;
    let worldOffY: number;
    if (viewW > W_MOBILE && dimensionsCm && (dimensionsCm.widthCm >= 200 || dimensionsCm.heightCm >= 200)) {
      const focusY = seamY * 0.25;
      worldOffY = viewH / 2 - focusY * zoom;
    } else {
      worldOffY = viewH / 2 - (WORLD.h / 2) * zoom;
    }

    const effectiveWall = wallColors ?? WALL_COLORS;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = effectiveWall.top;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(
      dpr * zoom, 0, 0, dpr * zoom,
      dpr * worldOffX,
      dpr * worldOffY,
    );

    const pad = Math.ceil(Math.max(800, viewW / (2 * zoom) - WORLD.w / 2, viewH / (2 * zoom) - WORLD.h / 2));
    drawBackground(ctx, noiseRef.current, pad, seamY, wallColors, floorColors, floorTexture, floorPatternCanvas);
    drawArtworkFromAnchors(
      ctx,
      art,
      seamY,
      artImageRef.current,
      frameStyle,
      frameWidthWorld,
      framePatternCanvas,
    );
    if (showChair) {
      drawChairFromAnchors(ctx, chairLayout, seamY, chairImageRef.current);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawDebugOverlay(ctx, viewW, viewH, zoom, art, chairLayout, showDebug, dimensionsCm ?? undefined, artZoomFactor, seamY);
  }, [
    showDebug,
    showChair,
    dimensionsCm,
    wallColors,
    floorColors,
    floorTexture,
    frameStyle,
    frameWidthCm,
    floorPatternCanvas,
    framePatternCanvas,
    artworkAnchors,
    chairAnchors,
  ]);

  useEffect(() => {
    const src = artworkImageSrc ?? DEFAULT_ARTWORK_SRC;
    loadImage(src).then((img) => {
      artImageRef.current = img;
      render();
    });
  }, [artworkImageSrc, render]);

  useEffect(() => {
    if (!showChair) {
      chairImageRef.current = null;
      render();
      return;
    }
    const src = chairImageSrc ?? DEFAULT_CHAIR_SRC;
    loadImage(src).then((img) => {
      chairImageRef.current = img;
      render();
    });
  }, [showChair, chairImageSrc, render]);

  useEffect(() => {
    render();
    let rafId: number | null = null;
    const onResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        render();
        rafId = null;
      });
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
