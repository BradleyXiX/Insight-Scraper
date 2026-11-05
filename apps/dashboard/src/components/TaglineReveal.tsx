"use client";

import React, { useEffect, useRef, useState } from "react";

export interface TaglineRevealProps {
  lines: string[];
}

export function TaglineReveal({ lines }: TaglineRevealProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndices, setActiveIndices] = useState<Set<number>>(new Set());

  // Flatten lines into a word array with line break tracking
  const wordsWithMeta = lines.flatMap((line, lineIdx) => {
    const words = line.trim().split(/\s+/);
    return words.map((word, wordIdx) => ({
      word,
      lineIdx,
      isLastInLine: wordIdx === words.length - 1,
    }));
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Under reduced motion, reveal all words immediately
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActiveIndices(new Set(wordsWithMeta.map((_, i) => i)));
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const wordElements = container.querySelectorAll<HTMLElement>("[data-word-idx]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idxStr = entry.target.getAttribute("data-word-idx");
            if (idxStr !== null) {
              const idx = parseInt(idxStr, 10);
              setActiveIndices((prev) => {
                if (prev.has(idx)) return prev;
                const next = new Set(prev);
                next.add(idx);
                return next;
              });
            }
          }
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.6,
      }
    );

    wordElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [wordsWithMeta.length]);

  return (
    <div ref={containerRef} className="py-24 px-6 max-w-5xl mx-auto text-center select-none">
      <div className="space-y-4">
        {lines.map((line, lineIdx) => {
          const lineWords = wordsWithMeta.filter((w) => w.lineIdx === lineIdx);
          const startIndex = wordsWithMeta.findIndex((w) => w.lineIdx === lineIdx);

          return (
            <p
              key={lineIdx}
              className="text-2xl sm:text-4xl md:text-5xl font-semibold leading-snug tracking-tight"
            >
              {lineWords.map((item, localIdx) => {
                const globalIdx = startIndex + localIdx;
                const isActive = activeIndices.has(globalIdx);

                return (
                  <span
                    key={localIdx}
                    data-word-idx={globalIdx}
                    className="inline-block mr-2 sm:mr-3 transition-opacity"
                    style={{
                      opacity: isActive ? 1 : 0.3,
                      color: isActive ? "var(--color-foreground)" : "var(--color-foreground)",
                      transition:
                        "opacity 300ms cubic-bezier(0.22, 1, 0.36, 1), color 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    {item.word}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
    </div>
  );
}

export default TaglineReveal;

