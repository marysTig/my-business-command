import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useRows, type Row } from "@/lib/db";
import { exportLeadsToExcel } from "@/lib/export-leads";

/**
 * Exports the leads currently listed (the optional filter mirrors the page's
 * sub-section) so the file always matches what the user sees.
 */
export function ExportLeadsButton({
  fileName,
  rowFilter,
}: {
  fileName: string;
  rowFilter?: (row: Row) => boolean;
}) {
  const { data = [] } = useRows("leads", {});
  const [busy, setBusy] = useState(false);
  const rows = rowFilter ? data.filter(rowFilter) : data;

  async function handleClick() {
    if (rows.length === 0) {
      toast.error("Aucun lead à exporter");
      return;
    }
    setBusy(true);
    try {
      await exportLeadsToExcel(rows, fileName);
      toast.success(`${rows.length} leads exportés`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      data-testid="leads-export"
      disabled={busy}
      onClick={handleClick}
      title="Télécharger la liste en .xlsx (Excel)"
    >
      <FileSpreadsheet className="size-4" />
      {busy ? "Export…" : "Exporter Excel"}
    </Button>
  );
}
