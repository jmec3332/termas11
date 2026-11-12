import { Button } from "@/components/ui/button";
import { PACKAGES, clp, icsFor, type Reservation } from "@/lib/termas";

export function fmtDate(iso: string) {
  const t = new Date(iso + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function download(name: string, content: Blob) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(content); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

async function pdf(r: Reservation) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pkg = PACKAGES.find((p) => p.id === r.packageId)!;
  doc.setFontSize(20); doc.text("Termas Punulaf", 20, 25);
  doc.setFontSize(12);
  const lines = [
    `Código: ${r.code}`, `Nombre: ${r.name}`, `Celular: +56 ${r.phone}`, `Paquete: ${pkg.name}`, `Fecha: ${fmtDate(r.date)}`,
    `Personas: ${r.adults}${r.kids ? ` + ${r.kids} menor(es) de 4 años` : ""}`,
    r.tinaSlot ? `Tina: ${r.tinaSlot} (${r.tinaUnits} tina/s, 45 min)` : "", r.saunaSlot ? `Sauna: ${r.saunaSlot} (${r.saunaUnits} sauna/s, 30 min)` : "",
    `Total: ${clp(r.total)}`, `Estado: ${r.status}`, "", "Llevar traje de baño y toalla. Llegar 15 minutos antes.",
  ].filter((l, i) => l !== "" || i === 10);
  lines.forEach((l, i) => doc.text(l, 20, 40 + i * 8));
  doc.save(`reserva-${r.code}.pdf`);
}

export function ReservationCard({ r, actions = true }: { r: Reservation; actions?: boolean }) {
  const pkg = PACKAGES.find((p) => p.id === r.packageId)!;
  const msg = encodeURIComponent(`Reserva Termas Punulaf ${r.code}: ${pkg.name}, ${fmtDate(r.date)}${r.tinaSlot ? `, tina ${r.tinaSlot}` : ""}${r.saunaSlot ? `, sauna ${r.saunaSlot}` : ""}. Total ${clp(r.total)}.`);
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-2xl font-black tracking-wide">{r.code}</p>
        <span className={r.status === "confirmada" ? "rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground" : "rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground"}>{r.status}</span>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Nombre</dt><dd>{r.name}</dd>
        <dt className="text-muted-foreground">Paquete</dt><dd>{pkg.name}</dd>
        <dt className="text-muted-foreground">Fecha</dt><dd>{fmtDate(r.date)}</dd>
        <dt className="text-muted-foreground">Grupo</dt><dd>{r.adults} persona/s{r.kids ? ` + ${r.kids} menor/es de 4` : ""}</dd>
        {r.tinaSlot && <><dt className="text-muted-foreground">Tina</dt><dd><span className="rounded bg-tina-soft px-1.5 font-bold text-tina">{r.tinaSlot}</span> · {r.tinaUnits} tina/s</dd></>}
        {r.saunaSlot && <><dt className="text-muted-foreground">Sauna</dt><dd><span className="rounded bg-sauna-soft px-1.5 font-bold text-foreground">{r.saunaSlot}</span> · {r.saunaUnits} sauna/s</dd></>}
        <dt className="text-muted-foreground">Total</dt><dd className="font-bold">{clp(r.total)}</dd>
      </dl>
      {r.status === "confirmada" && <p className="mt-3 rounded-md bg-muted p-2 text-sm">Llevar traje de baño, toalla y llegar 15 minutos antes.</p>}
      {actions && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button asChild variant="secondary"><a href={`https://wa.me/?text=${msg}`} target="_blank" rel="noreferrer">WhatsApp</a></Button>
          <Button variant="outline" onClick={() => download(`reserva-${r.code}.ics`, new Blob([icsFor(r)], { type: "text/calendar" }))}>Descargar .ics</Button>
          <Button variant="outline" onClick={() => pdf(r)}>Descargar PDF</Button>
        </div>
      )}
    </div>
  );
}
