"use client";

import React, { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export interface NetworkCanvasProps {
  variant?: "hero" | "section";
  className?: string;
}

type RgbTuple = readonly [number, number, number];

interface NetworkNode {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  phase: number;
  isBokeh: boolean;
}

interface ProjectedNode {
  sx: number;
  sy: number;
  z: number;
  scale: number;
  radius: number;
  alpha: number;
  isBokeh: boolean;
}

const DEFAULT_ACCENT: RgbTuple = [24, 169, 194];
const DEFAULT_FOREGROUND: RgbTuple = [250, 250, 250];

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseColorRgb(raw: string, fallback: RgbTuple): RgbTuple {
  const value = raw.trim();
  if (!value) return fallback;

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 6) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return [r, g, b];
      }
    } else if (hex.length === 3) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return [r, g, b];
      }
    }
    return fallback;
  }

  const rgbMatch = value.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgbMatch) {
    const r = Math.round(Number.parseFloat(rgbMatch[1]));
    const g = Math.round(Number.parseFloat(rgbMatch[2]));
    const b = Math.round(Number.parseFloat(rgbMatch[3]));
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [r, g, b];
    }
  }

  return fallback;
}

function readThemeColors(): { accent: RgbTuple; foreground: RgbTuple } {
  const styles = getComputedStyle(document.documentElement);
  return {
    accent: parseColorRgb(styles.getPropertyValue("--color-accent"), DEFAULT_ACCENT),
    foreground: parseColorRgb(styles.getPropertyValue("--color-foreground"), DEFAULT_FOREGROUND),
  };
}

