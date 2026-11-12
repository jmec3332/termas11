import { describe, it, expect } from "vitest";
import { canCancel, saunasNeeded, tinasNeeded, isValidPhone, priceFor, DEFAULT_PRICES, stats, type Reservation } from "./termas";

const base: Reservation = { id: "1", code: "X", createdAt: "", date: "2026-03-10", packageId: "tina", adults: 2, kids: 0, name: "", phone: "", email: "", tinaSlot: "11:00", saunaSlot: null, tinaUnits: 2, saunaUnits: 0, season: "baja", total: 32000, status: "confirmada", cancelledAt: null, demo: false };

describe("reglas Termas", () => {
  it("un grupo de 4 necesita 4 tinas", () => expect(tinasNeeded(4)).toBe(4));
  it("sauna: 1-4 personas 1 unidad, 5-6 personas 2", () => { expect(saunasNeeded(4)).toBe(1); expect(saunasNeeded(5)).toBe(2); expect(saunasNeeded(6)).toBe(2); });
  it("precio Día Completo temporada alta 2 personas", () => expect(priceFor(DEFAULT_PRICES, "alta", "completo", 2)).toBe(50000));
  it("celular chileno de 9 dígitos que empieza en 9", () => { expect(isValidPhone("912345678")).toBe(true); expect(isValidPhone("+56 9 1234 5678")).toBe(true); expect(isValidPhone("812345678")).toBe(false); expect(isValidPhone("91234567")).toBe(false); });
  it("cancelar con más de 24 h sí, con menos no", () => {
    expect(canCancel(base, new Date("2026-03-09T10:00:00"))).toBe(true);
    expect(canCancel(base, new Date("2026-03-09T12:00:00"))).toBe(false);
  });
  it("estadísticas separan reservas, cancelaciones y facturación", () => {
    const s = stats([base, { ...base, id: "2", status: "cancelada" }], "mes");
    expect(s).toEqual([{ key: "2026-03", reservas: 1, cancelaciones: 1, facturacion: 32000, tinas: 2, saunas: 0 }]);
  });
});
