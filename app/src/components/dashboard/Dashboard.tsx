"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import KpiCards from "./KpiCards";
import Filters from "./Filters";
import ZoneMap from "./ZoneMap";
import ZoneRanking from "./ZoneRanking";
import DataTable from "./DataTable";
import Charts from "./Charts";
import Loader from "@/components/ui/Loader";
import type { TransformedDataEntry, DashboardKpis, DataFilters } from "@/types";

const STRING_KEYS = new Set<string>(["nom", "depNom", "regNom", "codeInsee", "grilleTexte"]);

function applyFilters(data: TransformedDataEntry[], filters: DataFilters): TransformedDataEntry[] {
  let result = data;
  if (filters.region) result = result.filter((d) => d.regNom === filters.region);
  if (filters.departement) result = result.filter((d) => d.depNom === filters.departement);
  if (filters.grilleTexte) result = result.filter((d) => d.grilleTexte === filters.grilleTexte);
  if (filters.zoneAbc) result = result.filter((d) => d.zoneAbc === filters.zoneAbc);
  if (filters.scoreMin !== undefined) result = result.filter((d) => d.scorePotentiel >= filters.scoreMin!);
  if (filters.scoreMax !== undefined) result = result.filter((d) => d.scorePotentiel <= filters.scoreMax!);
  if (filters.populationMin !== undefined) result = result.filter((d) => d.population >= filters.populationMin!);
  if (filters.populationMax !== undefined) result = result.filter((d) => d.population <= filters.populationMax!);
  if (filters.tensionMin !== undefined) result = result.filter((d) => d.indiceTensionStationnement >= filters.tensionMin!);
  if (filters.tensionMax !== undefined) result = result.filter((d) => d.indiceTensionStationnement <= filters.tensionMax!);

  const key = filters.sortBy ?? "scorePotentiel";
  const dir = filters.sortOrder === "asc" ? 1 : -1;
  result = [...result];

  if (STRING_KEYS.has(key)) {
    result.sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? ""), "fr") * dir);
  } else {
    result.sort((a, b) => (Number(a[key]) - Number(b[key])) * dir);
  }
  return result;
}

export default function Dashboard() {
  const [data, setData] = useState<TransformedDataEntry[]>([]);
  const [filteredData, setFilteredData] = useState<TransformedDataEntry[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const pendingFilters = useRef<DataFilters>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dataRes, kpiRes] = await Promise.all([
      fetch("/api/transformed-data").then((r) => r.json()),
      fetch("/api/kpis").then((r) => r.json()),
    ]);
    if (dataRes.success) {
      setData(dataRes.data);
      setFilteredData(applyFilters(dataRes.data, pendingFilters.current));
    }
    if (kpiRes.success) setKpis(kpiRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /** Affiche le loader immédiatement, puis lance le calcul lourd après le paint */
  const handleFilter = useCallback((next: DataFilters) => {
    pendingFilters.current = next;
    setFiltering(true);
  }, []);

  useEffect(() => {
    if (!filtering) return;
    const id = requestAnimationFrame(() => {
      setFilteredData(applyFilters(data, pendingFilters.current));
      setFiltering(false);
    });
    return () => cancelAnimationFrame(id);
  }, [filtering, data]);

  const handleSeed = async () => {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    await fetchAll();
    setSeeding(false);
  };

  const busy = loading || seeding || filtering;
  const loaderLabel = seeding
    ? "Import des 13 000 communes…"
    : loading
      ? "Chargement des données…"
      : "Application des filtres…";

  return (
    <div className="min-h-screen bg-background font-sans">
      {busy && <Loader label={loaderLabel} />}

      <header className="border-b border-card-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background/90 backdrop-blur-sm z-50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-accent">Park</span>Share Analytics
          </h1>
          <p className="text-muted text-sm">Potentiel de partage de parking par commune — Données ouvertes France</p>
        </div>
        <button
          onClick={handleSeed}
          disabled={busy}
          className="bg-accent text-black font-semibold px-5 py-2.5 rounded-lg hover:bg-accent-light transition-colors disabled:opacity-50 cursor-pointer text-sm"
        >
          Initialiser les données
        </button>
      </header>

      <main className="p-6 space-y-6 max-w-[1600px] mx-auto">
        <KpiCards kpis={kpis} />
        <Filters onFilter={handleFilter} data={data} />

        {!loading && data.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-card-border rounded-xl">
            <p className="text-xl text-muted mb-2">Aucune donnée disponible</p>
            <p className="text-muted text-sm">Cliquez sur « Initialiser les données » pour importer le CSV du pipeline</p>
          </div>
        ) : (
          <>
            {data.length > 0 && (
              <p className="text-muted text-xs">{filteredData.length.toLocaleString("fr-FR")} communes affichées sur {data.length.toLocaleString("fr-FR")}</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <ZoneMap data={filteredData} />
              </div>
              <div className="lg:col-span-2">
                <ZoneRanking data={filteredData} />
              </div>
            </div>
            <Charts data={filteredData} />
            <DataTable />
          </>
        )}
      </main>
    </div>
  );
}
