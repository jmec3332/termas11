import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import hero from "@/assets/termas-hero.jpg";
import { PACKAGES, DEFAULT_PRICES, clp } from "@/lib/termas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Termas Punulaf · Reserva de tinas y saunas" },
      { name: "description", content: "Reserva tu tina, sauna o día completo en Termas Punulaf. Piscinas termales incluidas." },
      { property: "og:title", content: "Termas Punulaf · Reserva de tinas y saunas" },
      { property: "og:description", content: "Tinas, saunas y piscinas termales frente a la cordillera." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main>
      <section className="relative isolate flex min-h-[70vh] items-center justify-center overflow-hidden">
        <img src={hero} alt="Tinas de madera humeantes frente a la cordillera" width={1600} height={1008} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-hero-overlay" />
        <div className="px-4 text-center text-primary-foreground">
          <h1 className="font-display text-3xl font-black sm:text-5xl">Agua caliente, bosque y cordillera</h1>
          <p className="mx-auto mt-3 max-w-md opacity-90">Tinas, saunas y piscinas termales. Se reserva en un par de minutos.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/reservar">Reservar ahora →</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/mi-visita">Mi visita</Link></Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {PACKAGES.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-bold">{p.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            <p className="mt-3 text-sm">Desde <b>{clp(DEFAULT_PRICES[p.id].baja)}</b> por persona</p>
          </div>
        ))}
      </section>
    </main>
  );
}
