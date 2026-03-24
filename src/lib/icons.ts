import {
  Instagram, Linkedin, Youtube, Globe, Rss, Mail, MessageCircle, Pin,
} from "lucide-react";
import type React from "react";

export interface IconDef {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

export const FIXED_ICONS: IconDef[] = [
  { key: "instagram",  label: "Instagram",   icon: Instagram,     color: "#E1306C" },
  { key: "tiktok",     label: "TikTok",      icon: Globe,         color: "#010101" },
  { key: "linkedin",   label: "LinkedIn",    icon: Linkedin,      color: "#0A66C2" },
  { key: "youtube",    label: "YouTube",     icon: Youtube,       color: "#FF0000" },
  { key: "blog",       label: "Blog",        icon: Rss,           color: "#f97316" },
  { key: "site",       label: "Site",        icon: Globe,         color: "#64748b" },
  { key: "newsletter", label: "Newsletter",  icon: Mail,          color: "#6366f1" },
  { key: "whatsapp",   label: "WhatsApp",    icon: MessageCircle, color: "#25D366" },
  { key: "pinterest",  label: "Pinterest",   icon: Pin,           color: "#E60023" },
  { key: "twitter",    label: "X / Twitter", icon: Globe,         color: "#1DA1F2" },
  { key: "facebook",   label: "Facebook",    icon: Globe,         color: "#1877F2" },
];

export function getIconDef(key: string | null | undefined): IconDef | undefined {
  if (!key) return undefined;
  return FIXED_ICONS.find((i) => i.key === key.toLowerCase());
}

export function getIcon(key: string | null | undefined): React.ElementType {
  return getIconDef(key)?.icon ?? Globe;
}

export function getIconColor(key: string | null | undefined): string {
  return getIconDef(key)?.color ?? "#64748b";
}
