import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateHash } from "@/lib/hash";
import { parseCsv, toFloat, toInt } from "@/lib/csv";
import type { ApiResponse } from "@/types";

const BATCH_SIZE = 500;
const CSV_PATH = process.env.DATA_CSV_PATH || "/data/output/kpis_par_commune.csv";

const KNOWN_COORDS: Record<string, { lat: number; lon: number }> = {
  "75056": { lat: 48.8566, lon: 2.3522 },
  "69123": { lat: 45.7640, lon: 4.8357 },
  "13055": { lat: 43.2965, lon: 5.3698 },
  "76095": { lat: 49.4598, lon: 1.1198 },
};

function isValidRow(row: Record<string, string>): boolean {
  if (!row.code_insee || row.code_insee.trim() === "") return false;
  if (!row.nom_standard || row.nom_standard.trim() === "") return false;
  const score = toFloat(row.score_potentiel);
  if (isNaN(score) || score < 0 || score > 100) return false;
  const lat = toFloat(row.latitude_centre);
  const lon = toFloat(row.longitude_centre);
  const known = KNOWN_COORDS[row.code_insee];
  if (!known && (lat === 0 || lon === 0 || isNaN(lat) || isNaN(lon))) return false;
  if (lat !== 0 && (lat < -90 || lat > 90)) return false;
  if (lon !== 0 && (lon < -180 || lon > 180)) return false;
  const pop = toInt(row.population);
  if (pop < 0) return false;
  return true;
}

export async function POST(): Promise<NextResponse<ApiResponse<{ rawCount: number; transformedCount: number; skipped: number }>>> {
  try {
    const rows = parseCsv(CSV_PATH);
    if (rows.length === 0)
      return NextResponse.json(
        { success: false, data: { rawCount: 0, transformedCount: 0, skipped: 0 }, error: "CSV vide ou introuvable" },
        { status: 400 },
      );

    const validRows = rows.filter(isValidRow);
    const skipped = rows.length - validRows.length;

    await prisma.kpiData.deleteMany();
    await prisma.transformedData.deleteMany();
    await prisma.rawData.deleteMany();

    let rawCount = 0;
    let transformedCount = 0;

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);

      await prisma.rawData.createMany({
        data: batch.map((row) => ({
          hash: generateHash(row),
          raw: row as object,
        })),
      });
      rawCount += batch.length;

      await prisma.transformedData.createMany({
        data: batch.map((row) => {
          const known = KNOWN_COORDS[row.code_insee];
          const lat = known ? known.lat : toFloat(row.latitude_centre);
          const lon = known ? known.lon : toFloat(row.longitude_centre);
          return {
            codeInsee: row.code_insee,
            nom: row.nom_standard,
            depCode: row.dep_code ?? "",
            depNom: row.dep_nom ?? "",
            regNom: row.reg_nom ?? "",
            codePostal: row.code_postal || null,
            population: toInt(row.population),
            densite: toFloat(row.densite),
            latitude: lat,
            longitude: lon,
            scorePotentiel: toFloat(row.score_potentiel),
            rang: toInt(row.rang),
            nbCoproprietes: toFloat(row.nb_coproprietes),
            totalLotsStationnement: toFloat(row.total_lots_stationnement),
            tauxMotorisation: toFloat(row.taux_motorisation),
            partCollectif: toFloat(row.part_collectif),
            tauxVoitureSansGarage: toFloat(row.taux_voiture_sans_garage),
            indiceTensionStationnement: toFloat(row.indice_tension_stationnement),
            densiteOpportunite: toFloat(row.densite_opportunite),
            grilleTexte: row.grille_densite_texte || null,
            zoneAbc: row.zone_abc || null,
            tensionImmobiliere: row.tension_immobiliere ? toFloat(row.tension_immobiliere) : null,
            scoreInfraRecharge: row.score_infra_recharge ? toFloat(row.score_infra_recharge) : null,
            scoreTensionImmo: row.score_tension_immo ? toFloat(row.score_tension_immo) : null,
          };
        }),
      });
      transformedCount += batch.length;
    }

    // Calcul et persistance des KPIs agrégés
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

    await prisma.kpiData.create({
      data: {
        label: "global",
        totalCommunes,
        avgScore: Math.round((aggregation._avg.scorePotentiel ?? 0) * 100) / 100,
        totalCoproprietes: Math.round(aggregation._sum.nbCoproprietes ?? 0),
        totalLotsStationnement: Math.round(aggregation._sum.totalLotsStationnement ?? 0),
        avgTensionStationnement: Math.round((aggregation._avg.indiceTensionStationnement ?? 0) * 100) / 100,
        avgDensiteOpportunite: Math.round((aggregation._avg.densiteOpportunite ?? 0) * 100) / 100,
        topCommuneNom: topCommune?.nom ?? null,
        topCommuneDep: topCommune?.depNom ?? null,
        topCommuneScore: topCommune?.scorePotentiel ?? null,
      },
    });

    return NextResponse.json({ success: true, data: { rawCount, transformedCount, skipped } });
  } catch (error) {
    return NextResponse.json(
      { success: false, data: { rawCount: 0, transformedCount: 0, skipped: 0 }, error: String(error) },
      { status: 500 },
    );
  }
}
