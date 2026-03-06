import type { DimensionsCm } from "@/lib/utils";
import {
  WORLD,
  SEAM_Y,
  WALL_COLORS,
  FLOOR_COLORS,
  type ArtworkAnchors,
  type ChairAnchors,
  type WallColors,
  type FloorColors,
  type FloorTextureId,
  type FrameStyleId,
} from "./in-situ-constants";

export function drawBackground(
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

  ctx.save();
  const aoGrad = ctx.createLinearGradient(0, seamY - 30, 0, seamY + 40);
  aoGrad.addColorStop(0, "rgba(0,0,0,0)");
  aoGrad.addColorStop(0.4, "rgba(0,0,0,0.04)");
  aoGrad.addColorStop(0.6, "rgba(0,0,0,0.06)");
  aoGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = aoGrad;
  ctx.fillRect(L, seamY - 30, W, 70);
  ctx.restore();

  const baseboardH = 12;
  const baseboardColor = "#f3f0e9";
  ctx.fillStyle = baseboardColor;
  ctx.fillRect(L, seamY - baseboardH, W, baseboardH);

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(L, seamY - baseboardH, W, 1);

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(L, seamY, W, 1);

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

export function drawArtworkFromAnchors(
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

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    const frameShadowColor =
      frameStyle === "gold-classic" ? "#c8a84b" : frameStyle === "white" ? "#f6f4f0" : frameStyle === "light-oak" ? "#c4a870" : "#2a2e38";
    ctx.fillStyle = frameShadowColor;
    ctx.fillRect(outerX, outerY, outerW, outerH);
    ctx.restore();

    ctx.save();
    const fallbackFrameColor =
      frameStyle === "gold-classic" ? "#a7863d" : frameStyle === "white" ? "#ebe8e2" : frameStyle === "light-oak" ? "#b09560" : "#2a2e38";

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
    const bevelHighlight = ctx.createLinearGradient(0, outerY, 0, outerY + outerH);
    const bevelShadow = ctx.createLinearGradient(0, outerY, 0, outerY + outerH);
    if (frameStyle === "gold-classic") {
      bevelHighlight.addColorStop(0, "rgba(249,238,201,0.26)");
      bevelHighlight.addColorStop(0.45, "rgba(246,232,184,0.07)");
      bevelHighlight.addColorStop(1, "rgba(255,255,255,0)");
      bevelShadow.addColorStop(0, "rgba(0,0,0,0)");
      bevelShadow.addColorStop(0.55, "rgba(74,59,24,0.07)");
      bevelShadow.addColorStop(1, "rgba(58,45,18,0.14)");
    } else if (frameStyle === "white") {
      bevelHighlight.addColorStop(0, "rgba(255,255,255,0.2)");
      bevelHighlight.addColorStop(0.5, "rgba(255,255,255,0.04)");
      bevelHighlight.addColorStop(1, "rgba(255,255,255,0)");
      bevelShadow.addColorStop(0, "rgba(0,0,0,0)");
      bevelShadow.addColorStop(0.7, "rgba(0,0,0,0.02)");
      bevelShadow.addColorStop(1, "rgba(0,0,0,0.04)");
    } else if (frameStyle === "light-oak") {
      bevelHighlight.addColorStop(0, "rgba(255,245,220,0.2)");
      bevelHighlight.addColorStop(0.45, "rgba(255,240,200,0.06)");
      bevelHighlight.addColorStop(1, "rgba(255,255,255,0)");
      bevelShadow.addColorStop(0, "rgba(0,0,0,0)");
      bevelShadow.addColorStop(0.55, "rgba(80,60,30,0.06)");
      bevelShadow.addColorStop(1, "rgba(60,45,20,0.12)");
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

export function drawChairFromAnchors(
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

export function drawDebugOverlay(
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
