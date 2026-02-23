"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { cn, parseDimensionsString, type DimensionsCm } from "@/lib/utils";

import { Mail, Eye, Settings, Ban } from "lucide-react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { InSituModal } from "@/components/in-situ-modal";

const ARTWORK_SIZE_PRESETS: { label: string; dimensionsCm: DimensionsCm }[] = [
  { label: "48×40", dimensionsCm: { widthCm: 48, heightCm: 40 } },
  { label: "96×80", dimensionsCm: { widthCm: 96, heightCm: 80 } },
  { label: "100×80", dimensionsCm: { widthCm: 100, heightCm: 80 } },
  { label: "120×100", dimensionsCm: { widthCm: 120, heightCm: 100 } },
  { label: "150×120", dimensionsCm: { widthCm: 150, heightCm: 120 } },
  { label: "263×325", dimensionsCm: { widthCm: 263, heightCm: 325 } },
  { label: "300×400", dimensionsCm: { widthCm: 300, heightCm: 400 } },
  { label: "400×500", dimensionsCm: { widthCm: 400, heightCm: 500 } },
  { label: "500×400", dimensionsCm: { widthCm: 500, heightCm: 400 } },
  { label: "400×300", dimensionsCm: { widthCm: 400, heightCm: 300 } },
  { label: "300×200", dimensionsCm: { widthCm: 300, heightCm: 200 } },
];

interface WallColorPreset {
  id: string;
  label: string;
  top: string;
  bottom: string;
}
interface FloorColorPreset {
  id: string;
  label: string;
  top: string;
  bottom: string;
}

const WALL_COLOR_PRESETS: WallColorPreset[] = [
  { id: "warm-white", label: "Warm white", top: "#f8f7f6", bottom: "#f2f0ed" },
  { id: "cream", label: "Cream", top: "#f5f0e8", bottom: "#ebe4d9" },
  { id: "slate", label: "Slate", top: "#8b9298", bottom: "#6b7278" },
];

const FLOOR_COLOR_PRESETS: FloorColorPreset[] = [
  { id: "warm-gray", label: "Warm grey", top: "#b8b5b0", bottom: "#9a9792" },
  { id: "cool-gray", label: "Cool grey", top: "#a8a8a8", bottom: "#888888" },
  { id: "charcoal", label: "Charcoal", top: "#5a5a5a", bottom: "#3a3a3a" },
];

const CHAIR_OPTIONS: { id: string; label: string; src?: string }[] = [
  { id: "chair", label: "Chair 1", src: "/assets/images/chair.png" },
  { id: "chair2", label: "Chair 2", src: "/assets/images/chair2.png" },
  { id: "chair4", label: "Chair 4", src: "/assets/images/chair4.png" },
  { id: "none", label: "No chair" },
];

const ARTWORK_DETAILS = {
  id: "1",
  title: "Untitled (Mountain Landscape)",
  artist: "Jane Smith",
  year: "2023",
  medium: "Oil on canvas",
  dimensions: "96 × 80 cm",
  imageUrl: "/assets/images/testArtwork.webp",
  description:
    "A large-scale meditation on light and form in the high desert. The work was made in situ over three seasons, responding directly to the shifting conditions of the site.",
};

interface ArtworkDetail5Props {
  className?: string;
}

