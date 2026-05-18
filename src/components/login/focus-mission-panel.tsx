"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";

const LINES = 21;
const BLOCKS = 6;
const SCROLL_DURATION = 32;

// Size hierarchy: center largest, gradually smaller toward edges
const SIZE_BY_DISTANCE = [
  "text-4xl",     // 0 - center
  "text-3xl",     // 1
  "text-2xl",     // 2
  "text-xl",      // 3
  "text-lg",      // 4
  "text-base",    // 5
  "text-sm",      // 6
  "text-xs",      // 7
  "text-[11px]",  // 8
  "text-[10px]",  // 9
  "text-[9px]",   // 10+ - edge smallest
];

function getSizeClass(distanceFromCenter: number): string {
  const idx = Math.min(distanceFromCenter, SIZE_BY_DISTANCE.length - 1);
  return SIZE_BY_DISTANCE[idx] ?? "text-sm";
}

export function FocusMissionPanel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [centerLineId, setCenterLineId] = useState<string | null>(null);
  const lastCenterRef = useRef<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        y: "-16.666%",
        duration: SCROLL_DURATION,
        repeat: -1,
        ease: "none",
        force3D: true,
      });
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const content = scrollRef.current;
    if (!container || !content) return;

    const updateCenterLine = () => {
      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      let closestId: string | null = null;
      let closestDist = Infinity;

      const lineEls = content.querySelectorAll<HTMLElement>("[data-line-id]");
      for (const line of lineEls) {
        const rect = line.getBoundingClientRect();
        const lineCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(lineCenterY - centerY);
        if (rect.top <= centerY && centerY <= rect.bottom && dist < closestDist) {
          closestDist = dist;
          closestId = line.getAttribute("data-line-id");
        }
      }

      const last = lastCenterRef.current;
      if (closestId !== last) {
        lastCenterRef.current = closestId;
        setCenterLineId(closestId);
      }
    };

    const id = gsap.ticker.add(updateCenterLine);
    return () => gsap.ticker.remove(id);
  }, []);

  const Line = ({ blockIndex, index }: { blockIndex: number; index: number }) => {
    const lineId = `${blockIndex}-${index}`;
    const isCenter = centerLineId === lineId;
    const centerIdx = Math.floor(LINES / 2);
    const distanceFromCenter = Math.abs(index - centerIdx);
    const sizeClass = getSizeClass(distanceFromCenter);

    return (
      <span
        data-line-id={lineId}
        className={`font-montserrat font-black tracking-[0.1em] uppercase transition-[color,opacity] duration-300 ease-out shrink-0 ${
          isCenter ? "text-sidebar-primary italic" : "text-muted-foreground/40"
        } ${sizeClass}`}
      >
        FOCUS ON THE MISSION
      </span>
    );
  };

  const Block = ({ blockIndex }: { blockIndex: number }) => (
    <div className="flex flex-col items-center justify-center gap-4 shrink-0">
      {Array.from({ length: LINES }).map((_, i) => (
        <Line key={`${blockIndex}-${i}`} blockIndex={blockIndex} index={i} />
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative hidden min-h-full overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center bg-sidebar"
    >
      {/* Scrolling content */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none overflow-hidden flex flex-col items-center justify-start"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 5%, rgba(0,0,0,0.4) 12%, rgba(0,0,0,0.7) 18%, black 25%, black 75%, rgba(0,0,0,0.7) 82%, rgba(0,0,0,0.4) 88%, rgba(0,0,0,0.15) 95%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 5%, rgba(0,0,0,0.4) 12%, rgba(0,0,0,0.7) 18%, black 25%, black 75%, rgba(0,0,0,0.7) 82%, rgba(0,0,0,0.4) 88%, rgba(0,0,0,0.15) 95%, transparent 100%)",
        }}
      >
        <div
          ref={scrollRef}
          className="flex flex-col items-center shrink-0 gap-4 pt-[8vh]"
        >
          {Array.from({ length: BLOCKS }).map((_, blockIdx) => (
            <Block key={blockIdx} blockIndex={blockIdx} />
          ))}
        </div>
      </div>
      {/* Top edge - gradient fade */}
      <div
        className="absolute top-0 left-0 right-0 h-40 z-[2] pointer-events-none"
        aria-hidden
        style={{
          background: "linear-gradient(to bottom, var(--sidebar) 0%, var(--sidebar) 8%, color-mix(in oklch, var(--sidebar) 90%, transparent) 22%, color-mix(in oklch, var(--sidebar) 60%, transparent) 45%, transparent 100%)",
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(1px)",
        }}
      />
      {/* Bottom edge - mirrored gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 z-[2] pointer-events-none"
        aria-hidden
        style={{
          background: "linear-gradient(to top, var(--sidebar) 0%, var(--sidebar) 8%, color-mix(in oklch, var(--sidebar) 90%, transparent) 22%, color-mix(in oklch, var(--sidebar) 60%, transparent) 45%, transparent 100%)",
          backdropFilter: "blur(1px)",
          WebkitBackdropFilter: "blur(1px)",
        }}
      />
    </div>
  );
}
