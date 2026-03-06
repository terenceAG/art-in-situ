"use client";

import { useEffect } from "react";
import { loadImage } from "@/lib/in-situ-utils";
import { DEFAULT_ARTWORK_SRC } from "@/lib/in-situ-constants";

export function useArtworkImage(
  artworkImageSrc: string | undefined,
  artImageRef: React.MutableRefObject<HTMLImageElement | null>,
  onLoaded: () => void,
) {
  useEffect(() => {
    const src = artworkImageSrc ?? DEFAULT_ARTWORK_SRC;
    loadImage(src).then((img) => {
      artImageRef.current = img;
      onLoaded();
    });
  }, [artworkImageSrc, artImageRef, onLoaded]);
}
