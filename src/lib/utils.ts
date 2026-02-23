import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface DimensionsCm {
  widthCm: number;
  heightCm: number;
}

export function parseDimensionsString(str: string | undefined): DimensionsCm | null {
  if (!str || typeof str !== "string") return null;
  const trimmed = str.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*cm$/i);
  if (!match) return null;
  const widthCm = parseFloat(match[1]);
  const heightCm = parseFloat(match[2]);
  if (Number.isNaN(widthCm) || Number.isNaN(heightCm) || widthCm <= 0 || heightCm <= 0)
    return null;
  return { widthCm, heightCm };
}
