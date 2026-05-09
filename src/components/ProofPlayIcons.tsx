import {
  Brain,
  Camera,
  Gift,
  Handshake,
  MapPinCheck,
  QrCode,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MissionType, ProofType } from "@/lib/mock-data";

type IconBadgeProps = {
  icon: LucideIcon;
  color?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-11 w-11 rounded-xl",
  lg: "h-14 w-14 rounded-2xl",
};

const iconSizes = {
  sm: 16,
  md: 22,
  lg: 28,
};

export function IconBadge({ icon: Icon, color = "var(--color-pastel-blue)", size = "md" }: IconBadgeProps) {
  return (
    <div
      className={`${sizeClasses[size]} flex shrink-0 items-center justify-center border-2 border-[var(--color-primary-900)] shadow-[2px_2px_0px_0px_#312e81]`}
      style={{ backgroundColor: color }}
    >
      <Icon size={iconSizes[size]} strokeWidth={2.5} className="text-[var(--color-primary-900)]" />
    </div>
  );
}

export function EventIconBadge({ size = "md" }: { size?: IconBadgeProps["size"] }) {
  return <IconBadge icon={Ticket} color="var(--color-pastel-purple)" size={size} />;
}

export function MissionIconBadge({
  title,
  type,
  proofType,
  size = "md",
}: {
  title?: string;
  type?: MissionType;
  proofType?: ProofType;
  size?: IconBadgeProps["size"];
}) {
  const lowerTitle = title?.toLowerCase() ?? "";

  if (lowerTitle.includes("connect")) {
    return <IconBadge icon={Handshake} color="var(--color-pastel-green)" size={size} />;
  }

  if (lowerTitle.includes("superteam") || proofType === "qr_scan" || type === "qr") {
    return <IconBadge icon={QrCode} color="var(--color-pastel-blue)" size={size} />;
  }

  if (lowerTitle.includes("knowledge") || proofType === "quiz_code" || type === "text") {
    return <IconBadge icon={Brain} color="var(--color-pastel-yellow)" size={size} />;
  }

  if (lowerTitle.includes("merch")) {
    return <IconBadge icon={Gift} color="var(--color-pastel-pink)" size={size} />;
  }

  if (lowerTitle.includes("picture") || proofType === "photo_upload" || type === "photo") {
    return <IconBadge icon={Camera} color="var(--color-pastel-pink)" size={size} />;
  }

  if (lowerTitle.includes("check")) {
    return <IconBadge icon={MapPinCheck} color="var(--color-pastel-purple)" size={size} />;
  }

  return <IconBadge icon={Users} color="var(--color-pastel-blue)" size={size} />;
}
