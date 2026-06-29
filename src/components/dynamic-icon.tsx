"use client";

import {
  Landmark,
  PiggyBank,
  CreditCard,
  TrendingUp,
  Banknote,
  Wallet,
  Briefcase,
  Laptop,
  PlusCircle,
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Zap,
  Film,
  ShoppingBag,
  HeartPulse,
  Repeat,
  Plane,
  Target,
  Tag,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  landmark: Landmark,
  "piggy-bank": PiggyBank,
  "credit-card": CreditCard,
  "trending-up": TrendingUp,
  banknote: Banknote,
  wallet: Wallet,
  briefcase: Briefcase,
  laptop: Laptop,
  "plus-circle": PlusCircle,
  "shopping-cart": ShoppingCart,
  utensils: Utensils,
  car: Car,
  home: Home,
  zap: Zap,
  film: Film,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  repeat: Repeat,
  plane: Plane,
  target: Target,
  tag: Tag,
};

export function DynamicIcon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = iconMap[name] || Tag;
  return <Icon className={className} style={style} />;
}
