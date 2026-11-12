import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PasswordGate } from "@/components/PasswordGate";
import { useTermas } from "@/hooks/use-termas";
import { addDays, clp, stats, todayISO, type Period } from "@/lib/termas";

export const Route = createFileRoute("/graficos")({
  head: () => ({
    meta: [
      { title: "Gráficos · Termas Punulaf" },
      { name: "description", content: "Reservas, cancelaciones, facturación y unidades por día, mes o año." },
      { property: "og:title", content: "Gráficos · Termas Punulaf" },
      { property: "og:description", content: "Estadísticas de reservas y cancelaciones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <PasswordGate title="Gráficos"><Graficos /></PasswordGate>,
});

const cfgRes = { reservas: { label: "Reservas", color: "var(--chart-1)" }, cancelaciones: { label: "Cancelaciones", color: "var(--chart-2)" } } satisfies ChartConfig;
const cfgUni = { tinas: { label: "Tinas", color: "var(--tina)" }, saunas: { label: "Saunas", color: "var(--sauna)" } } satisfies ChartConfig;
const cfgFac = { facturacion: { label: "Facturación", color: "var(--chart-5)" } } satisfies ChartConfig;

function lbl(k: string, p: Period) { if (p === "año") return k; const [y, m, d] = k.split("-"); return p === "mes" ? `${m}/${y}` : `${d}/${m}`; }

function Graficos() {
  const { db } = useTermas();
  const [period, setPeriod] = useState<Period>("dia");
  const [from, setFrom] = useState(addDays(todayISO(), -30));
  const [to, setTo] = useState(addDays(todayISO(), 14));
  const data = useMemo(() => db ? stats(db.reservations.filter((r) => r.date >= from && r.date <= to), period).map((s) => ({ ...s, label: lbl(s.key, period) })) : [], [db, period, from, to]);
  if (!db) return null;
  const t = data.reduce((a, s) => ({ reservas: a.reservas + s.reservas, cancelaciones: a.cancelaciones + s.cancelaciones, facturacion: a.facturacion + s.facturacion, tinas: a.tinas + s.tinas, saunas: a.saunas + s.saunas }), { reservas: 0, cancelaciones: 0, facturacion: 0, tinas: 0, saunas: 0 });
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="font-display text-2xl font-black">Gráficos</h1>
      <div className="flex flex-wrap items-end gap-3">
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}><TabsList><TabsTrigger value="dia">Día</TabsTrigger><TabsTrigger value="mes">Mes</TabsTrigger><TabsTrigger value="año">Año</TabsTrigger></TabsList></Tabs>
        <div className="space-y-1"><Label htmlFor="desde">Desde</Label><Input id="desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label htmlFor="hasta">Hasta</Label><Input id="hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <Button variant="ghost" onClick={() => { setFrom("2000-01-01"); setTo("2100-01-01"); }}>Todo</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Reservas" value={String(t.reservas)} />
        <Kpi label="Cancelaciones" value={String(t.cancelaciones)} />
        <Kpi label="Facturación" value={clp(t.facturacion)} />
        <Kpi label="Tinas usadas" value={String(t.tinas)} />
        <Kpi label="Saunas usadas" value={String(t.saunas)} />
      </div>

      <ChartBox title="Reservas y cancelaciones"><ChartContainer config={cfgRes} className="h-64 w-full"><BarChart data={data}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} width={30} /><ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} /><Bar dataKey="reservas" fill="var(--color-reservas)" radius={3} /><Bar dataKey="cancelaciones" fill="var(--color-cancelaciones)" radius={3} /></BarChart></ChartContainer></ChartBox>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartBox title="Facturación"><ChartContainer config={cfgFac} className="h-56 w-full"><BarChart data={data}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis width={60} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="facturacion" fill="var(--color-facturacion)" radius={3} /></BarChart></ChartContainer></ChartBox>
        <ChartBox title="Unidades (tinas y saunas)"><ChartContainer config={cfgUni} className="h-56 w-full"><BarChart data={data}><CartesianGrid vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} width={30} /><ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} /><Bar dataKey="tinas" stackId="u" fill="var(--color-tinas)" /><Bar dataKey="saunas" stackId="u" fill="var(--color-saunas)" radius={[3, 3, 0, 0]} /></BarChart></ChartContainer></ChartBox>
      </div>

      <section className="overflow-x-auto rounded-xl border border-border bg-card">
        <h2 className="px-4 pt-4 font-display font-bold">Totales en texto</h2>
        <table className="mt-2 w-full text-sm">
          <thead className="text-muted-foreground"><tr className="border-b border-border">{["Período", "Reservas", "Cancelaciones", "Facturación", "Tinas", "Saunas"].map((h, i) => <th key={h} className={`px-4 py-2 ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
          <tbody>{data.map((s) => <tr key={s.key} className="border-b border-border"><td className="px-4 py-1.5">{s.label}</td><td className="px-4 text-right">{s.reservas}</td><td className="px-4 text-right">{s.cancelaciones}</td><td className="px-4 text-right">{clp(s.facturacion)}</td><td className="px-4 text-right">{s.tinas}</td><td className="px-4 text-right">{s.saunas}</td></tr>)}</tbody>
          <tfoot className="font-bold"><tr><td className="px-4 py-2">Total</td><td className="px-4 text-right">{t.reservas}</td><td className="px-4 text-right">{t.cancelaciones}</td><td className="px-4 text-right">{clp(t.facturacion)}</td><td className="px-4 text-right">{t.tinas}</td><td className="px-4 text-right">{t.saunas}</td></tr></tfoot>
        </table>
      </section>
    </main>
  );
}
function Kpi({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-display text-xl font-black">{value}</p></div>; }
function ChartBox({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-border bg-card p-4"><h2 className="mb-2 font-display font-bold">{title}</h2>{children}</section>; }
