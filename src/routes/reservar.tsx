import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReservationCard } from "@/components/ReservationCard";
import { useTermas } from "@/hooks/use-termas";
import { PACKAGES, SLOTS, capacity, clp, genCode, isValidPhone, normalizePhone, priceFor, saunasNeeded, tinasNeeded, todayISO, usage, type PackageId, type Reservation } from "@/lib/termas";

export const Route = createFileRoute("/reservar")({
  head: () => ({
    meta: [
      { title: "Reservar · Termas Punulaf" },
      { name: "description", content: "Elige paquete, día, horario y confirma tu reserva en Termas Punulaf." },
      { property: "og:title", content: "Reservar · Termas Punulaf" },
      { property: "og:description", content: "Reserva tina, sauna o día completo en cuatro pasos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reservar,
});

const STEPS = ["Paquete", "Día y grupo", "Horario", "Datos"];

function Reservar() {
  const { db, update } = useTermas();
  const [step, setStep] = useState(0);
  const [pkgId, setPkgId] = useState<PackageId | null>(null);
  const [date, setDate] = useState(todayISO());
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [tina, setTina] = useState<string | null>(null);
  const [sauna, setSauna] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState<Reservation | null>(null);

  const pkg = PACKAGES.find((p) => p.id === pkgId);
  const u = useMemo(() => (db ? usage(db, date) : null), [db, date]);
  if (!db || !u) return null;
  const cap = capacity(db.settings);
  const total = pkg ? priceFor(db.settings.prices, db.settings.season, pkg.id, adults) : 0;
  const nowISO = todayISO();
  const nowHour = new Date().getHours();
  const pastSlot = (s: string) => date === nowISO && parseInt(s) <= nowHour;

  if (done) return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-2xl font-black">Reserva confirmada</h1>
      <p className="mt-1 text-sm text-muted-foreground">Guarda el código: se usa junto con tu celular en Mi visita.</p>
      <div className="mt-5"><ReservationCard r={done} /></div>
      <Button className="mt-4 w-full" variant="ghost" onClick={() => { setDone(null); setStep(0); setPkgId(null); setTina(null); setSauna(null); }}>Hacer otra reserva</Button>
    </main>
  );

  const confirm = () => {
    if (name.trim().length < 3) return toast.error("Ingresa nombre y apellido");
    if (!isValidPhone(phone)) return toast.error("El celular debe tener 9 dígitos y empezar en 9 (ej: 9 1234 5678)");
    if (!pkg) return;
    const fresh = usage(db, date);
    if (tina && fresh.tinas[tina] + tinasNeeded(adults) > cap.tinas) return toast.error("Ese horario de tina se acaba de llenar");
    if (sauna && fresh.saunas[sauna] + saunasNeeded(adults) > cap.saunas) return toast.error("Ese horario de sauna se acaba de llenar");
    const r: Reservation = {
      id: crypto.randomUUID(), code: genCode(new Set(db.reservations.map((x) => x.code))), createdAt: new Date().toISOString(), date, packageId: pkg.id,
      adults, kids, name: name.trim(), phone: normalizePhone(phone), email: email.trim(), tinaSlot: tina, saunaSlot: sauna,
      tinaUnits: tina ? tinasNeeded(adults) : 0, saunaUnits: sauna ? saunasNeeded(adults) : 0, season: db.settings.season, total, status: "confirmada", cancelledAt: null, demo: false,
    };
    update((d) => ({ ...d, reservations: [...d.reservations, r] }));
    setDone(r);
    window.scrollTo(0, 0);
  };

  const canNext = [!!pkg, adults >= 1 && !!date, (!pkg?.tina || !!tina) && (!pkg?.sauna || !!sauna), true][step];

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <ol className="mb-5 grid grid-cols-4 gap-1 text-center text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "rounded-md bg-primary py-1.5 font-bold text-primary-foreground" : i < step ? "rounded-md bg-secondary py-1.5 text-secondary-foreground" : "rounded-md bg-muted py-1.5 text-muted-foreground"}>{i + 1}. {s}</li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-3">
          <h1 className="font-display text-xl font-black">1. Selecciona el paquete</h1>
          <p className="text-sm text-muted-foreground">Temporada {db.settings.season}. Piscinas libres incluidas en todos los paquetes.</p>
          {PACKAGES.map((p) => (
            <button key={p.id} onClick={() => { setPkgId(p.id); setTina(null); setSauna(null); }} className={`w-full rounded-xl border-2 bg-card p-4 text-left transition ${pkgId === p.id ? "border-primary" : "border-border"}`}>
              <div className="flex items-baseline justify-between gap-2"><span className="font-display font-bold">{p.name}</span><span className="font-bold">{clp(db.settings.prices[p.id][db.settings.season])}</span></div>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-2 flex gap-2 text-xs">{p.tina && <span className="rounded bg-tina-soft px-2 py-0.5 font-bold text-tina">Tina</span>}{p.sauna && <span className="rounded bg-sauna-soft px-2 py-0.5 font-bold">Sauna</span>}</div>
            </button>
          ))}
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <h1 className="font-display text-xl font-black">2. Día y grupo</h1>
          <div className="space-y-1"><Label htmlFor="fecha">Día</Label><Input id="fecha" type="date" min={nowISO} value={date} onChange={(e) => { setDate(e.target.value); setTina(null); setSauna(null); }} /></div>
          <Counter label="Personas (4 años o más)" value={adults} min={1} max={8} onChange={(v) => { setAdults(v); setTina(null); setSauna(null); }} />
          <Counter label="Menores de 4 años (sin cargo, comparten tina con un adulto)" value={kids} min={0} max={adults} onChange={setKids} />
          {pkg?.tina && <p className="text-sm text-muted-foreground">Se necesitan {tinasNeeded(adults)} tina/s libres en el mismo horario.</p>}
          {pkg?.sauna && <p className="text-sm text-muted-foreground">Se usan {saunasNeeded(adults)} sauna/s (hasta 4 personas por sauna).</p>}
        </section>
      )}

      {step === 2 && pkg && (
        <section className="space-y-5">
          <h1 className="font-display text-xl font-black">3. Tu horario</h1>
          {!pkg.tina && !pkg.sauna && <p className="rounded-md bg-muted p-3 text-sm">Piscinas libres todo el día, sin turnos. Sigue al paso 4.</p>}
          {pkg.tina && <SlotPicker kind="tina" title="Tina · 45 min" need={tinasNeeded(adults)} used={u.tinas} cap={cap.tinas} value={tina} onChange={setTina} blocked={sauna} past={pastSlot} />}
          {pkg.sauna && <SlotPicker kind="sauna" title="Sauna · 30 min" need={saunasNeeded(adults)} used={u.saunas} cap={cap.saunas} value={sauna} onChange={setSauna} blocked={tina} past={pastSlot} />}
        </section>
      )}

      {step === 3 && pkg && (
        <section className="space-y-4">
          <h1 className="font-display text-xl font-black">4. Tus datos</h1>
          <div className="space-y-1"><Label htmlFor="nombre">Nombre y apellido</Label><Input id="nombre" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="cel">Celular</Label>
            <div className="flex"><span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm">+56</span><Input id="cel" inputMode="numeric" placeholder="9 1234 5678" className="rounded-l-none" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            {phone && !isValidPhone(phone) && <p className="text-xs text-destructive">9 dígitos, empezando en 9.</p>}
          </div>
          <div className="space-y-1"><Label htmlFor="mail">Correo (opcional)</Label><Input id="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="rounded-xl bg-muted p-4 text-sm">
            <p><b>{pkg.name}</b> · {adults} persona/s{kids ? ` + ${kids} menor/es` : ""}</p>
            <p>{date}{tina ? ` · Tina ${tina}` : ""}{sauna ? ` · Sauna ${sauna}` : ""}</p>
            <p className="mt-1 text-lg font-bold">Total {clp(total)}</p>
          </div>
        </section>
      )}

      <div className="sticky bottom-0 mt-6 flex gap-2 border-t border-border bg-background py-3">
        {step > 0 && <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>Volver</Button>}
        {step < 3 ? <Button size="lg" className="flex-1" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuar</Button>
          : <Button size="lg" className="flex-1" onClick={confirm}>Confirmar reserva</Button>}
      </div>
    </main>
  );
}

