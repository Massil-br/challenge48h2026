"""
ParkShare - Génération du GeoJSON enrichi avec les scores pour la partie Dev
"""

import json
import pandas as pd

OUTPUT = "output"

print("Chargement des scores...")
df = pd.read_csv(f"{OUTPUT}/kpis_par_commune.csv", dtype={"code_insee": str})
scores = df.set_index("code_insee")[[
    "nom_standard", "dep_nom", "reg_nom", "population", "densite",
    "score_potentiel", "rang",
    "nb_coproprietes", "total_lots_stationnement", "part_copro_avec_parking",
    "taux_motorisation", "part_collectif", "taux_voiture_sans_garage",
    "revenu_median", "copro_par_km2",
    "indice_tension_stationnement", "densite_opportunite",
]].to_dict(orient="index")

print("Chargement du GeoJSON (32 MB)...")
with open("raw/communes_contours_100m.geojson", "r") as f:
    geojson = json.load(f)

print("Enrichissement des features...")
enriched = 0
features_out = []
for feature in geojson["features"]:
    code = feature["properties"]["code"]
    if code in scores:
        data = scores[code]
        for key, val in data.items():
            if pd.isna(val) if isinstance(val, float) else False:
                feature["properties"][key] = None
            else:
                feature["properties"][key] = val
        features_out.append(feature)
        enriched += 1

geojson_out = {
    "type": "FeatureCollection",
    "features": features_out
}

outpath = f"{OUTPUT}/communes_scored.geojson"
print(f"Écriture de {enriched} communes scorées...")
with open(outpath, "w") as f:
    json.dump(geojson_out, f)

import os
size = os.path.getsize(outpath) / 1024 / 1024
print(f"  -> {outpath} ({size:.1f} MB, {enriched} communes)")
print("Terminé !")
