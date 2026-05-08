"use client";

import { motion } from "framer-motion";

const blobs = [
  { color: "var(--color-pastel-purple)", size: 400, top: "-10%", left: "-10%", delay: 0 },
  { color: "var(--color-pastel-yellow)", size: 300, top: "20%", left: "60%", delay: 2 },
  { color: "var(--color-pastel-pink)", size: 350, top: "70%", left: "10%", delay: 1 },
  { color: "var(--color-pastel-blue)", size: 500, top: "-20%", left: "80%", delay: 3 },
  { color: "var(--color-pastel-green)", size: 250, top: "80%", left: "70%", delay: 4 },
];

export default function BlobBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[var(--color-bg-base)]">
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute bubbly-border"
          style={{
            backgroundColor: blob.color,
            width: blob.size,
            height: blob.size,
            top: blob.top,
            left: blob.left,
          }}
          animate={{
            y: [0, -30, 0, 30, 0],
            x: [0, 20, 0, -20, 0],
            rotate: [0, 10, -10, 0],
            borderRadius: [
              "40% 60% 70% 30% / 40% 50% 60% 50%",
              "60% 40% 30% 70% / 60% 30% 70% 40%",
              "40% 60% 70% 30% / 40% 50% 60% 50%",
            ]
          }}
          transition={{
            duration: 15 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: blob.delay,
          }}
        />
      ))}
    </div>
  );
}
