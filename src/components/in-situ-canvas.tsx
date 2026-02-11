"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";

// WORLD COORDINATE SYSTEM
const WORLD = { w: 1600, h: 900 } as const;
const SEAM_Y = 720; 

// Realistic color palettes (parameterized)
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

function drawBackground(
  ctx: CanvasRenderingContext2D,
  noiseCanvas: HTMLCanvasElement,
) {
  const PAD = 800;
  const L = -PAD;
  const R = WORLD.w + PAD;
  const T = -PAD;
  const B = WORLD.h + PAD;
  const W = R - L;
  const wallH = SEAM_Y - T;
  const floorH = B - SEAM_Y;

  // Wall gradient
  const wallGrad = ctx.createLinearGradient(0, T, 0, SEAM_Y);
  wallGrad.addColorStop(0, WALL_COLORS.top);
  wallGrad.addColorStop(0.7, WALL_COLORS.bottom);
  wallGrad.addColorStop(1, WALL_COLORS.bottom);
  ctx.fillStyle = wallGrad;
  ctx.fillRect(L, T, W, wallH);

  // Floor gradient
  const floorGrad = ctx.createLinearGradient(0, SEAM_Y, 0, B);
  floorGrad.addColorStop(0, FLOOR_COLORS.top);
  floorGrad.addColorStop(1, FLOOR_COLORS.bottom);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(L, SEAM_Y, W, floorH);

  // Ambient occlusion at wall-floor junction
  ctx.save();
  const aoGrad = ctx.createLinearGradient(0, SEAM_Y - 30, 0, SEAM_Y + 40);
  aoGrad.addColorStop(0, "rgba(0,0,0,0)");
  aoGrad.addColorStop(0.4, "rgba(0,0,0,0.04)");
  aoGrad.addColorStop(0.6, "rgba(0,0,0,0.06)");
  aoGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aoGrad;
  ctx.fillRect(L, SEAM_Y - 30, W, 70);
  ctx.restore();

  // Baseboard
  const baseboardH = 8;
  ctx.fillStyle = BASEBOARD_COLOR;
  ctx.fillRect(L, SEAM_Y - baseboardH, W, baseboardH);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(L, SEAM_Y - baseboardH, W, 1);

  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(L, SEAM_Y, W, 1);

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
    ctx.fillRect(L, SEAM_Y, W, floorH);
    ctx.restore();
  }

  // Floor bounce light
  ctx.save();
  const bounceGrad = ctx.createRadialGradient(
    WORLD.w / 2, SEAM_Y, 0,
    WORLD.w / 2, SEAM_Y + 200, WORLD.w * 0.6,
  );
  bounceGrad.addColorStop(0, "rgba(255,255,255,0.06)");
  bounceGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = bounceGrad;
  ctx.fillRect(L, SEAM_Y, W, floorH);
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
    // Contain-fit: show the full image, no cropping
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

    // Soft outer shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(drawX, drawY, drawW, drawH);
    ctx.restore();

    // Tighter inner shadow 
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

function drawVignette(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
) {
  const cx = viewW / 2;
  const cy = viewH / 2;
  const r = Math.max(viewW, viewH) * 0.75;
  const grad = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.15)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, viewW, viewH);
}

function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  zoomFit: number,
  art: ArtworkAnchors,
  chair: ChairAnchors,
  showDebug: boolean,
) {
  if (!showDebug) return;

  const lines = [
    `Viewport: ${Math.round(viewW)} × ${Math.round(viewH)} CSS px`,
    `zoomFit: ${zoomFit.toFixed(4)}`,
    `WORLD: ${WORLD.w} × ${WORLD.h}`,
    `seamY: ${SEAM_Y}`,
    `Art bottom → seam: ${art.bottomGap}px  (y=${SEAM_Y - art.bottomGap})`,
    `Chair floorOffset: ${chair.floorOffset}  (feet at y=${SEAM_Y + chair.floorOffset})`,
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

interface InSituCanvasProps {
  showDebug?: boolean;
  artworkImageSrc?: string;
  chairImageSrc?: string;
  artworkAnchors?: Partial<ArtworkAnchors>;
  chairAnchors?: Partial<ChairAnchors>;
}

export function InSituCanvas({
  showDebug = false,
  artworkImageSrc = DEFAULT_ARTWORK_SRC,
  chairImageSrc = DEFAULT_CHAIR_SRC,
  artworkAnchors,
  chairAnchors,
}: InSituCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const noiseRef = useRef<HTMLCanvasElement | null>(null);
  const artImageRef = useRef<HTMLImageElement | null>(null);
  const chairImageRef = useRef<HTMLImageElement | null>(null);
  const imagesLoadedRef = useRef(false);

  const art: ArtworkAnchors = useMemo(
    () => ({ ...DEFAULT_ART, ...artworkAnchors }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [artworkAnchors?.cx, artworkAnchors?.w, artworkAnchors?.h, artworkAnchors?.bottomGap],
  );
  const chair: ChairAnchors = useMemo(
    () => ({ ...DEFAULT_CHAIR, ...chairAnchors }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chairAnchors?.cx, chairAnchors?.w, chairAnchors?.h, chairAnchors?.floorOffset],
  );

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

    // Smooth responsive layout: zoom and chair nudge interpolate with viewport width (no snap)
    const W_MOBILE = 380;
    const W_TABLET = 768;
    const W_DESKTOP = 1400;

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

    const zoom = zoomFit * zoomFactor;
    const chairLayout = { ...chair, cx: chair.cx - chairNudge };

    // Clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // World transform
    const worldOffX = viewW / 2 - (WORLD.w / 2) * zoom;
    const worldOffY = viewH / 2 - (WORLD.h / 2) * zoom;
    ctx.setTransform(
      dpr * zoom, 0, 0, dpr * zoom,
      dpr * worldOffX,
      dpr * worldOffY,
    );

    // WORLD SPACE
    drawBackground(ctx, noiseRef.current);
    drawArtworkFromAnchors(ctx, art, SEAM_Y, artImageRef.current);
    drawChairFromAnchors(ctx, chairLayout, SEAM_Y, chairImageRef.current);

    // SCREEN SPACE
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawVignette(ctx, viewW, viewH);
    drawDebugOverlay(ctx, viewW, viewH, zoom, art, chairLayout, showDebug);
  }, [art, chair, showDebug]);

  useEffect(() => {
    if (!imagesLoadedRef.current) {
      Promise.all([
        loadImage(artworkImageSrc),
        loadImage(chairImageSrc),
      ]).then(([artImg, chairImg]) => {
        artImageRef.current = artImg;
        chairImageRef.current = chairImg;
        imagesLoadedRef.current = true;
        render();
      });
    }

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
  }, [render, artworkImageSrc, chairImageSrc]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
