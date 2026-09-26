import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API_BASE_URL } from "../../../lib/query/Api";
import { cn } from "../../../design-system/lib/utils";
import { Button } from "../../../components/ui/button";

/** Split out of what used to be one large Marketplace.tsx — kept as
 * a named export here since a custom listing-card body (registered
 * via lib/registries/listingCardRegistry) may import it directly. */

export function ListingImageCarousel({ fileIds }: { fileIds: string[] }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  const validIndices = fileIds
    .map((_, itemIndex) => itemIndex)
    .filter((itemIndex) => !failed.has(itemIndex));

  if (validIndices.length === 0) return null;

  const currentIndex = validIndices.includes(index) ? index : validIndices[0];

  const step = (direction: 1 | -1) => {
    const position = validIndices.indexOf(currentIndex);
    const nextPosition =
      (position + direction + validIndices.length) % validIndices.length;

    setIndex(validIndices[nextPosition]);
  };

  return (
    <div className="group relative overflow-hidden rounded-xl">
      <img
        src={`${API_BASE_URL}/api/document/files/${fileIds[currentIndex]}/raw/`}
        alt=""
        onError={() =>
          setFailed((previous) => new Set(previous).add(currentIndex))
        }
        className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />

      {validIndices.length > 1 && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              step(-1);
            }}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 size-8 -translate-y-1/2 rounded-full bg-black/50 text-white opacity-0 hover:bg-black/70 group-hover:opacity-100"
          >
            <ChevronLeft size={15} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(event) => {
              event.stopPropagation();
              step(1);
            }}
            aria-label="Next image"
            className="absolute right-2 top-1/2 size-8 -translate-y-1/2 rounded-full bg-black/50 text-white opacity-0 hover:bg-black/70 group-hover:opacity-100"
          >
            <ChevronRight size={15} />
          </Button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {validIndices.map((itemIndex) => (
              <button
                key={itemIndex}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIndex(itemIndex);
                }}
                aria-label={`Go to image ${itemIndex + 1}`}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  itemIndex === currentIndex ? "bg-white" : "bg-white/40",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
