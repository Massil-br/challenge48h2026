import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { ApiResponse, TransformedDataEntry } from "@/types";

/** GET — Données transformées avec filtres (region, departement, score, grille, tri) */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<TransformedDataEntry[]>>> {
  try {
    const { searchParams } = new URL(request.url);

    const region = searchParams.get("region") || undefined;
    const departement = searchParams.get("departement") || undefined;
    const scoreMin = searchParams.has("scoreMin") ? Number(searchParams.get("scoreMin")) : undefined;
    const scoreMax = searchParams.has("scoreMax") ? Number(searchParams.get("scoreMax")) : undefined;
    const grilleTexte = searchParams.get("grilleTexte") || undefined;
    const sortBy = searchParams.get("sortBy") || "rang";
    const sortOrder = searchParams.get("sortOrder") || "asc";

    const where: Record<string, unknown> = {};
    if (region) where.regNom = region;
    if (departement) where.depNom = departement;
    if (grilleTexte) where.grilleTexte = grilleTexte;
    if (scoreMin !== undefined || scoreMax !== undefined) {
      const scoreFilter: Record<string, number> = {};
      if (scoreMin !== undefined) scoreFilter.gte = scoreMin;
      if (scoreMax !== undefined) scoreFilter.lte = scoreMax;
      where.scorePotentiel = scoreFilter;
    }

    const data = await prisma.transformedData.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, data: [], error: String(error) }, { status: 500 });
  }
}
