"use client";

import { useMemo } from "react";
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
    </div>
  );
}