const ArtworkDetail5 = ({ className }: ArtworkDetail5Props) => {
  const [inSituOpen, setInSituOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedSizeKey, setSelectedSizeKey] = useState<string>("product");
  const [selectedWallPresetId, setSelectedWallPresetId] = useState<string>(
    WALL_COLOR_PRESETS[0].id,
  );
  const [selectedFloorPresetId, setSelectedFloorPresetId] = useState<string>(
    FLOOR_COLOR_PRESETS[0].id,
  );
  const [selectedChairId, setSelectedChairId] = useState<string>(
    CHAIR_OPTIONS[0].id,
  );

  const dimensionsCm = useMemo(
    () => parseDimensionsString(ARTWORK_DETAILS.dimensions),
    [],
  );

  const inSituDimensionsCm =
    selectedSizeKey === "product"
      ? dimensionsCm
      : ARTWORK_SIZE_PRESETS.find((p) => p.label === selectedSizeKey)
          ?.dimensionsCm ?? dimensionsCm;

  const inSituWallColors = WALL_COLOR_PRESETS.find(
    (p) => p.id === selectedWallPresetId,
  ) ?? { top: WALL_COLOR_PRESETS[0].top, bottom: WALL_COLOR_PRESETS[0].bottom };
  const inSituFloorColors = FLOOR_COLOR_PRESETS.find(
    (p) => p.id === selectedFloorPresetId,
  ) ?? { top: FLOOR_COLOR_PRESETS[0].top, bottom: FLOOR_COLOR_PRESETS[0].bottom };
  const showChair = selectedChairId !== "none";
  const inSituChairSrc = showChair
    ? CHAIR_OPTIONS.find((c) => c.id === selectedChairId)?.src ?? CHAIR_OPTIONS[0].src
    : undefined;

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
                />
                <p className="text-muted-foreground">
                  {ARTWORK_DETAILS.description}
                </p>
                <div className="flex flex-col gap-2.5 pt-2">

                  <Button variant="iconBtn" size="sm">
                    <Mail className="size-5" strokeWidth={1} />
                    Inquire about this artwork
                  </Button>

                  <Button
                    variant="iconBtn"
                    size="sm"
                    onClick={() => setInSituOpen(true)}
                  >
                    <Eye className="size-5" strokeWidth={1} />
                    View in situ
                  </Button>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg transition-colors hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Open preview settings"
      >
        <Settings className="size-4" aria-hidden />
        Settings
      </button>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogTitle className="sr-only">Preview settings</DialogTitle>
          <div className="flex flex-col gap-4 pt-2">
            <label htmlFor="artwork-size" className="text-sm font-medium">
              Artwork Size
            </label>
            <select
              id="artwork-size"
              value={selectedSizeKey}
              onChange={(e) => setSelectedSizeKey(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="product">
                Product size ({ARTWORK_DETAILS.dimensions})
              </option>
              {ARTWORK_SIZE_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </select>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Wall colour</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Wall colour presets">
                {WALL_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedWallPresetId(preset.id)}
                    title={preset.label}
                    aria-label={preset.label}
                    aria-pressed={selectedWallPresetId === preset.id}
                    className={cn(
                      "size-10 shrink-0 rounded-md border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      selectedWallPresetId === preset.id
                        ? "border-foreground ring-2 ring-foreground/20"
                        : "border-transparent hover:border-muted-foreground/30",
                    )}
                    style={{
                      background: `linear-gradient(to bottom, ${preset.top}, ${preset.bottom})`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Floor colour</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Floor colour presets">
                {FLOOR_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedFloorPresetId(preset.id)}
                    title={preset.label}
                    aria-label={preset.label}
                    aria-pressed={selectedFloorPresetId === preset.id}
                    className={cn(
                      "size-10 shrink-0 rounded-md border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      selectedFloorPresetId === preset.id
                        ? "border-foreground ring-2 ring-foreground/20"
                        : "border-transparent hover:border-muted-foreground/30",
                    )}
                    style={{
                      background: `linear-gradient(to bottom, ${preset.top}, ${preset.bottom})`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Chair</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Chair options">
                {CHAIR_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedChairId(option.id)}
                    title={option.label}
                    aria-label={option.label}
                    aria-pressed={selectedChairId === option.id}
                    className={cn(
                      "size-10 shrink-0 overflow-hidden rounded-md border-2 bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center",
                      selectedChairId === option.id
                        ? "border-foreground ring-2 ring-foreground/20"
                        : "border-transparent hover:border-muted-foreground/30",
                    )}
                  >
                    {option.id === "none" ? (
                      <Ban className="h-5 w-5 shrink-0 text-gray-400" />
                    ) : (
                      option.src && (
                        <Image
                          src={option.src}
                          alt=""
                          className="h-full w-full object-contain"
                          width={40}
                          height={40}
                        />
                      )
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <InSituModal
        open={inSituOpen}
        onOpenChange={setInSituOpen}
        dimensionsCm={inSituDimensionsCm ?? undefined}
        artworkImageUrl={ARTWORK_DETAILS.imageUrl}
        wallColors={inSituWallColors}
        floorColors={inSituFloorColors}
        showChair={showChair}
        chairImageSrc={inSituChairSrc}
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
}

const ArtworkMeta = ({
  year,
  medium,
  dimensions,
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
  </dl>
);

export default ArtworkDetail5;
