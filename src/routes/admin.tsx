import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordGate } from "@/components/PasswordGate";
import { ReservationCard } from "@/components/ReservationCard";
import { CancelButton } from "@/components/CancelButton";
import { useTermas } from "@/hooks/use-termas";
import { PACKAGES, SAUNAS_TOTAL, SLOTS, TINAS_TOTAL, capacity, normalizePhone, setAuthed, todayISO, usage, type Prices, type Season } from "@/lib/termas";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administración · Termas Punulaf" },
      { name: "description", content: "Temporada, precios, mantenimiento, ocupación y reservas." },
      { property: "og:title", content: "Administración · Termas Punulaf" },
      { property: "og:description", content: "Panel de administración del recinto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PasswordGate title="Administración"><Admin /></PasswordGate>,
});

function Admin() {
  const { db, update } = useTermas();
  const navigate = useNavigate();
  const [prices, setPrices] = useState<Prices | null>(null);
  const [pw, setPw] = useState("");
  const [date, setDate] = useState(todayISO());
  const [phone, setPhone] = useState("");
  const [selSlot, setSelSlot] = useState<string | null>(null);
  useEffect(() => { if (db && !prices) setPrices(db.settings.prices); }, [db, prices]);
  if (!db || !prices) return null;
  const s = db.settings;
  const cap = capacity(s);
  const u = usage(db, date);
  const dayRes = db.reservations.filter((r) => r.date === date && r.status === "confirmada");
  const affected = selSlot ? dayRes.filter((r) => r.tinaSlot === selSlot || r.saunaSlot === selSlot) : [];
  const byPhone = phone.length >= 9 ? db.reservations.filter((r) => r.phone === normalizePhone(phone)).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const demoCount = db.reservations.filter((r) => r.demo).length;
  const setS = (patch: Partial<typeof s>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-black">Administración</h1>
        <Button variant="outline" onClick={() => { setAuthed(false); navigate({ to: "/" }); }}>Abandonar admin</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Box title="Temporada">
          <p className="mb-2 text-sm text-muted-foreground">Define los precios de las nuevas reservas. Las ya creadas mantienen su precio.</p>
          <div className="flex gap-2">{(["baja", "alta"] as Season[]).map((x) => <Button key={x} variant={s.season === x ? "default" : "outline"} className="flex-1 capitalize" onClick={() => { setS({ season: x }); toast.success(`Temporada ${x} activa`); }}>{x}</Button>)}</div>
        </Box>
        <Box title="Mantenimiento">
          <p className="mb-2 text-sm text-muted-foreground">Recursos fuera de servicio reducen el cupo diario.</p>
          <Stepper label={`Tinas fuera de servicio (de ${TINAS_TOTAL})`} value={s.outTinas} max={TINAS_TOTAL} onChange={(v) => setS({ outTinas: v })} />
          <Stepper label={`Saunas fuera de servicio (de ${SAUNAS_TOTAL})`} value={s.outSaunas} max={SAUNAS_TOTAL} onChange={(v) => setS({ outSaunas: v })} />
          <p className="mt-2 text-sm">Cupo actual: <b className="text-tina">{cap.tinas} tinas</b> · <b>{cap.saunas} saunas</b></p>
        </Box>
      </div>

      <Box title="Precios por persona">
        <div className="space-y-2">
          {PACKAGES.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_auto_auto] items-end gap-2 sm:grid-cols-[1fr_8rem_8rem_auto]">
              <span className="col-span-3 text-sm font-bold sm:col-span-1 sm:self-center">{p.name}</span>
              {(["baja", "alta"] as Season[]).map((x) => (
                <div key={x} className="space-y-0.5"><Label className="text-xs capitalize">{x}</Label>
                  <Input type="number" min={0} step={500} value={prices[p.id][x]} onChange={(e) => setPrices({ ...prices, [p.id]: { ...prices[p.id], [x]: Number(e.target.value) } })} /></div>
              ))}
              <Button onClick={() => { if (Object.values(prices[p.id]).some((v) => !(v >= 0))) return toast.error("Precio no válido"); setS({ prices: { ...s.prices, [p.id]: prices[p.id] } }); toast.success(`Precio de ${p.name} grabado`); }}>Grabar</Button>
            </div>
          ))}
        </div>
      </Box>

      <Box title="Ocupación del día">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="space-y-1"><Label htmlFor="d">Día</Label><Input id="d" type="date" value={date} onChange={(e) => { setDate(e.target.value); setSelSlot(null); }} /></div>
          <span className="text-xs text-muted-foreground">Rojo = sobreocupación por mantenimiento. Toca un horario para ver sus reservas.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-center text-sm">
            <thead><tr><th className="p-1 text-left">Recurso</th>{SLOTS.map((t) => <th key={t} className="p-1"><button className={`rounded px-1.5 ${selSlot === t ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setSelSlot(selSlot === t ? null : t)}>{t}</button></th>)}</tr></thead>
            <tbody>
              <tr><td className="p-1 text-left font-bold text-tina">Tinas</td>{SLOTS.map((t) => <Cell key={t} used={u.tinas[t]} cap={cap.tinas} kind="tina" />)}</tr>
              <tr><td className="p-1 text-left font-bold">Saunas</td>{SLOTS.map((t) => <Cell key={t} used={u.saunas[t]} cap={cap.saunas} kind="sauna" />)}</tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{dayRes.length} reservas confirmadas ese día ({dayRes.filter((r) => r.packageId === "piscinas").length} solo piscinas).</p>
        {selSlot && (
          <div className="mt-3 space-y-2">
            <h3 className="font-bold">Reservas a las {selSlot} ({affected.length})</h3>
            {affected.map((r) => <div key={r.id} className="flex flex-wrap justify-between gap-2 rounded-md border border-border p-2 text-sm"><span><b>{r.code}</b> · {r.name} · +56 {r.phone}</span><span>{r.tinaSlot === selSlot && <span className="mr-1 rounded bg-tina-soft px-1.5 text-tina">{r.tinaUnits} tina/s</span>}{r.saunaSlot === selSlot && <span className="rounded bg-sauna-soft px-1.5">{r.saunaUnits} sauna/s</span>}</span></div>)}
          </div>
        )}
      </Box>

      <Box title="Consulta por celular">
        <Input inputMode="numeric" placeholder="9 1234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <div className="mt-3 space-y-4">
          {phone.length >= 9 && byPhone.length === 0 && <p className="text-sm text-muted-foreground">Sin reservas para ese celular.</p>}
          {byPhone.map((r) => <div key={r.id} className="space-y-2"><ReservationCard r={r} actions={false} /><CancelButton r={r} /></div>)}
        </div>
      </Box>

      <div className="grid gap-6 lg:grid-cols-2">
        <Box title="Cambiar clave de acceso">
          <p className="mb-2 text-sm text-muted-foreground">Sirve para Administración y Gráficos.</p>
          <div className="flex gap-2"><Input type="password" placeholder="Nueva clave" value={pw} onChange={(e) => setPw(e.target.value)} />
            <Button onClick={() => { if (pw.length < 4) return toast.error("Mínimo 4 caracteres"); setS({ password: pw }); setPw(""); toast.success("Clave grabada"); }}>Grabar</Button></div>
        </Box>
        <Box title="Datos de ejemplo">
          <p className="mb-2 text-sm text-muted-foreground">{demoCount} reservas de ejemplo cargadas.</p>
          <Button variant="destructive" disabled={!demoCount} onClick={() => { if (!confirm("¿Eliminar todas las reservas de ejemplo? Las reales se mantienen.")) return; update((d) => ({ ...d, reservations: d.reservations.filter((r) => !r.demo) })); toast.success("Datos de ejemplo eliminados"); }}>Eliminar datos de ejemplo</Button>
        </Box>
      </div>
    </main>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-border bg-card p-4"><h2 className="mb-3 font-display text-lg font-bold">{title}</h2>{children}</section>; }
function Stepper({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return <div className="flex items-center justify-between gap-2 py-1"><span className="text-sm">{label}</span><div className="flex items-center gap-2"><Button size="icon" variant="outline" disabled={value <= 0} onClick={() => onChange(value - 1)}>−</Button><b className="w-5 text-center">{value}</b><Button size="icon" variant="outline" disabled={value >= max} onClick={() => onChange(value + 1)}>+</Button></div></div>;
}
function Cell({ used, cap, kind }: { used: number; cap: number; kind: "tina" | "sauna" }) {
  const over = used > cap;
  const cls = over ? "bg-destructive text-destructive-foreground" : used === 0 ? "bg-muted text-muted-foreground" : kind === "tina" ? "bg-tina-soft text-tina" : "bg-sauna-soft";
  return <td className="p-0.5"><div className={`rounded py-1.5 font-bold ${cls}`}>{used}/{cap}</div></td>;
}
