"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { TransformedDataEntry } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Fmt = (value: any, name: any, ...rest: any[]) => [string, string];

const ACCENT = "#eab308";
const ACCENT_LIGHT = "#facc15";
const MUTED = "#737373";
const CARD_BORDER = "#252525";

const PIE_COLORS = ["#eab308", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f"];

const CORRELATION_VARS = [
  { key: "scorePotentiel", label: "Score" },
  { key: "tauxMotorisation", label: "Motorisation" },
  { key: "partCollectif", label: "Collectif" },
  { key: "densite", label: "Densité pop." },
  { key: "tauxVoitureSansGarage", label: "Sans garage" },
  { key: "densiteOpportunite", label: "Densité copro" },
  { key: "nbCoproprietes", label: "Nb copro" },
  { key: "totalLotsStationnement", label: "Lots parking" },
] as const;

type VarKey = (typeof CORRELATION_VARS)[number]["key"];

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

function getCorrelationColor(r: number): string {
  const absR = Math.abs(r);
  if (r > 0) {
    if (absR > 0.7) return "#166534";
    if (absR > 0.4) return "#22c55e";
    if (absR > 0.2) return "#86efac";
    return "#dcfce7";
  } else {
    if (absR > 0.7) return "#991b1b";
    if (absR > 0.4) return "#ef4444";
    if (absR > 0.2) return "#fca5a5";
    return "#fee2e2";
  }
}

interface ChartsProps {
  data: TransformedDataEntry[];
}

export default function Charts({ data }: ChartsProps) {
  // Top 15 communes by score
  const top15 = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.scorePotentiel - a.scorePotentiel)
        .slice(0, 15)
        .map((d) => ({ nom: d.nom, score: Math.round(d.scorePotentiel * 10) / 10 })),
    [data],
  );

  // Scatter: motorisation vs densite opportunite (sample 200 for perf)
  const scatter = useMemo(() => {
    const sampled = data.length > 200
      ? data.filter((_, i) => i % Math.ceil(data.length / 200) === 0)
      : data;
    return sampled.map((d) => ({
      x: d.tauxMotorisation,
      y: d.densiteOpportunite,
      z: d.population,
      nom: d.nom,
    }));
  }, [data]);

  // Distribution by grille densite
  const distribution = useMemo(() => {
    const map = new Map<string, { count: number; avgScore: number; totalScore: number }>();
    for (const d of data) {
      const key = d.grilleTexte ?? "Non classé";
      const entry = map.get(key) ?? { count: 0, avgScore: 0, totalScore: 0 };
      entry.count++;
      entry.totalScore += d.scorePotentiel;
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([name, v]) => ({ name, count: v.count, avgScore: Math.round((v.totalScore / v.count) * 10) / 10 }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [data]);

  // Top 10 departments by avg score
  const topDepts = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const d of data) {
      const entry = map.get(d.depNom) ?? { total: 0, count: 0 };
      entry.total += d.scorePotentiel;
      entry.count++;
      map.set(d.depNom, entry);
    }
    return [...map.entries()]
      .map(([dep, v]) => ({ dep, avgScore: Math.round((v.total / v.count) * 10) / 10 }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);
  }, [data]);

  const correlationMatrix = useMemo(() => {
    const vectors: Record<VarKey, number[]> = {} as Record<VarKey, number[]>;
    for (const v of CORRELATION_VARS) vectors[v.key] = [];
    for (const d of data) {
      for (const v of CORRELATION_VARS) {
        const val = d[v.key as keyof TransformedDataEntry];
        vectors[v.key].push(typeof val === "number" ? val : 0);
      }
    }
    const matrix: { row: string; col: string; r: number }[] = [];
    for (const v1 of CORRELATION_VARS) {
      for (const v2 of CORRELATION_VARS) {
        const r = pearsonCorrelation(vectors[v1.key], vectors[v2.key]);
        matrix.push({ row: v1.label, col: v2.label, r: Math.round(r * 100) / 100 });
      }
    }
    return matrix;
  }, [data]);

  const [selectedCell, setSelectedCell] = useState<{ row: string; col: string; r: number } | null>(null);

  const scatterForCorrelation = useMemo(() => {
    if (!selectedCell || selectedCell.row === selectedCell.col) return null;
    const v1 = CORRELATION_VARS.find((v) => v.label === selectedCell.row);
    const v2 = CORRELATION_VARS.find((v) => v.label === selectedCell.col);
    if (!v1 || !v2) return null;
    const sampled = data.length > 300 ? data.filter((_, i) => i % Math.ceil(data.length / 300) === 0) : data;
    return sampled.map((d) => ({
      x: d[v1.key as keyof TransformedDataEntry] as number,
      y: d[v2.key as keyof TransformedDataEntry] as number,
      nom: d.nom,
    }));
  }, [data, selectedCell]);

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Bar Chart - Top 15 communes */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="text-accent font-semibold mb-4 text-sm uppercase tracking-wide">
          Top 15 communes — Score de potentiel
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={top15} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CARD_BORDER} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: MUTED, fontSize: 11 }} />
            <YAxis type="category" dataKey="nom" width={140} tick={{ fill: "#f5f5f5", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#141414", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, color: "#f5f5f5" }}
              formatter={((value: any) => [`${value}/100`, "Score"]) as Fmt}
            />
            <Bar dataKey="score" fill={ACCENT} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart - Top 10 departments */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="text-accent font-semibold mb-4 text-sm uppercase tracking-wide">
          Top 10 départements — Score moyen
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topDepts} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CARD_BORDER} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: MUTED, fontSize: 11 }} />
            <YAxis type="category" dataKey="dep" width={140} tick={{ fill: "#f5f5f5", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#141414", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, color: "#f5f5f5" }}
              formatter={((value: any) => [`${value}/100`, "Score moy."]) as Fmt}
            />
            <Bar dataKey="avgScore" fill={ACCENT_LIGHT} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scatter Plot - Motorisation vs Opportunité */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="text-accent font-semibold mb-4 text-sm uppercase tracking-wide">
          Motorisation vs Densité d'opportunité
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CARD_BORDER} />
            <XAxis
              type="number" dataKey="x" name="Motorisation (%)"
              tick={{ fill: MUTED, fontSize: 11 }}
              label={{ value: "Taux motorisation (%)", position: "bottom", fill: MUTED, fontSize: 11 }}
            />
            <YAxis
              type="number" dataKey="y" name="Densité opportunité"
              tick={{ fill: MUTED, fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="z" range={[20, 400]} name="Population" />
            <Tooltip
              contentStyle={{ background: "#141414", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, color: "#f5f5f5" }}
              formatter={((value: any, name: any) => [
                String(name) === "Population" ? Number(value).toLocaleString("fr-FR") : String(Math.round(Number(value) * 100) / 100),
                String(name),
              ]) as Fmt}
              labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.nom ?? ""}
            />
            <Scatter data={scatter} fill={ACCENT} fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart - Distribution par grille de densité */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="text-accent font-semibold mb-4 text-sm uppercase tracking-wide">
          Répartition par grille de densité
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={distribution}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={130}
              label={((props: any) =>
                `${props.name ?? ""} (${((props.percent ?? 0) * 100).toFixed(0)}%)`) as any
              }
              labelLine={{ stroke: MUTED }}
            >
              {distribution.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#141414", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, color: "#f5f5f5" }}
              formatter={((value: any, name: any) => [
                `${Number(value).toLocaleString("fr-FR")} communes`,
                String(name),
              ]) as Fmt}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Heatmap - Matrice de corrélation */}
      <div className="bg-card border border-card-border rounded-xl p-5 lg:col-span-2">
        <h3 className="text-accent font-semibold mb-4 text-sm uppercase tracking-wide">
          Matrice de corrélation — Cliquez sur une cellule pour voir le nuage de points
        </h3>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-1"></th>
                  {CORRELATION_VARS.map((v) => (
                    <th key={v.key} className="p-1 text-muted font-normal -rotate-45 origin-left h-16 whitespace-nowrap">
                      {v.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CORRELATION_VARS.map((v1) => (
                  <tr key={v1.key}>
                    <td className="p-1 text-muted text-right pr-2 whitespace-nowrap">{v1.label}</td>
                    {CORRELATION_VARS.map((v2) => {
                      const cell = correlationMatrix.find((c) => c.row === v1.label && c.col === v2.label);
                      const r = cell?.r ?? 0;
                      const isSelected = selectedCell?.row === v1.label && selectedCell?.col === v2.label;
                      return (
                        <td
                          key={v2.key}
                          onClick={() => v1.key !== v2.key && setSelectedCell({ row: v1.label, col: v2.label, r })}
                          className={`w-10 h-10 text-center font-mono cursor-pointer transition-all ${
                            isSelected ? "ring-2 ring-accent" : ""
                          } ${v1.key === v2.key ? "cursor-default" : "hover:ring-1 hover:ring-white/50"}`}
                          style={{ backgroundColor: getCorrelationColor(r), color: Math.abs(r) > 0.4 ? "#fff" : "#000" }}
                          title={`${v1.label} × ${v2.label}: r = ${r}`}
                        >
                          {r.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted">
              <span>-1</span>
              <div className="flex h-3">
                {["#991b1b", "#ef4444", "#fca5a5", "#fee2e2", "#dcfce7", "#86efac", "#22c55e", "#166534"].map((c) => (
                  <div key={c} className="w-6 h-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span>+1</span>
              <span className="ml-2">Corrélation négative ← → positive</span>
            </div>
          </div>

          {scatterForCorrelation && selectedCell && (
            <div className="flex-1 min-w-[300px]">
              <p className="text-muted text-xs mb-2">
                {selectedCell.row} vs {selectedCell.col} (r = {selectedCell.r})
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CARD_BORDER} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    tick={{ fill: MUTED, fontSize: 10 }}
                    label={{ value: selectedCell.row, position: "bottom", fill: MUTED, fontSize: 10 }}
                  />
                  <YAxis type="number" dataKey="y" tick={{ fill: MUTED, fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#141414", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, color: "#f5f5f5" }}
                    labelFormatter={(_: any, payload: any) => payload?.[0]?.payload?.nom ?? ""}
                  />
                  <Scatter data={scatterForCorrelation} fill={ACCENT} fillOpacity={0.7} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
