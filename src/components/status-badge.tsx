import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  // positive
  Done: "success",
  Completed: "success",
  Published: "success",
  Paid: "success",
  Active: "success",
  Converted: "success",
  Ready: "success",
  Sold: "success",
  // in motion
  "In Progress": "info",
  "In Development": "info",
  Testing: "info",
  Contacted: "info",
  Interested: "info",
  Visit: "info",
  Negotiation: "info",
  Planned: "info",
  Scheduled: "info",
  Reserved: "info",
  // waiting
  Waiting: "warn",
  "Waiting for Client": "warn",
  Pending: "warn",
  Paused: "warn",
  Draft: "warn",
  Idea: "warn",
  Expired: "warn",
  // attention
  Blocked: "danger",
  Lost: "danger",
  Failed: "danger",
  Revoked: "danger",
  Urgent: "danger",
  High: "warn",
  Medium: "info",
  Low: "neutral",
  Refunded: "danger",
};

const toneClass: Record<string, string> = {
  success: "bg-success-soft text-success border-success/20",
  info: "bg-info-soft text-info border-info/20",
  warn: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ value, className }: { value?: string | null; className?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const tone = tones[value] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {value}
    </span>
  );
}
