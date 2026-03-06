"use client";

import { useEffect } from "react";
import { loadImage } from "@/lib/in-situ-utils";
import { DEFAULT_CHAIR_SRC } from "@/lib/in-situ-constants";

export function useChairImage(
  showChair: boolean,
  chairImageSrc: string | undefined,
  chairImageRef: React.MutableRefObject<HTMLImageElement | null>,
  onLoaded: () => void,
) {
  useEffect(() => {
    if (!showChair) {
      chairImageRef.current = null;
      onLoaded();
      return;
    }
    const src = chairImageSrc ?? DEFAULT_CHAIR_SRC;
    loadImage(src).then((img) => {
      chairImageRef.current = img;
      onLoaded();
    });
  }, [showChair, chairImageSrc, chairImageRef, onLoaded]);
}
