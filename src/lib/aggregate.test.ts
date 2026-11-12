import { describe, it, expect } from "vitest";
import { aggregate } from "./aggregate";
const rows = [
  { day: "2026-01-05", reservas: 3, cancelaciones: 1 },
  { day: "2026-01-20", reservas: 2, cancelaciones: 0 },
  { day: "2026-02-01", reservas: 4, cancelaciones: 2 },
  { day: "2025-12-31", reservas: 1, cancelaciones: 1 },
];
describe("aggregate", () => {
  it("suma por mes", () => {
    expect(aggregate(rows, "mes")).toEqual([
      { day: "2025-12", reservas: 1, cancelaciones: 1 },
      { day: "2026-01", reservas: 5, cancelaciones: 1 },
      { day: "2026-02", reservas: 4, cancelaciones: 2 },
    ]);
  });
  it("suma por año", () => {
    expect(aggregate(rows, "año")).toEqual([
      { day: "2025", reservas: 1, cancelaciones: 1 },
      { day: "2026", reservas: 9, cancelaciones: 3 },
    ]);
  });
});
