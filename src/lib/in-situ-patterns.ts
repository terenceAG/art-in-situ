import { rand, tiledNoise } from "./in-situ-math";

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

export function makeRealWoodPlankPattern({
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

export function makePolishedConcretePattern({
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
  base.addColorStop(0, "hsl(48, 62.90%, 56.70%)");
  base.addColorStop(0.22, "hsl(45, 67.20%, 49.00%)");
  base.addColorStop(0.5, "hsl(42, 83.60%, 38.20%)");
  base.addColorStop(0.78, "hsl(46, 55.70%, 50.40%)");
  base.addColorStop(1, "hsl(48, 55.50%, 55.10%)");
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

export function makeWhiteFramePattern(tileSize: number = 320, seed: number = 4042): HTMLCanvasElement {
  const p = document.createElement("canvas");
  const size = Math.max(192, tileSize);
  p.width = size;
  p.height = size;
  const g = p.getContext("2d")!;
  const w = p.width;
  const h = p.height;

  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "hsl(45, 10%, 98%)");
  base.addColorStop(0.4, "hsl(42, 8%, 95%)");
  base.addColorStop(1, "hsl(40, 10%, 92%)");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const cloudSeed = (seed + 2222) | 0;
  const grainSeed = (seed + 6666) | 0;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const cloud = tiledNoise(px * 0.15, py * 0.15, w * 0.15, h * 0.15, cloudSeed);
      const grain = tiledNoise(px * 2.5, py * 2.5, w * 2.5, h * 2.5, grainSeed);
      const delta = Math.min(12, cloud * 3 + grain * 2);
      d[i] = Math.max(0, Math.min(255, d[i] + delta));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + delta));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + delta));
    }
  }
  g.putImageData(img, 0, 0);

  return p;
}

export function makeLightOakFramePattern(tileSize: number = 320, seed: number = 5053): HTMLCanvasElement {
  const p = document.createElement("canvas");
  const size = Math.max(192, tileSize);
  p.width = size;
  p.height = size;
  const g = p.getContext("2d")!;
  const w = p.width;
  const h = p.height;

  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "hsl(35, 38%, 78%)");
  base.addColorStop(0.3, "hsl(33, 35%, 72%)");
  base.addColorStop(0.6, "hsl(30, 32%, 66%)");
  base.addColorStop(1, "hsl(34, 36%, 74%)");
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);

  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const grainSeed = (seed + 1111) | 0;
  const poreSeed = (seed + 3333) | 0;
  const streakSeed = (seed + 5555) | 0;
  const cloudSeed = (seed + 7777) | 0;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      const grain = tiledNoise(px * 0.3 + py * 2.8, py * 2.8, w * 0.3, h * 2.8, grainSeed);
      const pore = tiledNoise(px * 0.2 + py * 4.5, py * 4.5, w * 0.2, h * 4.5, poreSeed);
      const streak = tiledNoise(px * 0.08 + py * 1.2, py * 1.2, w * 0.08, h * 1.2, streakSeed);
      const cloud = tiledNoise(px * 0.12, py * 0.12, w * 0.12, h * 0.12, cloudSeed);
      let delta = grain * 10 + streak * 8 + cloud * 5;
      if (pore < -0.3) delta -= 8 + (-0.3 - pore) * 20;
      d[i] = Math.max(0, Math.min(255, d[i] + delta));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + delta * 0.88));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + delta * 0.55));
    }
  }
  g.putImageData(img, 0, 0);

  const streakCount = 40;
  for (let i = 0; i < streakCount; i++) {
    const rr = rand((seed * 6131 + i * 2311) | 0);
    const x = rr * w;
    g.strokeStyle = `rgba(160,130,80,${0.03 + rr * 0.04})`;
    g.lineWidth = 0.4 + rr * 0.6;
    g.beginPath();
    g.moveTo(x + (rr - 0.5) * 4, -5);
    g.lineTo(x + (rr - 0.5) * 8, h + 5);
    g.stroke();
  }

  return p;
}

export function makeFramePreviewLShape(
  style: "gold-classic" | "black-modern" | "white" | "light-oak",
  boxSize: number = 80,
): string {
  const fw = Math.max(10, Math.round(boxSize * 0.18));
  const canvas = document.createElement("canvas");
  canvas.width = boxSize;
  canvas.height = boxSize;
  const ctx = canvas.getContext("2d")!;

  const tile =
    style === "gold-classic"
      ? makeGoldClassicFramePattern(128, 2026)
      : style === "black-modern"
        ? makeBlackModernFramePattern(320, 3031)
        : style === "light-oak"
          ? makeLightOakFramePattern(320, 5053)
          : makeWhiteFramePattern(320, 4042);
  const pattern = ctx.createPattern(tile, "repeat")!;

  const baseColor =
    style === "gold-classic"
      ? "#c8a84b"
      : style === "black-modern"
        ? "#2a2e38"
        : style === "light-oak"
          ? "#c4a870"
          : "#f6f4f0";
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
  } else if (style === "white") {
    bevelHighlight.addColorStop(0, "rgba(255,255,255,0.2)");
    bevelHighlight.addColorStop(0.5, "rgba(255,255,255,0.04)");
    bevelHighlight.addColorStop(1, "rgba(255,255,255,0)");
    bevelShadow.addColorStop(0, "rgba(0,0,0,0)");
    bevelShadow.addColorStop(0.7, "rgba(0,0,0,0.02)");
    bevelShadow.addColorStop(1, "rgba(0,0,0,0.04)");
  } else if (style === "light-oak") {
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
  ctx.fillRect(0, 0, boxSize, boxSize);
  ctx.fillStyle = bevelShadow;
  ctx.fillRect(0, 0, boxSize, boxSize);
  ctx.restore();

  if (style === "white") {
    ctx.strokeStyle = "rgba(0,0,0,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(boxSize, 0);
    ctx.lineTo(boxSize, fw);
    ctx.lineTo(fw, fw);
    ctx.lineTo(fw, boxSize);
    ctx.lineTo(0, boxSize);
    ctx.closePath();
    ctx.stroke();
  }

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
export function createNoiseTexture(size: number = 256): HTMLCanvasElement {
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
