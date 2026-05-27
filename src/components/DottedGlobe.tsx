"use client";

import { useEffect, useRef } from "react";

const BALL_COUNT = 520;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

type MiniBall = {
  x: number;
  y: number;
  z: number;
  countryIndex: number;
  seed: number;
};

const COUNTRY_BALLS = [
  "USA",
  "Paraguay",
  "Brazil",
  "Japan",
  "Argentina",
  "Germany",
  "Mexico",
  "Canada",
  "France",
  "Spain",
  "England",
  "Portugal",
  "Nigeria",
  "Morocco",
] as const;

const miniBalls = createMiniBalls();

export default function DottedGlobe() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let animationFrame = 0;

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== width * pixelRatio || canvas.height !== height * pixelRatio) {
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      }

      const colors = getThemeColors(canvas);
      const centerX = width / 2;
      const centerY = height / 2;
      const globeRadius = Math.min(width, height) * 0.38;
      const rotation = frame * 0.0038;
      const tilt = -0.34;
      const pulse = Math.sin(frame * 0.018) * 0.08 + 0.92;

      context.clearRect(0, 0, width, height);
      drawBackdrop(context, centerX, centerY, globeRadius, colors, pulse);
      drawLatitudeRings(context, centerX, centerY, globeRadius, rotation, tilt, colors);
      drawMiniBalls(context, centerX, centerY, globeRadius, rotation, tilt, colors, frame);

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

