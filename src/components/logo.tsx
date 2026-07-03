"use client";

import { useState } from "react";
import Image from "next/image";
import { Command } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

type LogoSize = keyof typeof SIZES;

interface LogoProps {
  size?: LogoSize;
  className?: string;
  priority?: boolean;
}

export function Logo({ size = "md", className, priority = false }: LogoProps) {
  const [failed, setFailed] = useState(false);
  const px = SIZES[size];

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
      src="/logo.png"
      alt="Money Command"
      width={px}
      height={px}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("object-contain", className)}
      style={{ width: px, height: px }}
    />
  );
}

interface LogoMarkProps extends LogoProps {
  title?: string;
  subtitle?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function LogoMark({
  size = "md",
  className,
  priority,
  title = "Money Command",
  subtitle,
  titleClassName,
  subtitleClassName,
}: LogoMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Logo size={size} priority={priority} />
      <div className="min-w-0">
        <p className={cn("truncate font-bold", titleClassName)}>{title}</p>
        {subtitle ? (
          <p className={cn("truncate text-xs", subtitleClassName)}>{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
