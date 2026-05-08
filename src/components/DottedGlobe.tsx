"use client";

import { useEffect, useRef } from "react";

const DOT_COUNT = 760;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function createDots() {
  return Array.from({ length: DOT_COUNT }, (_, index) => {
    const y = 1 - (index / (DOT_COUNT - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * index;

    return {
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
      band: index % 5,
    };
  });
}

const dots = createDots();

export default function DottedGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let animationFrame = 0;
    const colors = getThemeColors(canvas);

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== width * pixelRatio || canvas.height !== height * pixelRatio) {
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const globeRadius = Math.min(width, height) * 0.38;
      const rotation = frame * 0.0038;
      const tilt = -0.34;
      const pulse = Math.sin(frame * 0.018) * 0.08 + 0.92;

      context.clearRect(0, 0, width, height);
      drawBackdrop(context, centerX, centerY, globeRadius, colors, pulse);
      drawLatitudeRings(context, centerX, centerY, globeRadius, rotation, tilt, colors);
      drawDots(context, centerX, centerY, globeRadius, rotation, tilt, colors);

      frame += 1;
      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  colors: string[],
  pulse: number,
) {
  context.save();
  context.globalAlpha = 0.22;
  context.fillStyle = colors[1];
  context.beginPath();
  context.ellipse(centerX, centerY, radius * 1.16 * pulse, radius * 1.16 * pulse, 0, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.3;
  context.strokeStyle = colors[0];
  context.lineWidth = 3;
  context.beginPath();
  context.ellipse(centerX, centerY, radius * 1.02, radius * 1.02, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawLatitudeRings(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  rotation: number,
  tilt: number,
  colors: string[],
) {
  context.save();
  context.strokeStyle = colors[0];
  context.lineWidth = 1.5;
  context.globalAlpha = 0.22;

  [-0.72, -0.44, -0.18, 0.18, 0.44, 0.72].forEach((latitude, index) => {
    const ringRadius = Math.sqrt(1 - latitude * latitude) * radius;
    const projected = project(0, latitude, 0, radius, rotation, tilt);

    context.beginPath();
    context.ellipse(
      centerX,
      centerY + projected.y,
      ringRadius,
      ringRadius * (0.2 + Math.abs(projected.z) * 0.1),
      rotation * 0.35 + index * 0.08,
      0,
      Math.PI * 2,
    );
    context.stroke();
  });

  context.restore();
}

function drawDots(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  rotation: number,
  tilt: number,
  colors: string[],
) {
  dots.forEach((dot) => {
    const projected = project(dot.x, dot.y, dot.z, radius, rotation, tilt);
    const depth = (projected.z + radius) / (radius * 2);
    const alpha = 0.18 + depth * 0.82;
    const dotRadius = 1.4 + depth * 3.2;
    const color = colors[dot.band];

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.strokeStyle = colors[0];
    context.lineWidth = depth > 0.52 ? 0.85 : 0;
    context.beginPath();
    context.arc(centerX + projected.x, centerY + projected.y, dotRadius, 0, Math.PI * 2);
    context.fill();
    if (depth > 0.52) context.stroke();
    context.restore();
  });
}

function project(x: number, y: number, z: number, radius: number, rotation: number, tilt: number) {
  const cosY = Math.cos(rotation);
  const sinY = Math.sin(rotation);
  const cosX = Math.cos(tilt);
  const sinX = Math.sin(tilt);

  const rotatedX = x * cosY - z * sinY;
  const rotatedZ = x * sinY + z * cosY;
  const tiltedY = y * cosX - rotatedZ * sinX;
  const tiltedZ = y * sinX + rotatedZ * cosX;
  const perspective = 1.35 / (1.95 - tiltedZ);

  return {
    x: rotatedX * radius * perspective,
    y: tiltedY * radius * perspective,
    z: tiltedZ * radius,
  };
}

function getThemeColors(element: HTMLElement) {
  const style = getComputedStyle(element);

  return [
    style.getPropertyValue("--color-primary-900").trim() || "#312e81",
    style.getPropertyValue("--color-pastel-purple").trim() || "#c4b5fd",
    style.getPropertyValue("--color-pastel-pink").trim() || "#fbcfe8",
    style.getPropertyValue("--color-pastel-blue").trim() || "#bae6fd",
    style.getPropertyValue("--color-pastel-green").trim() || "#bbf7d0",
  ];
}
