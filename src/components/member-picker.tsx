import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteRow, useRows, useSaveRow } from "@/lib/db";
import { setMember } from "@/lib/member";

export function MemberPicker() {
  const { data = [], isLoading } = useRows("team_members", {
    order: { column: "name", ascending: true },
  });
  const save = useSaveRow("team_members");
  const del = useDeleteRow("team_members");
  const [name, setName] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    await save.mutateAsync({ name: n });
    setName("");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Qui êtes-vous ?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisissez votre nom pour entrer dans My Business OS.
        </p>

        <div className="mt-5 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun utilisateur. Ajoutez le premier ci-dessous.</p>
          ) : (
            data.map((m) => (
              <div key={m["id"]} className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 justify-start"
                  onClick={() => setMember(m["name"])}
                >
                  <span className="mr-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {String(m["name"]).charAt(0).toUpperCase()}
                  </span>
                  {m["name"]}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Supprimer ${m["name"]}`}
                  onClick={() => {
                    if (confirm(`Supprimer ${m["name"]} ?`)) del.mutate(m["id"]);
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={add} className="mt-5 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvel utilisateur" />
          <Button type="submit" disabled={save.isPending} className="gap-1.5">
            <UserPlus className="size-4" /> Ajouter
          </Button>
        </form>
      </div>
    </div>
  );
}
