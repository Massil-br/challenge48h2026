import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { ApiResponse, DashboardKpis } from "@/types";

/** GET — KPIs agrégés depuis la table kpi_data (pré-calculés au seed) */
export async function GET(): Promise<NextResponse<ApiResponse<DashboardKpis>>> {
  try {
    const cached = await prisma.kpiData.findUnique({ where: { label: "global" } });

    if (cached) {
      const kpis: DashboardKpis = {
        totalCommunes: cached.totalCommunes,
        avgScore: cached.avgScore,
        totalCoproprietes: cached.totalCoproprietes,
        totalLotsStationnement: cached.totalLotsStationnement,
        avgTensionStationnement: cached.avgTensionStationnement,
        avgDensiteOpportunite: cached.avgDensiteOpportunite,
        topCommune: cached.topCommuneNom
          ? { nom: cached.topCommuneNom, depNom: cached.topCommuneDep ?? "", scorePotentiel: cached.topCommuneScore ?? 0 }
          : null,
      };
      return NextResponse.json({ success: true, data: kpis });
    }

    // Fallback: calcul à la volée si la table KPI n'est pas encore peuplée
    const [aggregation, topCommune, totalCommunes] = await Promise.all([
      prisma.transformedData.aggregate({
        _avg: { scorePotentiel: true, indiceTensionStationnement: true, densiteOpportunite: true },
        _sum: { nbCoproprietes: true, totalLotsStationnement: true },
      }),
      prisma.transformedData.findFirst({
        orderBy: { scorePotentiel: "desc" },
        select: { nom: true, depNom: true, scorePotentiel: true },
      }),
      prisma.transformedData.count(),
    ]);

    const kpis: DashboardKpis = {
      totalCommunes,
      avgScore: Math.round((aggregation._avg.scorePotentiel ?? 0) * 100) / 100,
      totalCoproprietes: Math.round(aggregation._sum.nbCoproprietes ?? 0),
      totalLotsStationnement: Math.round(aggregation._sum.totalLotsStationnement ?? 0),
      avgTensionStationnement: Math.round((aggregation._avg.indiceTensionStationnement ?? 0) * 100) / 100,
      avgDensiteOpportunite: Math.round((aggregation._avg.densiteOpportunite ?? 0) * 100) / 100,
      topCommune: topCommune ?? null,
    };

    return NextResponse.json({ success: true, data: kpis });
  } catch (error) {
    return NextResponse.json(
      { success: false, data: {} as DashboardKpis, error: String(error) },
      { status: 500 },
    );
  }
}
