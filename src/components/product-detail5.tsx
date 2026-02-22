"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { cn, parseDimensionsString } from "@/lib/utils";

import { Mail, Eye } from "lucide-react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { InSituModal } from "@/components/in-situ-modal";

const ARTWORK_DETAILS = {
  id: "1",
  title: "Untitled (Mountain Landscape)",
  artist: "Jane Smith",
  year: "2023",
  medium: "Oil on canvas",
  dimensions: "96 × 80 cm",
  imageUrl: "/assets/images/testArtwork.webp",
  description:
    "A large-scale meditation on light and form in the high desert. The work was made in situ over three seasons, responding directly to the shifting conditions of the site. It forms part of the artist’s ongoing series examining the boundary between landscape and abstraction.",
  location: "Building A, Level 2",
};

interface ArtworkDetail5Props {
  className?: string;
}

const ArtworkDetail5 = ({ className }: ArtworkDetail5Props) => {
  const [inSituOpen, setInSituOpen] = useState(false);

  const dimensionsCm = useMemo(
    () => parseDimensionsString(ARTWORK_DETAILS.dimensions),
    [],
  );

  return (
    <>
      <section className={cn("py-32", className)}>
        <div className="mx-auto w-full max-w-[93.75rem] lg:px-12">
          <div className="relative grid w-full grid-cols-1 justify-between gap-2.5 lg:grid-cols-2 lg:gap-15.5">
            <div className="top-5 self-start lg:sticky">
              <ArtworkImagePreview />
            </div>
            <div className="justify-self-center">
              <div className="flex max-w-150 flex-col gap-6 px-4 lg:max-w-full lg:px-0">
                <h1 className="text-3xl leading-tight font-light uppercase lg:text-4xl">
                  {ARTWORK_DETAILS.title}
                </h1>
                <p className="text-lg font-light text-muted-foreground">
                  {ARTWORK_DETAILS.artist}
                </p>
                <Separator />
                <ArtworkMeta
                  year={ARTWORK_DETAILS.year}
                  medium={ARTWORK_DETAILS.medium}
                  dimensions={ARTWORK_DETAILS.dimensions}
                  location={ARTWORK_DETAILS.location}
                />
                <p className="text-muted-foreground">
                  {ARTWORK_DETAILS.description}
                </p>
                <div className="flex flex-col gap-2.5 pt-2">
                  <Button variant="iconBtn" size="lg">
                    <Mail className="size-4" strokeWidth={1.5} />
                    Inquire
                  </Button>
                  <Button
                    variant="iconBtn"
                    size="lg"
                    onClick={() => setInSituOpen(true)}
                  >
                    <Eye className="size-4" strokeWidth={1.5} />
                    View in situ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InSituModal
        open={inSituOpen}
        onOpenChange={setInSituOpen}
        dimensionsCm={dimensionsCm ?? undefined}
        artworkImageUrl={ARTWORK_DETAILS.imageUrl}
        artworkTitle={ARTWORK_DETAILS.title}
      />
    </>
  );
};

const ArtworkImagePreview = () => (
  <div className="w-full">
    <AspectRatio
      ratio={1}
      className="w-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: "#fafafa" }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[85%] h-[85%] drop-shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
          <Image
            src={ARTWORK_DETAILS.imageUrl}
            alt={ARTWORK_DETAILS.title}
            fill
            className="object-contain object-center"
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
          />
        </div>
      </div>
    </AspectRatio>
  </div>
);

interface ArtworkMetaProps {
  year: string;
  medium: string;
  dimensions: string;
  location?: string;
}

const ArtworkMeta = ({
  year,
  medium,
  dimensions,
  location,
}: ArtworkMetaProps) => (
  <dl className="grid grid-cols-1 gap-2 text-sm">
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <dt className="font-light text-muted-foreground">Year</dt>
      <dd className="text-right">{year}</dd>
    </div>
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <dt className="font-light text-muted-foreground">Medium</dt>
      <dd className="text-right">{medium}</dd>
    </div>
    <div className="flex justify-between gap-4 border-b border-border pb-2">
      <dt className="font-light text-muted-foreground">Dimensions</dt>
      <dd className="text-right">{dimensions}</dd>
    </div>
    {location && (
      <div className="flex justify-between gap-4 border-b border-border pb-2">
        <dt className="font-light text-muted-foreground">Location</dt>
        <dd className="text-right">{location}</dd>
      </div>
    )}
  </dl>
);

export default ArtworkDetail5;
