import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { changePassword, deleteDay, listStats, login, saveDay } from "@/lib/admin.functions";
import { aggregate, type Period, type Row } from "@/lib/aggregate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Administración · Reservas y cancelaciones" },
      { name: "description", content: "Gráficos y totales de reservas y cancelaciones por día, mes o año, protegidos por clave." },
      { property: "og:title", content: "Administración · Reservas y cancelaciones" },
      { property: "og:description", content: "Totales de reservas y cancelaciones por día, mes o año." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const KEY = "admin-pw";
const chartConfig = {
  reservas: { label: "Reservas", color: "var(--chart-1)" },
  cancelaciones: { label: "Cancelaciones", color: "var(--chart-2)" },
} satisfies ChartConfig;

function Index() {
  const [pw, setPw] = useState<string | null>(null);
  useEffect(() => setPw(sessionStorage.getItem(KEY)), []);
  if (!pw) return <Login onOk={(p) => { sessionStorage.setItem(KEY, p); setPw(p); }} />;
  return <Dashboard pw={pw} onLogout={() => { sessionStorage.removeItem(KEY); setPw(null); }} onPwChange={(p) => { sessionStorage.setItem(KEY, p); setPw(p); }} />;
}

function Login({ onOk }: { onOk: (p: string) => void }) {
  const doLogin = useServerFn(login);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle className="font-display text-3xl">Administración</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={async (e) => {
            e.preventDefault(); setBusy(true);
            try { await doLogin({ data: { password: value } }); onOk(value); }
            catch (err) { toast.error((err as Error).message); }
            finally { setBusy(false); }
          }}>
            <div className="space-y-2"><Label htmlFor="pw">Clave</Label><Input id="pw" type="password" value={value} onChange={(e) => setValue(e.target.value)} autoFocus /></div>
            <Button className="w-full" disabled={busy || !value}>Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function label(key: string, period: Period) {
  if (period === "año") return key;
  const [y, m, d] = key.split("-");
  return period === "mes" ? `${m}/${y}` : `${d}/${m}/${y}`;
}

function Dashboard({ pw, onLogout, onPwChange }: { pw: string; onLogout: () => void; onPwChange: (p: string) => void }) {
  const fetchStats = useServerFn(listStats);
  const save = useServerFn(saveDay);
  const del = useServerFn(deleteDay);
  const chg = useServerFn(changePassword);
  const [rows, setRows] = useState<Row[]>([]);
  const [period, setPeriod] = useState<Period>("mes");
  const [mode, setMode] = useState<"grafico" | "texto">("grafico");
  const [form, setForm] = useState({ day: new Date().toISOString().slice(0, 10), reservas: "", cancelaciones: "" });
  const [newPw, setNewPw] = useState("");

  const load = async () => {
    try { setRows(await fetchStats({ data: { password: pw } })); }
    catch (e) { toast.error((e as Error).message); if ((e as Error).message === "Clave incorrecta") onLogout(); }
  };
  useEffect(() => { load(); }, [pw]);

  const data = useMemo(() => aggregate(rows, period).map((r) => ({ ...r, label: label(r.day, period) })), [rows, period]);
  const totals = data.reduce((a, r) => ({ reservas: a.reservas + r.reservas, cancelaciones: a.cancelaciones + r.cancelaciones }), { reservas: 0, cancelaciones: 0 });

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-accent">Administración</p>
          <h1 className="text-4xl font-bold">Reservas y cancelaciones</h1>
        </div>
        <Button variant="outline" onClick={onLogout}>Salir</Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total reservas</p><p className="font-display text-5xl text-primary">{totals.reservas}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total cancelaciones</p><p className="font-display text-5xl text-accent">{totals.cancelaciones}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList><TabsTrigger value="dia">Día</TabsTrigger><TabsTrigger value="mes">Mes</TabsTrigger><TabsTrigger value="año">Año</TabsTrigger></TabsList>
          </Tabs>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "grafico" | "texto")}>
            <TabsList><TabsTrigger value="grafico">Gráfico</TabsTrigger><TabsTrigger value="texto">Texto</TabsTrigger></TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? <p className="py-10 text-center text-muted-foreground">Aún no hay datos. Añade el primer día abajo.</p> : mode === "grafico" ? (
            <ChartContainer config={chartConfig} className="h-80 w-full">
              <BarChart data={data}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="reservas" fill="var(--color-reservas)" radius={4} />
                <Bar dataKey="cancelaciones" fill="var(--color-cancelaciones)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>{period === "dia" ? "Día" : period === "mes" ? "Mes" : "Año"}</TableHead><TableHead className="text-right">Reservas</TableHead><TableHead className="text-right">Cancelaciones</TableHead>{period === "dia" && <TableHead />}</TableRow></TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.day}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell className="text-right">{r.reservas}</TableCell>
                    <TableCell className="text-right">{r.cancelaciones}</TableCell>
                    {period === "dia" && <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={async () => { await del({ data: { password: pw, day: r.day } }); load(); }}>Borrar</Button></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter><TableRow><TableCell>Total</TableCell><TableCell className="text-right">{totals.reservas}</TableCell><TableCell className="text-right">{totals.cancelaciones}</TableCell>{period === "dia" && <TableCell />}</TableRow></TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Añadir o corregir un día</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={async (e) => {
              e.preventDefault();
              try {
                await save({ data: { password: pw, day: form.day, reservas: Number(form.reservas || 0), cancelaciones: Number(form.cancelaciones || 0) } });
                toast.success("Guardado"); setForm({ ...form, reservas: "", cancelaciones: "" }); load();
              } catch (err) { toast.error((err as Error).message); }
            }}>
              <div className="space-y-1"><Label htmlFor="day">Fecha</Label><Input id="day" type="date" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label htmlFor="res">Reservas</Label><Input id="res" type="number" min={0} value={form.reservas} onChange={(e) => setForm({ ...form, reservas: e.target.value })} /></div>
                <div className="space-y-1"><Label htmlFor="can">Cancelaciones</Label><Input id="can" type="number" min={0} value={form.cancelaciones} onChange={(e) => setForm({ ...form, cancelaciones: e.target.value })} /></div>
              </div>
              <Button>Guardar</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cambiar clave</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={async (e) => {
              e.preventDefault();
              try { await chg({ data: { password: pw, newPassword: newPw } }); onPwChange(newPw); setNewPw(""); toast.success("Clave cambiada"); }
              catch (err) { toast.error((err as Error).message); }
            }}>
              <div className="space-y-1"><Label htmlFor="npw">Nueva clave</Label><Input id="npw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
              <Button variant="secondary" disabled={newPw.length < 6}>Cambiar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
