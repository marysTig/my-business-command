import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export type Row = Record<string, any>;

type ListOptions = {
  order?: { column: string; ascending?: boolean };
  filters?: Record<string, string | null | undefined>;
  enabled?: boolean;
  limit?: number;
};

export function useRows(table: string, options: ListOptions = {}) {
  const { order, filters, enabled = true, limit } = options;
  return useQuery({
    queryKey: [table, filters ?? null, order ?? null, limit ?? null],
    enabled,
    queryFn: async () => {
      let q = (supabase.from(table as never) as any).select("*");
      for (const [key, value] of Object.entries(filters ?? {})) {
        if (value === undefined || value === null || value === "") continue;
        q = q.eq(key, value);
      }
      q = q.order(order?.column ?? "created_at", { ascending: order?.ascending ?? false });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useRow(table: string, id?: string) {
  return useQuery({
    queryKey: [table, "one", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await (supabase.from(table as never) as any)
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
  });
}

export function useSaveRow(table: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const { id, ...rest } = values;
      if (id) {
        const { data, error } = await (supabase.from(table as never) as any)
          .update(rest)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as Row;
      }
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from(table as never) as any)
        .insert({ ...rest, user_id: userData.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success("Saved");
    },
    onError: (error: any) => toast.error(error?.message ?? "Could not save"),
  });
}

export function useDeleteRow(table: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from(table as never) as any).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success("Deleted");
    },
    onError: (error: any) => toast.error(error?.message ?? "Could not delete"),
  });
}

export function formatMoney(amount?: number | null, currency = "USD") {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
