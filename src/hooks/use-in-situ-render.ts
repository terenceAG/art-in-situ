"use client";

import { useCallback } from "react";
import type { RefObject } from "react";
import type { DimensionsCm } from "@/lib/utils";
import {
  WORLD,
  SEAM_Y,
  WALL_COLORS,
  DEFAULT_ART,
  DEFAULT_CHAIR,
  CHAIR_GAP_RIGHT_OF_ART,
  CM_TO_WORLD,
  ART_ZOOM_FACTOR_MIN,
  W_DESKTOP,
  MOBILE_ART_WIDTH_RATIO,
  type ArtworkAnchors,
  type ChairAnchors,
  type WallColors,
  type FloorColors,
  type FloorTextureId,
  type FrameStyleId,
} from "@/lib/in-situ-constants";
import {
  getBottomGapForArtHeight,
  getSeamYForDimensions,
  dimensionsCmToWorldSize,
  getArtZoomFactor,
  lerp,
  smoothstep,
} from "@/lib/in-situ-math";
import { createNoiseTexture } from "@/lib/in-situ-patterns";
import {
  drawBackground,
  drawArtworkFromAnchors,
  drawChairFromAnchors,
  drawDebugOverlay,
} from "@/lib/in-situ-drawing";

const W_MOBILE = 380;
const W_TABLET = 768;

export interface UseInSituRenderParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  noiseRef: RefObject<HTMLCanvasElement | null>;
  artImageRef: RefObject<HTMLImageElement | null>;
  chairImageRef: RefObject<HTMLImageElement | null>;
  floorPatternCanvas: HTMLCanvasElement | null;
  framePatternCanvas: HTMLCanvasElement | null;
  showDebug: boolean;
  showChair: boolean;
  dimensionsCm: DimensionsCm | null;
  wallColors: WallColors | null;
  floorColors: FloorColors | null;
  floorTexture: FloorTextureId;
  frameStyle: FrameStyleId;
  frameWidthCm: number;
  artworkAnchors?: Partial<ArtworkAnchors>;
  chairAnchors?: Partial<ChairAnchors>;
}

export function useInSituRender(params: UseInSituRenderParams): () => void {
  const {
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
  } = params;

  return useCallback(() => {
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

    const seamY = getSeamYForDimensions(dimensionsCm);

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
    drawBackground(ctx, noiseRef.current!, pad, seamY, wallColors, floorColors, floorTexture, floorPatternCanvas);
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
    canvasRef,
    noiseRef,
    artImageRef,
    chairImageRef,
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
}
