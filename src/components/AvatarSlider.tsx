"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Character-select slider (video-game style).
 *
 * - Large centered image with ◀ ▶ arrows on the sides.
 * - Dots below to jump / show position.
 * - Arrow keys (← →) and touch swipe.
 * - Fully responsive.
 */

export type AvatarOption = { id: string; label: string; src: string };

interface AvatarSliderProps {
  options: AvatarOption[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function AvatarSlider({ options, selected, onSelect }: AvatarSliderProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Keep the index in sync with the selected value across steps.
  useEffect(() => {
    if (selected) {
      const i = options.findIndex((o) => o.id === selected);
      if (i >= 0) setIndex(i);
    }
  }, [selected, options]);

  const current = options[index];
  const hasPrev = index > 0;
  const hasNext = index < options.length - 1;

  const go = (i: number) => {
    const clamped = Math.max(0, Math.min(options.length - 1, i));
    setIndex(clamped);
    if (options[clamped]) onSelect(options[clamped].id);
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(index - 1);
      if (e.key === "ArrowRight") go(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, options]);

  return (
    <div className="select-none">
      {/* Main stage */}
      <div
        className="relative mx-auto w-full max-w-xs sm:max-w-sm"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 40) {
            go(index + (dx < 0 ? 1 : -1));
          }
          touchStartX.current = null;
        }}
      >
        {/* Left arrow */}
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={!hasPrev}
          aria-label="Previous avatar"
          className={`absolute left-0 top-1/2 z-10 -translate-y-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/60 p-2.5 text-white backdrop-blur transition ${
            hasPrev ? "hover:bg-black/80 hover:scale-110 active:scale-95" : "opacity-30"
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Center image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl shadow-blue-900/30">
          {current && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.id}
              src={current.src}
              alt={current.label}
              className="h-full w-full object-contain"
            />
          )}

          {/* Counter badge */}
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {index + 1} / {options.length}
          </span>
        </div>

        {/* Right arrow */}
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={!hasNext}
          aria-label="Next avatar"
          className={`absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2 rounded-full border border-white/15 bg-black/60 p-2.5 text-white backdrop-blur transition ${
            hasNext ? "hover:bg-black/80 hover:scale-110 active:scale-95" : "opacity-30"
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      {/* Label */}
      <p className="mt-4 text-center text-lg font-semibold">
        {current ? current.label : ""}
      </p>

      {/* Dots */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 px-8">
        {options.map((o, i) => (
          <button
            key={o.id}
            type="button"
            onClick={() => go(i)}
            aria-label={o.label}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-5 bg-blue-400" : "w-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