function rgba(rgb: RgbTuple, alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(4)})`;
}

function buildNodes(variant: "hero" | "section", isDesktop: boolean): NetworkNode[] {
  const count =
    variant === "hero" ? (isDesktop ? 56 : 28) : isDesktop ? 36 : 18;
  const bokehCount = Math.max(3, Math.round(count * 0.15));
  const seed = (variant === "hero" ? 4109 : 8821) + (isDesktop ? 17 : 3);
  const rand = createSeededRandom(seed);
  const nodes: NetworkNode[] = [];

  for (let i = 0; i < count; i++) {
    const isBokeh = i < bokehCount;
    let x: number;
    if (variant === "hero" && isDesktop) {
      // Bias density gently toward the open right half so the headline stays uncluttered.
      x = rand() < 0.65 ? 0.38 + rand() * 0.72 : -0.06 + rand() * 0.5;
    } else {
      x = -0.06 + rand() * 1.12;
    }

    const y = -0.06 + rand() * 1.12;
    const z = isBokeh ? 0.24 + rand() * 0.24 : 0.52 + rand() * 1.25;
    const speedBase = variant === "hero" ? 0.016 : 0.011;
    const angle = rand() * Math.PI * 2;
    const mag = (0.45 + rand() * 0.75) * speedBase;

    nodes.push({
      x,
      y,
      z,
      vx: Math.cos(angle) * mag,
      vy: Math.sin(angle) * mag * 0.8,
      vz: (rand() - 0.5) * 0.03,
      radius: isBokeh ? 18 + rand() * 24 : 1.1 + rand() * 1.4,
      phase: rand() * Math.PI * 2,
      isBokeh,
    });
  }

  return nodes;
}

function wrapCoordinate(value: number, min: number, max: number): number {
  const span = max - min;
  if (value < min) return value + span;
  if (value > max) return value - span;
  return value;
}

function verticalEdgeFade(sy: number, height: number): number {
  if (height <= 0) return 1;
  const margin = Math.min(72, height * 0.12);
  if (sy < 0 || sy > height) return 0;
  if (sy < margin) return sy / margin;
  if (sy > height - margin) return (height - sy) / margin;
  return 1;
}

export function NetworkCanvas({
  variant = "hero",
  className,
}: NetworkCanvasProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isReducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { accent, foreground } = readThemeColors();
    const isHero = variant === "hero";
    const baseOpacity = isHero ? 1 : 0.55;
    const parallaxLimit = isHero ? 16 : 8;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    let width = container.clientWidth;
    let height = container.clientHeight;
    let isDesktop = width >= 768;
    let nodes = buildNodes(variant, isDesktop);

    let isVisible = true;
    let isDocHidden = document.hidden;
    let rafId: number | null = null;
    let lastTimestamp = 0;
    let elapsedSec = 0;

    let targetPointerX = 0;
    let targetPointerY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let pointerActive = false;

    const configureCanvasSize = () => {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;
      if (nextWidth <= 0 || nextHeight <= 0) return;

      const nextIsDesktop = nextWidth >= 768;
      if (nextIsDesktop !== isDesktop) {
        isDesktop = nextIsDesktop;
        nodes = buildNodes(variant, isDesktop);
      }

      width = nextWidth;
      height = nextHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawFrame = (timeSec: number) => {
      if (width <= 0 || height <= 0) return;

      ctx.clearRect(0, 0, width, height);

      const fov = 1.15;
      const connectDist = Math.max(110, Math.min(width * 0.17, 205));
      const connectDistSq = connectDist * connectDist;
      const projected: ProjectedNode[] = new Array(nodes.length);

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const scale = fov / (fov + node.z * 0.65);
        const depthParallax = 1.25 / (node.z + 0.4);
        const sx =
          width * (0.5 + (node.x - 0.5) * scale * 1.2) +
          pointerX * parallaxLimit * depthParallax;
        const sy =
          height * (0.5 + (node.y - 0.5) * scale * 1.2) +
          pointerY * parallaxLimit * depthParallax;

        const pulse = 0.82 + 0.18 * Math.sin(timeSec * 1.4 + node.phase);
        const depthFade = Math.max(0.22, Math.min(1, 1.45 - node.z * 0.62));
        const edgeFade = verticalEdgeFade(sy, height);

        projected[i] = {
          sx,
          sy,
          z: node.z,
          scale,
          radius: node.radius * (node.isBokeh ? 1 : 0.72 + scale * 0.48),
          alpha: pulse * depthFade * edgeFade * baseOpacity,
          isBokeh: node.isBokeh,
        };
      }

      // Draw connecting mesh edges between mid/far vertices.
      ctx.lineCap = "round";
      for (let i = 0; i < projected.length; i++) {
        const a = projected[i];
        if (a.isBokeh || a.alpha <= 0.01) continue;

        for (let j = i + 1; j < projected.length; j++) {
          const b = projected[j];
          if (b.isBokeh || b.alpha <= 0.01) continue;
          if (Math.abs(a.z - b.z) > 0.65) continue;

          const dx = a.sx - b.sx;
          const dy = a.sy - b.sy;
          const distSq = dx * dx + dy * dy;
          if (distSq >= connectDistSq) continue;

          const distRatio = 1 - Math.sqrt(distSq) / connectDist;
          const pairAlpha = Math.min(a.alpha, b.alpha) * distRatio * 0.46;
          if (pairAlpha <= 0.006) continue;

          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.lineWidth = 0.6 + distRatio * 0.55;
          ctx.strokeStyle = rgba(accent, pairAlpha);
          ctx.stroke();
        }
      }

      // Draw crisp vertices first, then soft foreground bokeh orbs.
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        if (p.isBokeh || p.alpha <= 0.01) continue;

        const haloRadius = p.radius * 5.2;
        const halo = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, haloRadius);
        halo.addColorStop(0, rgba(accent, p.alpha * 0.42));
        halo.addColorStop(0.45, rgba(accent, p.alpha * 0.12));
        halo.addColorStop(1, rgba(accent, 0));

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, haloRadius, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.radius, 0, Math.PI * 2);
        const coreColor = p.z < 0.95 ? foreground : accent;
        ctx.fillStyle = rgba(coreColor, Math.min(0.9, p.alpha * 0.85));
        ctx.fill();
      }

      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        if (!p.isBokeh || p.alpha <= 0.01) continue;

        const orbAlpha = p.alpha * 0.11;
        const orb = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, p.radius);
        orb.addColorStop(0, rgba(accent, orbAlpha));
        orb.addColorStop(0.55, rgba(accent, orbAlpha * 0.45));
        orb.addColorStop(1, rgba(accent, 0));

        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = orb;
        ctx.fill();
      }
    };

    const stepSimulation = (dt: number) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        node.x = wrapCoordinate(node.x + node.vx * dt, -0.1, 1.1);
        node.y = wrapCoordinate(node.y + node.vy * dt, -0.1, 1.1);

        const minZ = node.isBokeh ? 0.22 : 0.5;
        const maxZ = node.isBokeh ? 0.48 : 1.78;
        node.z += node.vz * dt;
        if (node.z < minZ) {
          node.z = minZ;
          node.vz = Math.abs(node.vz);
        } else if (node.z > maxZ) {
          node.z = maxZ;
          node.vz = -Math.abs(node.vz);
        }
      }

      const damp = 1 - Math.exp(-5 * dt);
      pointerX += (targetPointerX - pointerX) * damp;
      pointerY += (targetPointerY - pointerY) * damp;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (window.innerWidth <= 0 || window.innerHeight <= 0) return;
      targetPointerX = (event.clientX / window.innerWidth) * 2 - 1;
      targetPointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const attachPointer = () => {
      if (!finePointer || pointerActive) return;
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      pointerActive = true;
    };

    const detachPointer = () => {
      if (!pointerActive) return;
      window.removeEventListener("pointermove", onPointerMove);
      pointerActive = false;
    };

    const stopLoop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      detachPointer();
    };

    const tick = (timestamp: number) => {
      if (!isVisible || isDocHidden || isReducedMotion) {
        stopLoop();
        return;
      }

      if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
      }
      const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;
      elapsedSec += dt;

      stepSimulation(dt);
      drawFrame(elapsedSec);
      rafId = requestAnimationFrame(tick);
    };

    const syncPlayback = () => {
      if (isReducedMotion) {
        stopLoop();
        drawFrame(0);
        return;
      }
      if (isVisible && !isDocHidden) {
        if (rafId === null) {
          lastTimestamp = 0;
          attachPointer();
          rafId = requestAnimationFrame(tick);
        }
      } else {
        stopLoop();
      }
    };

    configureCanvasSize();
    drawFrame(0);

    const resizeObserver = new ResizeObserver(() => {
      configureCanvasSize();
      if (isReducedMotion || !isVisible || isDocHidden) {
        drawFrame(elapsedSec);
      }
    });
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;
        isVisible = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.01 },
    );
    intersectionObserver.observe(container);

    const onVisibilityChange = () => {
      isDocHidden = document.hidden;
      syncPlayback();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    syncPlayback();

    return () => {
      stopLoop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [variant, isReducedMotion]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={clsx("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

export default NetworkCanvas;
