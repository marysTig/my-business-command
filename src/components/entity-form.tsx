import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useRows, useSaveRow, type Row } from "@/lib/db";
import { entityFields, labelColumn, type Field } from "@/lib/entities";

const NONE = "__none__";

function RelationSelect({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
}) {
  const { data = [] } = useRows(field.relation!, {});
  const label = labelColumn[field.relation!] ?? "name";
  return (
    <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger>
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>None</SelectItem>
        {data.map((row) => (
          <SelectItem key={row["id"]} value={row["id"]}>
            {row[label] ?? "Untitled"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function emptyValues(fields: Field[], defaults?: Row): Row {
  const base: Row = {};
  for (const f of fields) {
    if (f.type === "select") base[f.name] = f.options?.[0] ?? "";
    else if (f.type === "progress") base[f.name] = 0;
    else base[f.name] = "";
  }
  return { ...base, ...(defaults ?? {}) };
}

export function EntityFormDialog({
  table,
  open,
  onOpenChange,
  record,
  defaults,
  title,
  onSaved,
}: {
  table: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: Row | null | undefined;
  defaults?: Row | undefined;
  title?: string | undefined;
  onSaved?: ((row: Row) => void) | undefined;
}) {
  const fields = entityFields[table] ?? [];
  const [values, setValues] = useState<Row>(() => emptyValues(fields, defaults));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSaveRow(table);

  useEffect(() => {
    if (!open) return;
    if (record) {
      const next: Row = { id: record["id"] };
      for (const f of fields) {
        const v = record[f.name];
        next[f.name] = f.type === "tags" ? (Array.isArray(v) ? v.join(", ") : "") : (v ?? "");
      }
      setValues(next);
    } else {
      setValues(emptyValues(fields, defaults));
    }
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.["id"]]);

  const grouped = useMemo(() => fields, [fields]);

  function setField(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function submit() {
    const nextErrors: Record<string, string> = {};
    for (const f of fields) {
      if (f.required && !String(values[f.name] ?? "").trim()) {
        nextErrors[f.name] = `${f.label} is required`;
      }
      if (f.type === "url" && values[f.name] && /\s/.test(String(values[f.name]))) {
        nextErrors[f.name] = "Enter a valid URL";
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: Row = record?.["id"] ? { id: record["id"] } : {};
    for (const f of fields) {
      const raw = values[f.name];
      if (f.type === "number" || f.type === "progress") {
        payload[f.name] = raw === "" || raw === null ? null : Number(raw);
      } else if (f.type === "tags") {
        payload[f.name] = String(raw ?? "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      } else if (f.type === "relation" || f.type === "date") {
        payload[f.name] = raw === "" ? null : raw;
      } else {
        payload[f.name] = raw === "" ? null : raw;
      }
    }
    save.mutate(payload, {
      onSuccess: (row) => {
        onOpenChange(false);
        onSaved?.(row);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title ?? (record ? "Edit" : "New entry")}</DialogTitle>
          <DialogDescription>
            Fill in the details. Never store passwords or secret keys here — links only.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {grouped.map((field) => {
            const wide = field.type === "textarea" || field.type === "progress";
            return (
              <div key={field.name} className={wide ? "sm:col-span-2" : undefined}>
                <Label htmlFor={field.name} className="mb-1.5 block text-sm">
                  {field.label}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </Label>

                {field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    rows={3}
                    value={values[field.name] ?? ""}
                    onChange={(e) => setField(field.name, e.target.value)}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={values[field.name] || field.options?.[0] || ""}
                    onValueChange={(v) => setField(field.name, v)}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "relation" ? (
                  <RelationSelect
                    field={field}
                    value={values[field.name] ?? ""}
                    onChange={(v) => setField(field.name, v)}
                  />
                ) : field.type === "progress" ? (
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[Number(values[field.name] ?? 0)]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={([v]) => setField(field.name, v)}
                      className="flex-1"
                    />
                    <span className="w-12 text-right text-sm tabular-nums text-muted-foreground">
                      {Number(values[field.name] ?? 0)}%
                    </span>
                  </div>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    value={values[field.name] ?? ""}
                    placeholder={field.placeholder}
                    onChange={(e) => setField(field.name, e.target.value)}
                  />
                )}

                {errors[field.name] ? (
                  <p className="mt-1 text-xs text-destructive">{errors[field.name]}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
