import {
  Award,
  Clock,
  Coffee,
  Compass,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  Lightbulb,
  Rocket,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/** Icon names storable in the site config (functions cannot live in localStorage). */
export const iconMap = {
  compass: Compass,
  users: Users,
  sparkles: Sparkles,
  graduation: GraduationCap,
  wallet: Wallet,
  heart: HeartPulse,
  home: Home,
  rocket: Rocket,
  target: Target,
  shield: Shield,
  globe: Globe,
  award: Award,
  clock: Clock,
  coffee: Coffee,
  trending: TrendingUp,
  lightbulb: Lightbulb,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof iconMap;

export const iconNames = Object.keys(iconMap) as IconName[];

/** Bilingual names shown in the admin icon picker. */
export const iconLabels: Record<IconName, { vi: string; en: string }> = {
  compass: { vi: "La bàn / Định hướng", en: "Compass / Direction" },
  users: { vi: "Con người / Đội ngũ", en: "People / Team" },
  sparkles: { vi: "Lấp lánh / Nổi bật", en: "Sparkles / Highlight" },
  graduation: { vi: "Đào tạo / Học tập", en: "Training / Learning" },
  wallet: { vi: "Thu nhập / Lương thưởng", en: "Pay / Compensation" },
  heart: { vi: "Sức khỏe / Bảo hiểm", en: "Health / Insurance" },
  home: { vi: "Làm việc tại nhà", en: "Remote / Home" },
  rocket: { vi: "Phát triển / Thăng tiến", en: "Growth / Launch" },
  target: { vi: "Mục tiêu", en: "Goals" },
  shield: { vi: "An toàn / Bảo vệ", en: "Safety / Protection" },
  globe: { vi: "Toàn cầu", en: "Global" },
  award: { vi: "Giải thưởng / Ghi nhận", en: "Awards / Recognition" },
  clock: { vi: "Giờ giấc linh hoạt", en: "Flexible hours" },
  coffee: { vi: "Văn phòng / Giải trí", en: "Office / Perks" },
  trending: { vi: "Tăng trưởng", en: "Trending / Growth" },
  lightbulb: { vi: "Sáng tạo / Ý tưởng", en: "Ideas / Innovation" },
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name as IconName] ?? Sparkles;
}
