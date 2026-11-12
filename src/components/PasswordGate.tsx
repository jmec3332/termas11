import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAuthed, loadDB, setAuthed } from "@/lib/termas";

export function PasswordGate({ title, children }: { title: string; children: ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  useEffect(() => { setOk(isAuthed()); const f = () => setOk(isAuthed()); window.addEventListener("termas-auth", f); return () => window.removeEventListener("termas-auth", f); }, []);
  if (ok === null) return null;
  if (ok) return <>{children}</>;
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="font-display text-2xl font-black">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Ingresa la clave de administración.</p>
      <form className="mt-6 space-y-3" onSubmit={(e) => {
        e.preventDefault();
        if (pw === loadDB().settings.password) { setAuthed(true); setOk(true); window.dispatchEvent(new Event("termas-auth")); }
        else toast.error("Clave incorrecta");
      }}>
        <Label htmlFor="clave">Clave</Label>
        <Input id="clave" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        <Button className="w-full" size="lg">Entrar</Button>
      </form>
    </main>
  );
}
