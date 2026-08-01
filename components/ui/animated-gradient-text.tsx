"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedGradientText({
  children,
  className,
}: AnimatedGradientTextProps) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r from-[#CE1126] via-[#ff4d6a] to-[#CE1126] bg-[length:200%_auto] bg-clip-text text-transparent",
        className
      )}
      style={{
        animation: "gradient-shift 3s ease infinite",
      }}
    >
      {children}
    </span>
  );
}
