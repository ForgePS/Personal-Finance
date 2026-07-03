"use client";

import { useState } from "react";
import Image from "next/image";
import { Command } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 220,
} as const;

type LogoSize = keyof typeof SIZES;
type LogoVariant = "icon" | "full";

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
  priority?: boolean;
}

export function Logo({
  size = "md",
  variant = "icon",
  className,
  priority = false,
}: LogoProps) {
  const [failed, setFailed] = useState(false);
  const src = variant === "full" ? "/logo.png" : "/logo-icon.png";
  const px = SIZES[size];
  const aspect = variant === "full" ? 1 : 0.62;
  const height = variant === "full" ? px : Math.round(px * aspect);

  if (failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30",
          className
        )}
        style={{ width: px, height: px }}
      >
        <Command style={{ width: px * 0.5, height: px * 0.5 }} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt="Money Command"
      width={px}
      height={height}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
      style={{ width: px, height }}
    />
  );
}

interface LogoMarkProps extends LogoProps {
  title?: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showTitle?: boolean;
}

export function LogoMark({
  size = "md",
  variant = "icon",
  className,
  priority,
  title = "Money Command",
  subtitle,
  titleClassName,
  subtitleClassName,
  showTitle = true,
}: LogoMarkProps) {
  if (variant === "full") {
    return (
      <div className={cn("flex justify-center", className)}>
        <Logo size={size} variant="full" priority={priority} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Logo size={size} variant="icon" priority={priority} />
      {(showTitle || subtitle) && (
        <div className="min-w-0">
          {showTitle ? (
            <p className={cn("truncate font-bold", titleClassName)}>{title}</p>
          ) : null}
          {subtitle ? (
            <p className={cn("truncate text-xs", subtitleClassName)}>{subtitle}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
