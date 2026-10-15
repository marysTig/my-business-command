import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DetailField } from "@/components/related";

export function SecretField({
  label,
  value,
}: {
  label: string;
  value?: string | null | undefined;
}) {
  const [show, setShow] = useState(false);

  if (!value) return <DetailField label={label} value="—" />;

  return (
    <DetailField
      label={label}
      value={
        <span className="inline-flex items-center gap-2">
          <span className={show ? "break-all" : "tracking-[0.2em]"}>{show ? value : "••••••••"}</span>
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(value);
              toast.success(`${label} copied`);
            }}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`Copy ${label.toLowerCase()}`}
          >
            <Copy className="size-3.5" />
          </button>
        </span>
      }
    />
  );
}
