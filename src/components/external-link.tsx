import { ExternalLink } from "lucide-react";

export function LinkOut({ url, label }: { url?: string | null; label: string }) {
  if (!url) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">Not set</span>
      </div>
    );
  }
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent"
    >
      <span className="font-medium text-foreground">{label}</span>
      <span className="flex max-w-[55%] items-center gap-1.5 truncate text-xs text-muted-foreground">
        <span className="truncate">{url}</span>
        <ExternalLink className="size-3.5 shrink-0" />
      </span>
    </a>
  );
}
