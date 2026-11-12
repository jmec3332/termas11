import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReservationCard } from "@/components/ReservationCard";
import { CancelButton } from "@/components/CancelButton";
import { useTermas } from "@/hooks/use-termas";
import { normalizePhone } from "@/lib/termas";

export const Route = createFileRoute("/mi-visita")({
  head: () => ({
    meta: [
      { title: "Mi visita · Termas Punulaf" },
      { name: "description", content: "Busca tu reserva con el código y el celular que dejaste." },
      { property: "og:title", content: "Mi visita · Termas Punulaf" },
      { property: "og:description", content: "Consulta o cancela tu reserva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MiVisita,
});

function MiVisita() {
  const { db } = useTermas();
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [foundId, setFoundId] = useState<string | null>(null);
  const found = db?.reservations.find((r) => r.id === foundId);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl font-black">Mi visita</h1>
      <p className="mt-1 text-sm text-muted-foreground">Busca tu reserva con el código y el celular que dejaste.</p>
      <form className="mt-5 space-y-3" onSubmit={(e) => {
        e.preventDefault();
        const r = db?.reservations.find((x) => x.code.toUpperCase() === code.trim().toUpperCase() && x.phone === normalizePhone(phone));
        if (!r) { setFoundId(null); toast.error("No se encontró una reserva con esos datos"); } else setFoundId(r.id);
      }}>
        <div className="space-y-1"><Label htmlFor="code">Código</Label><Input id="code" placeholder="TP-XXXXX" value={code} onChange={(e) => setCode(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="phone">Celular</Label><Input id="phone" inputMode="numeric" placeholder="9 1234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <Button size="lg" className="w-full">Buscar reserva</Button>
      </form>
      {found && <div className="mt-6 space-y-3"><ReservationCard r={found} /><CancelButton r={found} /></div>}
    </main>
  );
}