function createMiniBalls(): MiniBall[] {
  return Array.from({ length: BALL_COUNT }, (_, index) => {
    const y = 1 - (index / (BALL_COUNT - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * index;

    return {
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
      countryIndex: index % COUNTRY_BALLS.length,
      seed: (index * 37) % 360,
    };
  });
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
  context.globalAlpha = 0.2;
  context.fillStyle = colors[1];
  context.beginPath();
  context.ellipse(centerX, centerY, radius * 1.18 * pulse, radius * 1.18 * pulse, 0, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.14;
  context.fillStyle = colors[4];
  context.beginPath();
  context.ellipse(centerX, centerY, radius * 0.94, radius * 0.94, 0, 0, Math.PI * 2);
  context.fill();

  context.globalAlpha = 0.3;
  context.strokeStyle = colors[0];
  context.lineWidth = 3;
  context.beginPath();
  context.ellipse(centerX, centerY, radius * 1.03, radius * 1.03, 0, 0, Math.PI * 2);
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
  context.lineWidth = 1.4;
  context.globalAlpha = 0.18;

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

function drawMiniBalls(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  rotation: number,
  tilt: number,
  colors: string[],
  frame: number,
) {
  const projectedBalls = miniBalls
    .map((ball) => ({ ball, projected: project(ball.x, ball.y, ball.z, radius, rotation, tilt) }))
    .sort((a, b) => a.projected.z - b.projected.z);

  for (const item of projectedBalls) {
    const depth = (item.projected.z + radius) / (radius * 2);
    const ballRadius = 1.45 + depth * 4.1;
    const alpha = 0.16 + depth * 0.84;
    const x = centerX + item.projected.x;
    const y = centerY + item.projected.y;
    const country = COUNTRY_BALLS[item.ball.countryIndex];

    drawSoccerDot(
      context,
      x,
      y,
      ballRadius,
      country,
      colors[0],
      alpha,
      frame * 0.012 + item.ball.seed,
      depth,
    );
  }
}

function drawSoccerDot(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  country: (typeof COUNTRY_BALLS)[number],
  outline: string,
  alpha: number,
  rotation: number,
  depth: number,
) {
  context.save();
  context.globalAlpha = alpha;

  const fill = context.createRadialGradient(x - radius * 0.35, y - radius * 0.35, radius * 0.08, x, y, radius * 1.1);
  fill.addColorStop(0, "#ffffff");
  fill.addColorStop(0.55, "#ffffff");
  fill.addColorStop(1, getCountryAccent(country));

  context.fillStyle = fill;
  context.strokeStyle = outline;
  context.lineWidth = depth > 0.54 ? 0.85 : 0.35;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.clip();

  context.translate(x, y);
  context.rotate(rotation);
  context.translate(-x, -y);

  drawCountryFlag(context, x, y, radius, country);
  drawSoccerSeams(context, x, y, radius, outline, depth);

  context.restore();
}

function drawCountryFlag(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  country: (typeof COUNTRY_BALLS)[number],
) {
  switch (country) {
    case "USA":
      drawHorizontalStripes(context, x, y, radius, ["#b31942", "#ffffff", "#b31942", "#ffffff", "#b31942", "#ffffff", "#b31942"]);
      context.fillStyle = "#0a3161";
      context.fillRect(x - radius, y - radius, radius * 0.86, radius * 0.72);
      drawSmallStars(context, x - radius * 0.58, y - radius * 0.66, radius * 0.54, "#ffffff");
      break;
    case "Paraguay":
      drawHorizontalStripes(context, x, y, radius, ["#d52b1e", "#ffffff", "#0038a8"]);
      drawCenterMark(context, x, y, radius, "#f6c445", "#0038a8");
      break;
    case "Brazil":
      context.fillStyle = "#009b3a";
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      drawDiamond(context, x, y, radius * 0.82, "#ffdf00");
      context.fillStyle = "#002776";
      context.beginPath();
      context.arc(x, y, radius * 0.34, 0, Math.PI * 2);
      context.fill();
      break;
    case "Japan":
      context.fillStyle = "#ffffff";
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      context.fillStyle = "#bc002d";
      context.beginPath();
      context.arc(x, y, radius * 0.42, 0, Math.PI * 2);
      context.fill();
      break;
    case "Argentina":
      drawHorizontalStripes(context, x, y, radius, ["#74acdf", "#ffffff", "#74acdf"]);
      drawCenterMark(context, x, y, radius, "#f6b40e", "#f6b40e");
      break;
    case "Germany":
      drawHorizontalStripes(context, x, y, radius, ["#000000", "#dd0000", "#ffce00"]);
      break;
    case "Mexico":
      drawVerticalStripes(context, x, y, radius, ["#006847", "#ffffff", "#ce1126"]);
      drawCenterMark(context, x, y, radius, "#c8a64d", "#006847");
      break;
    case "Canada":
      drawVerticalStripes(context, x, y, radius, ["#d52b1e", "#ffffff", "#d52b1e"], [0.28, 0.44, 0.28]);
      drawMapleHint(context, x, y, radius, "#d52b1e");
      break;
    case "France":
      drawVerticalStripes(context, x, y, radius, ["#0055a4", "#ffffff", "#ef4135"]);
      break;
    case "Spain":
      drawHorizontalStripes(context, x, y, radius, ["#aa151b", "#f1bf00", "#f1bf00", "#aa151b"]);
      drawCenterMark(context, x - radius * 0.28, y, radius, "#aa151b", "#f1bf00");
      break;
    case "England":
      context.fillStyle = "#ffffff";
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      context.fillStyle = "#ce1124";
      context.fillRect(x - radius, y - radius * 0.17, radius * 2, radius * 0.34);
      context.fillRect(x - radius * 0.17, y - radius, radius * 0.34, radius * 2);
      break;
    case "Portugal":
      context.fillStyle = "#006600";
      context.fillRect(x - radius, y - radius, radius * 0.82, radius * 2);
      context.fillStyle = "#ff0000";
      context.fillRect(x - radius * 0.18, y - radius, radius * 1.18, radius * 2);
      drawCenterMark(context, x - radius * 0.2, y, radius, "#ffcc00", "#006600");
      break;
    case "Nigeria":
      drawVerticalStripes(context, x, y, radius, ["#008751", "#ffffff", "#008751"]);
      break;
    case "Morocco":
      context.fillStyle = "#c1272d";
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      drawStar(context, x, y, radius * 0.54, radius * 0.22, 5, "#006233");
      break;
  }
}

function drawHorizontalStripes(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  stripes: string[],
) {
  const stripeHeight = (radius * 2) / stripes.length;
  stripes.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(x - radius, y - radius + index * stripeHeight, radius * 2, stripeHeight + 0.5);
  });
}

function drawVerticalStripes(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  stripes: string[],
  widths?: number[],
) {
  let cursor = x - radius;
  stripes.forEach((color, index) => {
    const width = radius * 2 * (widths?.[index] ?? 1 / stripes.length);
    context.fillStyle = color;
    context.fillRect(cursor, y - radius, width + 0.5, radius * 2);
    cursor += width;
  });
}

function drawCenterMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  stroke: string,
) {
  context.fillStyle = fill;
  context.strokeStyle = stroke;
  context.lineWidth = Math.max(0.3, radius * 0.08);
  context.beginPath();
  context.arc(x, y, radius * 0.16, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function drawDiamond(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x, y - radius);
  context.lineTo(x + radius, y);
  context.lineTo(x, y + radius);
  context.lineTo(x - radius, y);
  context.closePath();
  context.fill();
}

function drawSmallStars(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  context.fillStyle = color;
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      context.beginPath();
      context.arc(x + col * radius * 0.32, y + row * radius * 0.28, Math.max(0.4, radius * 0.055), 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawMapleHint(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  context.fillStyle = color;
  drawStar(context, x, y - radius * 0.04, radius * 0.42, radius * 0.16, 6, color);
  context.fillRect(x - radius * 0.04, y + radius * 0.16, radius * 0.08, radius * 0.36);
}

function drawSoccerSeams(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  outline: string,
  depth: number,
) {
  context.save();
  context.globalAlpha = 0.18 + depth * 0.18;
  context.strokeStyle = outline;
  context.lineWidth = Math.max(0.25, radius * 0.08);
  context.beginPath();
  context.ellipse(x, y, radius * 0.72, radius * 0.26, 0, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.ellipse(x, y, radius * 0.3, radius * 0.82, 0.2, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawStar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  color?: string,
) {
  if (color) context.fillStyle = color;
  context.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + i * (Math.PI / points);
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.fill();
}

function getCountryAccent(country: (typeof COUNTRY_BALLS)[number]) {
  switch (country) {
    case "USA":
    case "Paraguay":
    case "Japan":
    case "Canada":
    case "England":
    case "Portugal":
    case "Morocco":
      return "#d52b1e";
    case "Brazil":
    case "Nigeria":
      return "#009b3a";
    case "Argentina":
    case "France":
      return "#74acdf";
    case "Germany":
    case "Spain":
      return "#ffce00";
    case "Mexico":
      return "#006847";
  }
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
    style.getPropertyValue("--color-pastel-yellow").trim() || "#fef08a",
  ];
}