function Counter({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Menos" disabled={value <= min} onClick={() => onChange(value - 1)}>−</Button>
        <span className="w-6 text-center font-bold">{value}</span>
        <Button variant="outline" size="icon" aria-label="Más" disabled={value >= max} onClick={() => onChange(value + 1)}>+</Button>
      </div>
    </div>
  );
}

function SlotPicker({ kind, title, need, used, cap, value, onChange, blocked, past }: { kind: "tina" | "sauna"; title: string; need: number; used: Record<string, number>; cap: number; value: string | null; onChange: (v: string) => void; blocked: string | null; past: (s: string) => boolean }) {
  const sel = kind === "tina" ? "border-tina bg-tina text-primary-foreground" : "border-sauna bg-sauna text-accent-foreground";
  return (
    <div>
      <h2 className={`mb-2 inline-block rounded px-2 py-0.5 font-bold ${kind === "tina" ? "bg-tina-soft text-tina" : "bg-sauna-soft"}`}>{title}</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {SLOTS.map((s) => {
          const free = cap - used[s];
          const isBlocked = blocked === s;
          const disabled = free < need || isBlocked || past(s);
          return (
            <button key={s} disabled={disabled} onClick={() => onChange(s)} className={`rounded-lg border-2 p-2 text-sm disabled:opacity-40 ${value === s ? sel : "border-border bg-card"}`}>
              <span className="block font-bold">{s}</span>
              <span className="block text-xs">{isBlocked ? "Ocupado por tu otro turno" : past(s) ? "Ya pasó" : `${Math.max(0, free)} libre/s`}</span>
            </button>
          );
        })}
      </div>
      {blocked && <p className="mt-2 text-xs text-muted-foreground">El {kind === "tina" ? "sauna" : "tina"} de las {blocked} bloquea ese horario: no se puede estar en dos lugares a la vez.</p>}
    </div>
  );
}
