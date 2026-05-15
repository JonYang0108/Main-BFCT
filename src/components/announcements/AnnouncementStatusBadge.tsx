import { AlertCircle, AlertTriangle, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { normalizeAnnouncementStatus } from "@/lib/announcement-utils";

interface AnnouncementStatusBadgeProps {
  className?: string;
  status?: string | null;
  type?: string | null;
}

const statusStyles = {
  normal: {
    icon: Info,
    label: "Normal",
    tone: "border-primary/20 bg-primary/10 text-primary",
  },
  urgent: {
    icon: AlertCircle,
    label: "Urgent",
    tone: "border-destructive/20 bg-destructive/10 text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    tone: "border-secondary/20 bg-secondary/10 text-secondary",
  },
} as const;

export default function AnnouncementStatusBadge({
  className,
  status,
  type,
}: AnnouncementStatusBadgeProps) {
  const normalizedStatus = normalizeAnnouncementStatus({ status, type });
  const config = statusStyles[normalizedStatus];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={[
        config.tone,
        "inline-flex items-center gap-1.5 capitalize",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
