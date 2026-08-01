"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BackgroundBeamsProps {
  className?: string;
}

export function BackgroundBeams({ className }: BackgroundBeamsProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      {/* Subtle gradient orbs */}
      <div className="absolute -top-[30%] -left-[10%] h-[500px] w-[500px] rounded-full bg-[#CE1126]/[0.07] blur-[120px]" />
      <div className="absolute -bottom-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-[#CE1126]/[0.04] blur-[150px]" />

      {/* Animated beam lines */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute h-[1px] w-[300px] bg-gradient-to-r from-transparent via-[#CE1126]/20 to-transparent"
          style={{
            top: `${15 + i * 18}%`,
            left: `${-10 + i * 15}%`,
            transform: `rotate(${-25 + i * 10}deg)`,
            animation: `beam-move ${6 + i * 2}s linear infinite`,
            animationDelay: `${i * 1.5}s`,
            opacity: 0.3,
          }}
        />
      ))}

      {/* Grid dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
}
