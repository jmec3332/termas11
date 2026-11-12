import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTermas } from "@/hooks/use-termas";
import { canCancel, type Reservation } from "@/lib/termas";

export function CancelButton({ r }: { r: Reservation }) {
  const { update } = useTermas();
  if (r.status !== "confirmada") return null;
  if (!canCancel(r, new Date()))
    return <p className="rounded-md border border-destructive p-3 text-sm text-destructive">Faltan menos de 24 horas para la visita: ya no se puede cancelar en línea. Para cambios, contactar directamente al recinto.</p>;
  return (
    <Button variant="destructive" className="w-full" onClick={() => {
      if (!confirm(`¿Cancelar la reserva ${r.code}? Los turnos quedarán libres.`)) return;
      update((d) => ({ ...d, reservations: d.reservations.map((x) => (x.id === r.id ? { ...x, status: "cancelada", cancelledAt: new Date().toISOString() } : x)) }));
      toast.success("Reserva cancelada. Los turnos quedaron libres.");
    }}>Cancelar visita</Button>
  );
}
