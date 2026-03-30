"use client";

import { useState, useMemo } from "react";
import type { DataFilters, TransformedDataEntry } from "@/types";

interface FiltersProps {
  onFilter: (filters: DataFilters) => void;
  data: TransformedDataEntry[];
}

const SEL = "bg-card border border-card-border text-foreground rounded-lg px-3 py-2 text-sm focus:border-accent outline-none";
const INP = "bg-card border border-card-border text-foreground rounded-lg px-3 py-2 text-sm w-20 focus:border-accent outline-none";

export default function Filters({ onFilter, data }: FiltersProps) {
  const [filters, setLocal] = useState<DataFilters>({ sortBy: "scorePotentiel", sortOrder: "desc" });

  const regions = useMemo(() => [...new Set(data.map((d) => d.regNom))].filter(Boolean).sort(), [data]);
  const departements = useMemo(() => {
    const filtered = filters.region ? data.filter((d) => d.regNom === filters.region) : data;
    return [...new Set(filtered.map((d) => d.depNom))].filter(Boolean).sort();
  }, [data, filters.region]);
  const grilles = useMemo(() => [...new Set(data.map((d) => d.grilleTexte))].filter(Boolean).sort() as string[], [data]);

  const update = (partial: Partial<DataFilters>) => {
    const next = { ...filters, ...partial };
    if (partial.region !== undefined) next.departement = undefined;
    setLocal(next);
  };

  const apply = () => onFilter(filters);

  const reset = () => {
    const defaults: DataFilters = { sortBy: "scorePotentiel", sortOrder: "desc" };
    setLocal(defaults);
    onFilter(defaults);
  };

  return (
    <div className="flex flex-wrap gap-3 items-end bg-card border border-card-border rounded-xl p-4">
      <div>
        <label className="text-xs text-muted block mb-1">Région</label>
        <select value={filters.region ?? ""} onChange={(e) => update({ region: e.target.value || undefined })} className={SEL}>
          <option value="">Toutes</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">Département</label>
        <select value={filters.departement ?? ""} onChange={(e) => update({ departement: e.target.value || undefined })} className={SEL}>
          <option value="">Tous</option>
          {departements.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">Densité</label>
        <select value={filters.grilleTexte ?? ""} onChange={(e) => update({ grilleTexte: e.target.value || undefined })} className={SEL}>
          <option value="">Toutes</option>
          {grilles.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">Score min</label>
        <input type="number" min={0} max={100} value={filters.scoreMin ?? ""} placeholder="0"
          onChange={(e) => update({ scoreMin: e.target.value ? Number(e.target.value) : undefined })} className={INP} />
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">Score max</label>
        <input type="number" min={0} max={100} value={filters.scoreMax ?? ""} placeholder="100"
          onChange={(e) => update({ scoreMax: e.target.value ? Number(e.target.value) : undefined })} className={INP} />
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">Trier par</label>
        <select value={filters.sortBy} onChange={(e) => update({ sortBy: e.target.value as DataFilters["sortBy"] })} className={SEL}>
          <option value="scorePotentiel">Score</option>
          <option value="nom">Nom</option>
          <option value="population">Population</option>
          <option value="indiceTensionStationnement">Tension</option>
          <option value="densiteOpportunite">Opportunité</option>
        </select>
      </div>

      <div>
        <label className="text-xs text-muted block mb-1">Ordre</label>
        <select value={filters.sortOrder} onChange={(e) => update({ sortOrder: e.target.value as DataFilters["sortOrder"] })} className={SEL}>
          <option value="desc">Décroissant</option>
          <option value="asc">Croissant</option>
        </select>
      </div>

      <button onClick={apply}
        className="bg-accent text-black font-semibold rounded-lg px-5 py-2 text-sm hover:bg-accent-light transition-colors cursor-pointer">
        Appliquer
      </button>

      <button onClick={reset}
        className="bg-accent/10 text-accent border border-accent/30 rounded-lg px-4 py-2 text-sm hover:bg-accent/20 transition-colors cursor-pointer">
        Réinitialiser
      </button>
    </div>
  );
}
