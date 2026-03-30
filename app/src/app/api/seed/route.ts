import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateHash } from "@/lib/hash";
import { parseCsv, toFloat, toInt } from "@/lib/csv";
import type { ApiResponse } from "@/types";

const BATCH_SIZE = 500;
/** Chemin relatif vers le CSV produit par le pipeline data */
const CSV_PATH = "../data/output/kpis_par_commune.csv";

/** POST — Lit le CSV du pipeline data et alimente les tables raw_data + transformed_data */
export async function POST(): Promise<NextResponse<ApiResponse<{ rawCount: number; transformedCount: number }>>> {
  try {
    const rows = parseCsv(CSV_PATH);
    if (rows.length === 0)
      return NextResponse.json(
        { success: false, data: { rawCount: 0, transformedCount: 0 }, error: "CSV vide ou introuvable" },
        { status: 400 },
      );

    await prisma.transformedData.deleteMany();
    await prisma.rawData.deleteMany();

    let rawCount = 0;
    let transformedCount = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      await prisma.rawData.createMany({
        data: batch.map((row) => ({
          hash: generateHash(row),
          raw: row as object,
        })),
      });
      rawCount += batch.length;

      await prisma.transformedData.createMany({
        data: batch.map((row) => ({
          codeInsee: row.code_insee,
          nom: row.nom_standard,
          depCode: row.dep_code ?? "",
          depNom: row.dep_nom ?? "",
          regNom: row.reg_nom ?? "",
          codePostal: row.code_postal || null,
          population: toInt(row.population),
          densite: toFloat(row.densite),
          latitude: toFloat(row.latitude_centre),
          longitude: toFloat(row.longitude_centre),
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
        })),
      });
      transformedCount += batch.length;
    }

    return NextResponse.json({ success: true, data: { rawCount, transformedCount } });
  } catch (error) {
    return NextResponse.json(
      { success: false, data: { rawCount: 0, transformedCount: 0 }, error: String(error) },
      { status: 500 },
    );
  }
}
