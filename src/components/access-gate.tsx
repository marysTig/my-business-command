import { Lock, LogIn } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlock } from "@/lib/access";

/** Code gate shown before anything else in the dashboard. */
export function AccessGate() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (unlock(code)) {
      setError("");
      setCode("");
      return;
    }
    setError("Code incorrect.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="size-4" /> Accès protégé
          </CardTitle>
          <CardDescription>
            Saisissez le code d'accès pour ouvrir My Business OS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="access-code">Code d'accès</Label>
              <Input
                id="access-code"
                data-testid="access-code"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (error) setError("");
                }}
                placeholder="••••••••"
                aria-invalid={Boolean(error)}
              />
            </div>
            {error ? (
              <p className="text-xs text-destructive" data-testid="access-error">
                {error}
              </p>
            ) : null}
            <Button type="submit" data-testid="access-unlock" className="w-full">
              <LogIn className="size-4" /> Déverrouiller
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
