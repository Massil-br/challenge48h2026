import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateHash } from "@/lib/hash";
import type { ApiResponse, RawDataEntry, PaginatedResponse } from "@/types";

/** GET — Données brutes paginées (défaut : page 1, 20 résultats) */
export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<RawDataEntry[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    const [data, total] = await Promise.all([
      prisma.rawData.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.rawData.count(),
    ]);

    return NextResponse.json({ success: true, data, total, page, limit });
  } catch (error) {
    return NextResponse.json(
      { success: false, data: [], error: String(error), total: 0, page: 1, limit: 20 },
      { status: 500 },
    );
  }
}

/** POST — Insère une donnée brute après vérification du hash (anti-duplication) */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<RawDataEntry | null>>> {
  try {
    const body = await request.json();
    const hash = generateHash(body);

    const existing = await prisma.rawData.findUnique({ where: { hash } });
    if (existing)
      return NextResponse.json(
        { success: false, data: null, error: "Donnée déjà existante (hash dupliqué)" },
        { status: 409 },
      );

    const entry = await prisma.rawData.create({ data: { hash, raw: body } });
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, error: String(error) }, { status: 500 });
  }
}
