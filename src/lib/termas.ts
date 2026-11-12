// Reglas de negocio y persistencia local (localStorage) de Termas Punulaf.
export type Season = "baja" | "alta";
export type PackageId = "piscinas" | "tina" | "sauna" | "completo";
export type Status = "confirmada" | "cancelada";

export interface Pkg { id: PackageId; name: string; desc: string; tina: boolean; sauna: boolean }
export const PACKAGES: Pkg[] = [
  { id: "piscinas", name: "Piscinas Libres", desc: "Todo el día en piscinas termales.", tina: false, sauna: false },
  { id: "tina", name: "Tina y Piscinas", desc: "1 turno de tina de 45 min + piscinas.", tina: true, sauna: false },
  { id: "sauna", name: "Sauna y Piscinas", desc: "1 turno de sauna de 30 min + piscinas.", tina: false, sauna: true },
  { id: "completo", name: "Día Completo", desc: "1 turno de tina y 1 de sauna en horarios distintos + piscinas.", tina: true, sauna: true },
];
export type Prices = Record<PackageId, Record<Season, number>>;
export const DEFAULT_PRICES: Prices = {
  piscinas: { baja: 12000, alta: 15000 },
  tina: { baja: 16000, alta: 20000 },
  sauna: { baja: 15000, alta: 19000 },
  completo: { baja: 20000, alta: 25000 },
};
export const TINAS_TOTAL = 12;
export const SAUNAS_TOTAL = 5;
export const SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
export const DEFAULT_PASSWORD = "termas2026";

export interface Reservation {
  id: string; code: string; createdAt: string; date: string; packageId: PackageId;
  adults: number; kids: number; name: string; phone: string; email: string;
  tinaSlot: string | null; saunaSlot: string | null; tinaUnits: number; saunaUnits: number;
  season: Season; total: number; status: Status; cancelledAt: string | null; demo: boolean;
}
export interface Settings { season: Season; prices: Prices; password: string; outTinas: number; outSaunas: number }
export interface DB { settings: Settings; reservations: Reservation[] }

// Reglas
export const tinasNeeded = (adults: number) => adults; // menores de 4 comparten tina del adulto
export const saunasNeeded = (adults: number) => Math.ceil(adults / 4);
export const priceFor = (prices: Prices, season: Season, pkg: PackageId, adults: number) => prices[pkg][season] * adults;
export const isValidPhone = (p: string) => /^9\d{8}$/.test(normalizePhone(p));
export function normalizePhone(p: string) {
  let d = p.replace(/\D/g, "");
  if (d.startsWith("56") && d.length === 11) d = d.slice(2);
  return d;
}
export const capacity = (s: Settings) => ({ tinas: Math.max(0, TINAS_TOTAL - s.outTinas), saunas: Math.max(0, SAUNAS_TOTAL - s.outSaunas) });

export function usage(db: DB, date: string, excludeId?: string) {
  const tinas: Record<string, number> = {}, saunas: Record<string, number> = {};
  for (const s of SLOTS) { tinas[s] = 0; saunas[s] = 0; }
  for (const r of db.reservations) {
    if (r.date !== date || r.status !== "confirmada" || r.id === excludeId) continue;
    if (r.tinaSlot) tinas[r.tinaSlot] += r.tinaUnits;
    if (r.saunaSlot) saunas[r.saunaSlot] += r.saunaUnits;
  }
  return { tinas, saunas };
}

/** Horas antes de la visita (primer turno, o 10:00 si solo piscinas). */
export function hoursUntil(r: Pick<Reservation, "date" | "tinaSlot" | "saunaSlot">, now: Date) {
  const slots = [r.tinaSlot, r.saunaSlot].filter(Boolean).sort() as string[];
  const start = new Date(`${r.date}T${slots[0] ?? "10:00"}:00`);
  return (start.getTime() - now.getTime()) / 3600000;
}
export const canCancel = (r: Reservation, now: Date) => r.status === "confirmada" && hoursUntil(r, now) > 24;

export function genCode(existing: Set<string>) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  do { c = "TP-" + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""); } while (existing.has(c));
  return c;
}
export const clp = (n: number) => "$" + n.toLocaleString("es-CL");
export const todayISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function addDays(iso: string, n: number) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return todayISO(d); }

// Persistencia
const KEY = "termas-punulaf-db-v1";
const NAMES = ["Camila Rojas", "Matías González", "Valentina Muñoz", "Benjamín Soto", "Fernanda Díaz", "Joaquín Pérez", "Catalina Silva", "Diego Morales", "Antonia Castro", "Tomás Fuentes", "Javiera Vargas", "Sebastián Reyes"];

