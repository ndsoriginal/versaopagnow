"use client";

import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

const COMMON_EXTS = ["webp", "png", "jpg", "jpeg", "svg"];
const MAX_CHECK = 12; // fallback probing range

export default function FeaturedBanner() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: true }, [Autoplay({ delay: 5000 })]);
  const [banners, setBanners] = React.useState<string[]>(["/placeholder.svg"]);
  const mountedRef = React.useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;

    // First: try to load exactly 3 images: 1,2,3 with common extensions
    const tryThree: Promise<string | null>[] = [];
    for (let i = 1; i <= 3; i++) {
      tryThree.push(
        new Promise((resolve) => {
          let resolved = false;
          COMMON_EXTS.forEach((ext) => {
            const path = `/carrossel/${i}.${ext}`;
            const img = new Image();
            img.onload = () => {
              if (!resolved) {
                resolved = true;
                resolve(path);
              }
            };
            img.onerror = () => {
              // do nothing here; if none load we'll resolve null later
            };
            img.src = path;
          });
          // safety: after short delay, if none loaded resolve null
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(null);
            }
          }, 600);
        }),
      );
    }

    Promise.all(tryThree).then((results) => {
      if (!mountedRef.current) return;
      const found = results.filter((r): r is string => !!r);
      if (found.length > 0) {
        // Use whatever of the 3 we found (in order)
        setBanners(found);
        return;
      }

      // Fallback: probe a wider range (1..MAX_CHECK) with common extensions like before
      const discovered = new Set<string>();
      const probes: Promise<void>[] = [];
      for (let i = 1; i <= MAX_CHECK; i++) {
        for (const ext of COMMON_EXTS) {
          const path = `/carrossel/${i}.${ext}`;
          const p = new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              if (!discovered.has(path)) {
                discovered.add(path);
                if (mountedRef.current) {
                  setBanners((prev) => {
                    const next = [...prev];
                    if (next.length === 1 && next[0] === "/placeholder.svg") next.shift();
                    next.push(path);
                    return next;
                  });
                }
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = path;
          });
          probes.push(p);
        }
      }

      Promise.all(probes).then(() => {
        if (!mountedRef.current) return;
        if (discovered.size === 0) {
          setBanners(["/placeholder.svg"]);
        }
      });
    });

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-[#0d0f14] shadow-lg"
      ref={emblaRef as unknown as React.RefObject<HTMLDivElement>}
    >
      <div className="flex touch-pan-y cursor-grab active:cursor-grabbing">
        {banners.map((src, idx) => (
          <div key={idx} className="relative min-w-full flex-[0_0_100%] select-none">
            <img
              src={src}
              alt={`Banner ${idx + 1}`}
              className="h-[220px] w-full object-cover md:h-[320px] lg:h-[420px]"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06070a]/50 to-transparent pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => emblaApi && emblaApi.scrollTo(i)}
              className="h-1 w-8 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
            />
          ))}
        </div>
      )}
    </div>
  );
}