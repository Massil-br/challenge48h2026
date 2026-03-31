"use client";

import { useState, useMemo } from "react";
import type { DataFilters, TransformedDataEntry } from "@/types";

interface FiltersProps {
  onFilter: (filters: DataFilters) => void;
  data: TransformedDataEntry[];
}

const SEL = "bg-card border border-card-border text-foreground rounded-lg px-3 py-2 text-sm focus:border-accent outline-none";
const SLIDER = "w-full h-2 bg-card-border rounded-lg appearance-none cursor-pointer accent-accent";

interface RangeStats {
  min: number;
  max: number;
}

function computeStats(data: TransformedDataEntry[]): {
  score: RangeStats;
  population: RangeStats;
  tension: RangeStats;
} {
  if (data.length === 0) return {
    score: { min: 0, max: 100 },
    population: { min: 0, max: 100000 },
    tension: { min: 0, max: 5000 },
  };
  
  let scoreMin = Infinity, scoreMax = -Infinity;
  let popMin = Infinity, popMax = -Infinity;
  let tensionMin = Infinity, tensionMax = -Infinity;

  for (const d of data) {
    if (d.scorePotentiel < scoreMin) scoreMin = d.scorePotentiel;
    if (d.scorePotentiel > scoreMax) scoreMax = d.scorePotentiel;
    if (d.population < popMin) popMin = d.population;
    if (d.population > popMax) popMax = d.population;
    if (d.indiceTensionStationnement < tensionMin) tensionMin = d.indiceTensionStationnement;
    if (d.indiceTensionStationnement > tensionMax) tensionMax = d.indiceTensionStationnement;
  }

  return {
    score: { min: Math.floor(scoreMin), max: Math.ceil(scoreMax) },
    population: { min: 0, max: Math.ceil(popMax / 1000) * 1000 },
    tension: { min: 0, max: Math.ceil(tensionMax / 100) * 100 },
  };
}

const GRILLE_ORDER = [
  "Grands centres urbains",
  "Centres urbains intermédiaires",
  "Ceintures urbaines",
  "Petites villes",
  "Bourgs ruraux",
  "Rural à habitat dispersé",
  "Rural à habitat très dispersé",
];

export default function Filters({ onFilter, data }: FiltersProps) {
  const [filters, setLocal] = useState<DataFilters>({ sortBy: "scorePotentiel", sortOrder: "desc" });

  const stats = useMemo(() => computeStats(data), [data]);

  const regions = useMemo(() => [...new Set(data.map((d) => d.regNom))].filter(Boolean).sort(), [data]);
  
  const departements = useMemo(() => {
    const filtered = filters.region ? data.filter((d) => d.regNom === filters.region) : data;
    return [...new Set(filtered.map((d) => d.depNom))].filter(Boolean).sort();
  }, [data, filters.region]);
  
  const grilles = useMemo(() => {
    const existing = new Set(data.map((d) => d.grilleTexte).filter(Boolean));
    return GRILLE_ORDER.filter((g) => existing.has(g));
  }, [data]);

  const zonesAbc = useMemo(() => {
    const zones = [...new Set(data.map((d) => d.zoneAbc).filter(Boolean))] as string[];
    const order = ["Abis", "A", "B1", "B2", "C"];
    return zones.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [data]);

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

  const formatPop = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

  return (
    <div className="bg-card border border-card-border rounded-xl p-4 space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
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
          <label className="text-xs text-muted block mb-1">Type de commune</label>
          <select value={filters.grilleTexte ?? ""} onChange={(e) => update({ grilleTexte: e.target.value || undefined })} className={SEL}>
            <option value="">Tous types</option>
            {grilles.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted block mb-1">Zone tension immo.</label>
          <select value={filters.zoneAbc ?? ""} onChange={(e) => update({ zoneAbc: e.target.value || undefined })} className={SEL}>
            <option value="">Toutes zones</option>
            {zonesAbc.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div>
          <label className="text-xs text-muted block mb-2">
            Score : {filters.scoreMin ?? stats.score.min} — {filters.scoreMax ?? stats.score.max}
          </label>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted w-8">{stats.score.min}</span>
            <input
              type="range"
              min={stats.score.min}
              max={stats.score.max}
              value={filters.scoreMin ?? stats.score.min}
              onChange={(e) => update({ scoreMin: Number(e.target.value) })}
              className={SLIDER}
            />
            <input
              type="range"
              min={stats.score.min}
              max={stats.score.max}
              value={filters.scoreMax ?? stats.score.max}
              onChange={(e) => update({ scoreMax: Number(e.target.value) })}
              className={SLIDER}
            />
            <span className="text-xs text-muted w-8 text-right">{stats.score.max}</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted block mb-2">
            Population : {formatPop(filters.populationMin ?? 0)} — {formatPop(filters.populationMax ?? stats.population.max)}
          </label>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted w-8">0</span>
            <input
              type="range"
              min={0}
              max={stats.population.max}
              step={1000}
              value={filters.populationMin ?? 0}
              onChange={(e) => update({ populationMin: Number(e.target.value) })}
              className={SLIDER}
            />
            <input
              type="range"
              min={0}
              max={stats.population.max}
              step={1000}
              value={filters.populationMax ?? stats.population.max}
              onChange={(e) => update({ populationMax: Number(e.target.value) })}
              className={SLIDER}
            />
            <span className="text-xs text-muted w-12 text-right">{formatPop(stats.population.max)}</span>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted block mb-2">
            Tension stationnement : {filters.tensionMin ?? 0} — {filters.tensionMax ?? stats.tension.max}
          </label>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted w-8">0</span>
            <input
              type="range"
              min={0}
              max={stats.tension.max}
              step={10}
              value={filters.tensionMin ?? 0}
              onChange={(e) => update({ tensionMin: Number(e.target.value) })}
              className={SLIDER}
            />
            <input
              type="range"
              min={0}
              max={stats.tension.max}
              step={10}
              value={filters.tensionMax ?? stats.tension.max}
              onChange={(e) => update({ tensionMax: Number(e.target.value) })}
              className={SLIDER}
            />
            <span className="text-xs text-muted w-12 text-right">{stats.tension.max}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
