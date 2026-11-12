export type Row = { day: string; reservas: number; cancelaciones: number };
export type Period = "dia" | "mes" | "año";

export function aggregate(rows: Row[], period: Period): Row[] {
  const map = new Map<string, Row>();
  for (const r of rows) {
    const key = period === "dia" ? r.day : period === "mes" ? r.day.slice(0, 7) : r.day.slice(0, 4);
    const cur = map.get(key) ?? { day: key, reservas: 0, cancelaciones: 0 };
    cur.reservas += r.reservas;
    cur.cancelaciones += r.cancelaciones;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}
