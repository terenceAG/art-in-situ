"use client";

import { useEffect, useRef, useCallback } from "react";

// WORLD COORDINATE SYSTEM
const WORLD = { w: 1600, h: 900 } as const;
const SEAM_Y = 720; 

// Realistic color palettes
const WALL_COLORS = {
  top: "#f8f7f6",
  bottom: "#f2f0ed",
} as const;

const FLOOR_COLORS = {
  top: "#b8b5b0",
  bottom: "#9a9792",
} as const;

const BASEBOARD_COLOR = "#a5a29d";

// Default image paths
const DEFAULT_ARTWORK_SRC = "/assets/images/testArtwork.webp";
const DEFAULT_CHAIR_SRC = "/assets/images/chair.png";

// Scene object anchor types
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

function getSeamYForDimensions(dimensionsCm: DimensionsCm | null): number {
  if (!dimensionsCm) return SEAM_Y;
  const w = dimensionsCm.widthCm;
  const h = dimensionsCm.heightCm;
  if (w >= 300 || h >= 300) return SEAM_Y;
  if (w >= 200 || h >= 200) return 800;
  return SEAM_Y;
}

interface DimensionsCm {
  widthCm: number;
  heightCm: number;
}

function dimensionsCmToWorldSize(d: DimensionsCm): { w: number; h: number } {
  return {
    w: (d.widthCm / REF_ART_CM.w) * REF_ART_WORLD.w,
    h: (d.heightCm / REF_ART_CM.h) * REF_ART_WORLD.h,
  };
}

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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
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

// DRAWING HELPERS

function darkenHex(hex: string, factor: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return hex;
  let r = parseInt(m[1], 16);
  let g = parseInt(m[2], 16);
  let b = parseInt(m[3], 16);
  r = Math.round(r * factor);
  g = Math.round(g * factor);
  b = Math.round(b * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

interface WallColors {
  top: string;
  bottom: string;
}
interface FloorColors {
  top: string;
  bottom: string;
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  noiseCanvas: HTMLCanvasElement,
  pad: number = 800,
  seamY: number = SEAM_Y,
  wallColors?: WallColors | null,
  floorColors?: FloorColors | null,
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

  // Floor gradient
  const floorGrad = ctx.createLinearGradient(0, seamY, 0, B);
  floorGrad.addColorStop(0, floor.top);
  floorGrad.addColorStop(1, floor.bottom);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(L, seamY, W, floorH);

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

  // Baseboard darken
  const baseboardH = 8;
  const baseboardColor = floorColors
    ? darkenHex(floor.bottom, 0.90)
    : BASEBOARD_COLOR;
  ctx.fillStyle = baseboardColor;
  ctx.fillRect(L, seamY - baseboardH, W, baseboardH);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(L, seamY - baseboardH, W, 1);

  ctx.fillStyle = "rgba(0,0,0,0.08)";
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
    ctx.fillStyle = pat;
    ctx.fillRect(L, seamY, W, floorH);
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
  ctx.fillRect(L, seamY, W, floorH);
  ctx.restore();
}

function drawArtworkFromAnchors(
  ctx: CanvasRenderingContext2D,
  art: ArtworkAnchors,
  seamY: number,
  artImage: HTMLImageElement | null,
) {
  const boxX = art.cx - art.w / 2;
  const boxY = seamY - art.bottomGap - art.h;

  if (artImage) {
    // Contain-fit
    const imgAspect = artImage.naturalWidth / artImage.naturalHeight;
    const boxAspect = art.w / art.h;

    let drawW: number, drawH: number, drawX: number, drawY: number;
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

    // shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(drawX, drawY, drawW, drawH);
    ctx.restore();

    // inner shadow 
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#fff";
    ctx.fillRect(drawX, drawY, drawW, drawH);
    ctx.restore();

    // Artwork image
    ctx.drawImage(artImage, drawX, drawY, drawW, drawH);
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
          `Dimensions: ${dimensionsCm.widthCm} × ${dimensionsCm.heightCm} cm`,
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
  chairImageSrc?: string;
  dimensionsCm?: DimensionsCm | null;
  wallColors?: WallColors | null;
  floorColors?: FloorColors | null;
  artworkAnchors?: Partial<ArtworkAnchors>;
  chairAnchors?: Partial<ChairAnchors>;
}

export function InSituCanvas({
  showDebug = false,
  artworkImageSrc = DEFAULT_ARTWORK_SRC,
  chairImageSrc = DEFAULT_CHAIR_SRC,
  dimensionsCm = null,
  wallColors = null,
  floorColors = null,
  artworkAnchors,
  chairAnchors,
}: InSituCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const noiseRef = useRef<HTMLCanvasElement | null>(null);
  const artImageRef = useRef<HTMLImageElement | null>(null);
  const chairImageRef = useRef<HTMLImageElement | null>(null);

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

    let artZoomFactor = getArtZoomFactor(dimensionsCm ?? null);
    // Desktop and small artworks: slight zoom-in
    if (viewW >= W_DESKTOP && dimensionsCm && dimensionsCm.widthCm < 200 && dimensionsCm.heightCm < 200) {
      artZoomFactor *= 1.25;
    }
    // Desktop: 263×325, 300×400 use same zoom and floor as 400×500 (cap zoom to match)
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
    drawBackground(ctx, noiseRef.current, pad, seamY, wallColors, floorColors);
    drawArtworkFromAnchors(ctx, art, seamY, artImageRef.current);
    drawChairFromAnchors(ctx, chairLayout, seamY, chairImageRef.current);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawDebugOverlay(ctx, viewW, viewH, zoom, art, chairLayout, showDebug, dimensionsCm ?? undefined, artZoomFactor, seamY);
  }, [showDebug, dimensionsCm, wallColors, floorColors, artworkAnchors, chairAnchors]);

  useEffect(() => {
    const src = artworkImageSrc ?? DEFAULT_ARTWORK_SRC;
    loadImage(src).then((img) => {
      artImageRef.current = img;
      render();
    });
  }, [artworkImageSrc, render]);

  useEffect(() => {
    const src = chairImageSrc ?? DEFAULT_CHAIR_SRC;
    loadImage(src).then((img) => {
      chairImageRef.current = img;
      render();
    });
  }, [chairImageSrc, render]);

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
