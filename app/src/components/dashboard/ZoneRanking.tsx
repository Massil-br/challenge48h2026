"use client";

import { useState } from "react";
import type { TransformedDataEntry } from "@/types";

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 bg-card-border rounded-full h-2 overflow-hidden">
        <div className="bg-accent h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(score * 1.33, 100)}%` }} />
      </div>
      <span className="text-xs font-mono w-10">{score.toFixed(1)}</span>
    </div>
  );
}

const PAGE_SIZE = 50;

interface ZoneRankingProps {
  data: TransformedDataEntry[];
}

/** Affiche les communes dans l'ordre reçu du parent (déjà trié par les filtres) */
export default function ZoneRanking({ data }: ZoneRankingProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = data.slice(0, visibleCount);

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 overflow-auto" style={{ maxHeight: "500px" }}>
      <h3 className="text-accent font-semibold mb-4 text-sm uppercase tracking-wide">
        Communes ({data.length.toLocaleString("fr-FR")})
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted text-xs border-b border-card-border">
            <th className="text-left pb-2">#</th>
            <th className="text-left pb-2">Commune</th>
            <th className="text-left pb-2">Dép.</th>
            <th className="text-left pb-2">Score</th>
            <th className="text-right pb-2">Pop.</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((c, i) => (
            <tr key={c.codeInsee} className="border-b border-card-border/50 hover:bg-accent/5 transition-colors">
              <td className="py-2 font-mono text-accent font-bold text-xs">{i + 1}</td>
              <td className="py-2 font-medium text-xs">{c.nom}</td>
              <td className="py-2 text-muted text-xs">{c.depNom}</td>
              <td className="py-2"><ScoreBar score={c.scorePotentiel} /></td>
              <td className="py-2 text-right font-mono text-xs">{c.population.toLocaleString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {visibleCount < data.length && (
        <button
          onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
          className="mt-3 w-full text-center text-accent text-xs py-2 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors cursor-pointer"
        >
          Voir {Math.min(PAGE_SIZE, data.length - visibleCount)} de plus…
        </button>
      )}
      {data.length === 0 && <p className="text-center text-muted py-6">Aucune donnée</p>}
    </div>
  );
}
