// World / layout
export const WORLD = { w: 1600, h: 900 } as const;
export const SEAM_Y = 720;

// Colors for the wall and floor
export const WALL_COLORS = {
  top: "#f8f7f6",
  bottom: "#f2f0ed",
} as const;

export const FLOOR_COLORS = {
  top: "#d2d0cc",
  bottom: "#bdbab6",
} as const;

// Default image paths for the artwork and chair
export const DEFAULT_ARTWORK_SRC = "/assets/images/testArtwork.webp";
export const DEFAULT_CHAIR_SRC = "/assets/images/chair2.png";

// Anchor points for the artwork and chair
export interface ArtworkAnchors {
  cx: number;
  w: number;
  h: number;
  bottomGap: number;
}

export interface ChairAnchors {
  cx: number;
  w: number;
  h: number;
  floorOffset: number;
}

export const DEFAULT_ART: ArtworkAnchors = {
  cx: WORLD.w * 0.5,
  w: 414,
  h: 345,
  bottomGap: 280,
};

export const DEFAULT_CHAIR: ChairAnchors = {
  cx: WORLD.w * 0.5 + 414 / 2 + 200,
  w: 460,
  h: 430,
  floorOffset: 100,
};

export const REF_ART_CM = { w: 96, h: 80 } as const;
export const REF_ART_WORLD = { w: 414, h: 345 } as const;
export const REF_LONG_EDGE_CM = Math.max(REF_ART_CM.w, REF_ART_CM.h);
export const CHAIR_GAP_RIGHT_OF_ART = 200;

export const ART_ZOOM_FACTOR_MIN = 0.32;
export const ART_ZOOM_FACTOR_MAX = 1.12;

export const BOTTOM_GAP_REF = 280;
export const BOTTOM_GAP_MIN = 100;
export const BOTTOM_GAP_SMALL_ART = 190;
export const BOTTOM_GAP_HEIGHT_FACTOR = 0.6;
export const W_DESKTOP = 1400;
export const MOBILE_ART_WIDTH_RATIO = 0.9;
export const FRAME_WIDTH_DEFAULT_CM = 2;
export const CM_TO_WORLD = REF_ART_WORLD.w / REF_ART_CM.w;

export interface WallColors {
  top: string;
  bottom: string;
}

export interface FloorColors {
  top: string;
  bottom: string;
}

export type FloorTextureId = "none" | "wood-planks" | "polished-concrete";
export type FrameStyleId = "none" | "gold-classic" | "black-modern" | "white" | "light-oak";
