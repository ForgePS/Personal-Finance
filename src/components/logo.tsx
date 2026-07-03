"use client";

import Image, { type StaticImageData } from "next/image";
import logoFull from "../../public/logo.png";
import logoIcon from "../../public/logo-icon.png";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 220,
} as const;

type LogoSize = keyof typeof SIZES;
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
  const px = SIZES[size];

  return (
    <Image
      src={src}
      alt="Money Command"
      width={px}
      height={Math.round(px * (src.height / src.width))}
      priority={priority}
      unoptimized
      className={cn("h-auto w-auto object-contain", className)}
      style={{ width: px, maxWidth: px }}
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
