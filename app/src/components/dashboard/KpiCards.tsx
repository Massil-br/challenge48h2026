"use client";

import Card from "@/components/ui/Card";
import type { DashboardKpis } from "@/types";

interface KpiCardsProps {
  kpis: DashboardKpis | null;
}

export default function KpiCards({ kpis }: KpiCardsProps) {
  if (!kpis) return <div className="text-muted text-sm">Chargement des KPIs…</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card title="Communes analysées" value={kpis.totalCommunes.toLocaleString("fr-FR")} />
      <Card title="Score moyen" value={kpis.avgScore} subtitle="sur 100" />
      <Card title="Copropriétés" value={kpis.totalCoproprietes.toLocaleString("fr-FR")} />
      <Card title="Lots stationnement" value={kpis.totalLotsStationnement.toLocaleString("fr-FR")} />
      <Card title="Tension moy." value={kpis.avgTensionStationnement} subtitle="indice" />
      <Card
        title="Top commune"
        value={kpis.topCommune?.nom ?? "—"}
        subtitle={kpis.topCommune ? `${kpis.topCommune.depNom} — ${kpis.topCommune.scorePotentiel}/100` : undefined}
      />
    </div>
  );
}
