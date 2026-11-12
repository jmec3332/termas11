import { Link } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Inicio" },
  { to: "/reservar", label: "Reservar" },
  { to: "/mi-visita", label: "Mi visita" },
  { to: "/graficos", label: "Gráficos" },
  { to: "/admin", label: "Administración" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="font-display text-lg font-black">Termas Punulaf</Link>
        <nav className="-mx-1 flex gap-1 overflow-x-auto text-sm">
          {links.map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/" }} className="whitespace-nowrap rounded-md px-2 py-1 opacity-85 hover:opacity-100" activeProps={{ className: "bg-primary-foreground/15 opacity-100 font-bold" }}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
