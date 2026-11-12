import { createServerFn } from "@tanstack/react-start";

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verify(password: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("admin_settings").select("password_hash").eq("id", 1).single();
  if (error || !data) throw new Error("No se pudo comprobar la clave");
  if (data.password_hash !== (await sha256(password))) throw new Error("Clave incorrecta");
  return supabaseAdmin;
}

const pw = (i: { password: string }) => {
  if (typeof i?.password !== "string" || !i.password) throw new Error("Clave requerida");
  return i;
};

export const login = createServerFn({ method: "POST" })
  .inputValidator(pw)
  .handler(async ({ data }) => {
    await verify(data.password);
    return { ok: true };
  });

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((i: { password: string; newPassword: string }) => {
    pw(i);
    if (typeof i.newPassword !== "string" || i.newPassword.length < 6) throw new Error("La nueva clave debe tener al menos 6 caracteres");
    return i;
  })
  .handler(async ({ data }) => {
    const db = await verify(data.password);
    const { error } = await db.from("admin_settings").update({ password_hash: await sha256(data.newPassword), updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error("No se pudo cambiar la clave");
    return { ok: true };
  });

export const listStats = createServerFn({ method: "POST" })
  .inputValidator(pw)
  .handler(async ({ data }) => {
    const db = await verify(data.password);
    const { data: rows, error } = await db.from("daily_stats").select("day, reservas, cancelaciones").order("day", { ascending: true }).limit(5000);
    if (error) throw new Error("No se pudieron cargar los datos");
    return rows ?? [];
  });

export const saveDay = createServerFn({ method: "POST" })
  .inputValidator((i: { password: string; day: string; reservas: number; cancelaciones: number }) => {
    pw(i);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.day)) throw new Error("Fecha no válida");
    for (const n of [i.reservas, i.cancelaciones]) if (!Number.isInteger(n) || n < 0) throw new Error("Los totales deben ser números enteros positivos");
    return i;
  })
  .handler(async ({ data }) => {
    const db = await verify(data.password);
    const { error } = await db.from("daily_stats").upsert({ day: data.day, reservas: data.reservas, cancelaciones: data.cancelaciones, updated_at: new Date().toISOString() });
    if (error) throw new Error("No se pudo guardar");
    return { ok: true };
  });

export const deleteDay = createServerFn({ method: "POST" })
  .inputValidator((i: { password: string; day: string }) => { pw(i); return i; })
  .handler(async ({ data }) => {
    const db = await verify(data.password);
    await db.from("daily_stats").delete().eq("day", data.day);
    return { ok: true };
  });
