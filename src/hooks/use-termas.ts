import { useCallback, useEffect, useState } from "react";
import { loadDB, saveDB, type DB } from "@/lib/termas";

export function useTermas() {
  const [db, setDb] = useState<DB | null>(null);
  useEffect(() => {
    const sync = () => setDb(loadDB());
    sync();
    window.addEventListener("termas-db", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("termas-db", sync); window.removeEventListener("storage", sync); };
  }, []);
  const update = useCallback((fn: (d: DB) => DB) => { const next = fn(loadDB()); saveDB(next); }, []);
  return { db, update };
}
