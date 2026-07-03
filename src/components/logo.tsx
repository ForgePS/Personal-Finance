"use client";

import Image, { type StaticImageData } from "next/image";
import logoFull from "../../public/logo.png";
import logoIcon from "../../public/logo-icon.png";
import { cn } from "@/lib/utils";

const ICON_SIZES = {
  sm: 36,
  md: 44,
  lg: 52,
} as const;

const FULL_MAX_WIDTH = {
  sm: 200,
  md: 260,
  lg: 300,
  xl: 320,
} as const;

type IconSize = keyof typeof ICON_SIZES;
type FullSize = keyof typeof FULL_MAX_WIDTH;
type LogoSize = IconSize | FullSize;
type LogoVariant = "icon" | "full";

const LOGO_SRC: Record<LogoVariant, StaticImageData> = {
  full: logoFull,
  icon: logoIcon,
};

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
  const src = LOGO_SRC[variant];

  if (variant === "full") {
    const fullSize = (size in FULL_MAX_WIDTH ? size : "md") as FullSize;
    const maxWidth = FULL_MAX_WIDTH[fullSize];
    return (
      <Image
        src={src}
        alt="Money Command"
        width={src.width}
        height={src.height}
        priority={priority}
        unoptimized
        className={cn("h-auto w-full object-contain", className)}
        style={{ maxWidth }}
      />
    );
  }

  const iconSize = (size in ICON_SIZES ? size : "md") as IconSize;
  const px = ICON_SIZES[iconSize];

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-slate-950/40 ring-1 ring-white/10",
        className
      )}
      style={{ width: px, height: px }}
    >
      <Image
        src={src}
        alt="Money Command"
        fill
        sizes={`${px}px`}
        priority={priority}
        unoptimized
        className="object-cover object-center"
      />
    </div>
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
      <div className={cn("flex w-full justify-center px-2", className)}>
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
            <p className={cn("truncate font-bold leading-tight", titleClassName)}>{title}</p>
          ) : null}
          {subtitle ? (
            <p className={cn("truncate text-xs leading-snug", subtitleClassName)}>{subtitle}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