export function seedReservations(settings: Settings, now = new Date()): Reservation[] {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const db: DB = { settings, reservations: [] };
  const today = todayISO(now);
  const codes = new Set<string>();
  for (let off = -120; off <= 14; off++) {
    const date = addDays(today, off);
    const n = 2 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      const pkg = PACKAGES[Math.floor(rnd() * 4)];
      const adults = 1 + Math.floor(rnd() * 4);
      const kids = rnd() < 0.2 ? 1 : 0;
      const u = usage(db, date);
      const cap = capacity(settings);
      let tinaSlot: string | null = null, saunaSlot: string | null = null;
      if (pkg.tina) tinaSlot = SLOTS.find((s, k) => (k + i) % 3 === 0 && u.tinas[s] + adults <= cap.tinas) ?? null;
      if (pkg.sauna) saunaSlot = SLOTS.find((s) => s !== tinaSlot && u.saunas[s] + saunasNeeded(adults) <= cap.saunas && rnd() < 0.6) ?? null;
      if ((pkg.tina && !tinaSlot) || (pkg.sauna && !saunaSlot)) continue;
      const season: Season = [11, 0, 1].includes(new Date(date + "T12:00").getMonth()) ? "alta" : "baja";
      const cancelled = rnd() < 0.12;
      let code = ""; do { code = "TP-" + Math.floor(10000 + rnd() * 89999); } while (codes.has(code)); codes.add(code);
      const name = NAMES[Math.floor(rnd() * NAMES.length)];
      db.reservations.push({
        id: `demo-${date}-${i}`, code, createdAt: addDays(date, -3) + "T10:00:00", date, packageId: pkg.id, adults, kids,
        name, phone: "9" + String(10000000 + Math.floor(rnd() * 89999999)), email: "",
        tinaSlot, saunaSlot, tinaUnits: tinaSlot ? tinasNeeded(adults) : 0, saunaUnits: saunaSlot ? saunasNeeded(adults) : 0,
        season, total: priceFor(DEFAULT_PRICES, season, pkg.id, adults), status: cancelled ? "cancelada" : "confirmada",
        cancelledAt: cancelled ? addDays(date, -2) + "T09:00:00" : null, demo: true,
      });
    }
  }
  // Una reserva conocida para probar "Mi visita"
  db.reservations.push({ id: "demo-fija", code: "TP-DEMO1", createdAt: today + "T09:00:00", date: addDays(today, 5), packageId: "completo", adults: 2, kids: 0, name: "Camila Rojas", phone: "912345678", email: "", tinaSlot: "11:00", saunaSlot: "15:00", tinaUnits: 2, saunaUnits: 1, season: settings.season, total: priceFor(DEFAULT_PRICES, settings.season, "completo", 2), status: "confirmada", cancelledAt: null, demo: true });
  return db.reservations;
}

export function loadDB(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch { /* ignore */ }
  const settings: Settings = { season: "baja", prices: DEFAULT_PRICES, password: DEFAULT_PASSWORD, outTinas: 1, outSaunas: 0 };
  const db = { settings, reservations: seedReservations(settings) };
  saveDB(db);
  return db;
}
export function saveDB(db: DB) { localStorage.setItem(KEY, JSON.stringify(db)); window.dispatchEvent(new Event("termas-db")); }

// Estadísticas
export type Period = "dia" | "mes" | "año";
export interface StatRow { key: string; reservas: number; cancelaciones: number; facturacion: number; tinas: number; saunas: number }
export function stats(rows: Reservation[], period: Period): StatRow[] {
  const map = new Map<string, StatRow>();
  for (const r of rows) {
    const key = period === "dia" ? r.date : period === "mes" ? r.date.slice(0, 7) : r.date.slice(0, 4);
    const s = map.get(key) ?? { key, reservas: 0, cancelaciones: 0, facturacion: 0, tinas: 0, saunas: 0 };
    if (r.status === "cancelada") s.cancelaciones++;
    else { s.reservas++; s.facturacion += r.total; s.tinas += r.tinaUnits; s.saunas += r.saunaUnits; }
    map.set(key, s);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

// Sesión de administración (misma clave para Gráficos y Administración)
export const isAuthed = () => sessionStorage.getItem("termas-auth") === "1";
export const setAuthed = (v: boolean) => (v ? sessionStorage.setItem("termas-auth", "1") : sessionStorage.removeItem("termas-auth"));

export function icsFor(r: Reservation) {
  const slot = [r.tinaSlot, r.saunaSlot].filter(Boolean).sort()[0] as string | undefined;
  const d = r.date.replace(/-/g, "");
  const start = slot ? slot.replace(":", "") + "00" : "100000";
  const pkg = PACKAGES.find((p) => p.id === r.packageId)!;
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Termas Punulaf//ES", "BEGIN:VEVENT", `UID:${r.code}@termaspunulaf`, `DTSTART:${d}T${start}`, `DTEND:${d}T180000`, `SUMMARY:Termas Punulaf - ${pkg.name}`, `DESCRIPTION:Código ${r.code}. Llevar traje de baño y toalla. Llegar 15 minutos antes.`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}
