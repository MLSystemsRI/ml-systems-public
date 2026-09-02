import { View, Text } from "react-native";

type BadgeVariant = "default" | "green" | "amber" | "red" | "blue" | "purple";

const VARIANTS: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: "bg-[#F0F0F0]",              text: "text-[#6B6B6B]" },
  green:   { bg: "bg-[#2A7A4B]/10",           text: "text-[#2A7A4B]" },
  amber:   { bg: "bg-[#FFE500]/10",           text: "text-[#FFE500]" },
  red:     { bg: "bg-[#DC2626]/10",           text: "text-[#DC2626]" },
  blue:    { bg: "bg-[#2563EB]/10",           text: "text-[#2563EB]" },
  purple:  { bg: "bg-[#9333EA]/10",           text: "text-[#9333EA]" },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = "default" }: BadgeProps) {
  const { bg, text } = VARIANTS[variant];
  return (
    <View className={`${bg} px-2.5 py-0.5 rounded-full self-start`}>
      <Text className={`${text} text-xs font-semibold`}>{label}</Text>
    </View>
  );
}

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "complete":
    case "active":
    case "funded":
      return "green";
    case "loan_origination":
    case "processing":
    case "approved":
      return "blue";
    case "deconstruction":
    case "in_progress":
      return "amber";
    case "construction":
      return "purple";
    case "blocked":
    case "resold":
      return "red";
    default:
      return "default";
  }
}
