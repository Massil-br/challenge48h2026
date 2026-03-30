"""
ParkShare Challenge 48h - Nettoyage des datasets
Produit des fichiers CSV nettoyés dans data/cleaned/
"""

import pandas as pd
import numpy as np
import os
import warnings
warnings.filterwarnings('ignore')

RAW = "raw"
CLEANED = "cleaned"
os.makedirs(CLEANED, exist_ok=True)


def pad_code_commune(code):
    """Uniformise un code commune INSEE sur 5 caractères (ex: '1001' -> '01001')"""
    if pd.isna(code):
        return None
    code = str(code).strip().replace('"', '')
    if len(code) < 5:
        code = code.zfill(5)
    return code


# =============================================================================
# 1. COMMUNES FRANCE (table de référence)
# =============================================================================
print("=" * 60)
print("1/7 - Nettoyage communes_france.csv")
print("=" * 60)

df_communes = pd.read_csv(
    f"{RAW}/communes_france.csv",
    dtype={"code_insee": str, "dep_code": str, "reg_code": str, "epci_code": str, "code_postal": str}
)

cols_communes = [
    "code_insee", "nom_standard", "dep_code", "dep_nom", "reg_code", "reg_nom",
    "epci_code", "epci_nom", "code_postal",
    "population", "superficie_km2", "densite",
    "latitude_centre", "longitude_centre",
    "grille_densite", "grille_densite_texte"
]
df_communes = df_communes[cols_communes].copy()
df_communes["code_insee"] = df_communes["code_insee"].apply(pad_code_commune)

# Filtrer les communes valides (pas les anciennes, pas les COM lointains)
df_communes = df_communes.dropna(subset=["code_insee", "population"])
df_communes["population"] = pd.to_numeric(df_communes["population"], errors="coerce")
df_communes = df_communes[df_communes["population"] > 0]

print(f"  -> {len(df_communes)} communes")
print(f"  -> Colonnes: {list(df_communes.columns)}")
df_communes.to_csv(f"{CLEANED}/communes.csv", index=False)
print(f"  -> Sauvegardé dans {CLEANED}/communes.csv")


# =============================================================================
# 2. MOTORISATION PAR COMMUNE
# =============================================================================
print("\n" + "=" * 60)
print("2/7 - Nettoyage motorisation_commune.csv")
print("=" * 60)

df_motor = pd.read_csv(
    f"{RAW}/motorisation_commune.csv",
    dtype={"geocode_commune": str}
)

# Filtrer sur le millésime 2022
df_motor["annee"] = pd.to_datetime(df_motor["date_mesure"]).dt.year
print(f"  Millésimes disponibles: {sorted(df_motor['annee'].unique())}")

df_motor_2022 = df_motor[df_motor["annee"] == 2022].copy()
df_motor_2022["code_commune"] = df_motor_2022["geocode_commune"].apply(pad_code_commune)

df_motor_clean = df_motor_2022[[
    "code_commune", "libelle_commune",
    "numerateur", "denominateur", "valeur"
]].rename(columns={
    "numerateur": "menages_motorises",
    "denominateur": "menages_total",
    "valeur": "taux_motorisation"
})

df_motor_clean["taux_motorisation"] = pd.to_numeric(df_motor_clean["taux_motorisation"], errors="coerce")
df_motor_clean["menages_motorises"] = pd.to_numeric(df_motor_clean["menages_motorises"], errors="coerce")
df_motor_clean["menages_total"] = pd.to_numeric(df_motor_clean["menages_total"], errors="coerce")

# Dédupliquer si nécessaire
df_motor_clean = df_motor_clean.drop_duplicates(subset=["code_commune"])

print(f"  -> {len(df_motor_clean)} communes (millésime 2022)")
print(f"  -> Taux moyen: {df_motor_clean['taux_motorisation'].mean():.1f}%")
df_motor_clean.to_csv(f"{CLEANED}/motorisation.csv", index=False)
print(f"  -> Sauvegardé dans {CLEANED}/motorisation.csv")


# =============================================================================
# 3. LOGEMENTS INSEE 2022
# =============================================================================
print("\n" + "=" * 60)
print("3/7 - Nettoyage logements INSEE 2022")
print("=" * 60)

df_log = pd.read_csv(
    f"{RAW}/logements_insee/base-cc-logement-2022.CSV",
    sep=";",
    dtype={"CODGEO": str}
)

cols_logements = {
    "CODGEO": "code_commune",
    "P22_LOG": "total_logements",
    "P22_RP": "residences_principales",
    "P22_LOGVAC": "logements_vacants",
    "P22_MAISON": "maisons",
    "P22_APPART": "appartements",
    "P22_MEN": "nb_menages",
    "P22_RP_PROP": "menages_proprietaires",
    "P22_RP_LOC": "menages_locataires",
    "P22_RP_LOCHLMV": "menages_hlm",
    "P22_RP_VOIT1P": "menages_1voiture_plus",
    "P22_RP_VOIT2P": "menages_2voitures_plus",
    "P22_RP_GARL": "menages_avec_garage",
}

df_log_clean = df_log[list(cols_logements.keys())].rename(columns=cols_logements)
df_log_clean["code_commune"] = df_log_clean["code_commune"].apply(pad_code_commune)

# Conversion numérique
for col in df_log_clean.columns:
    if col != "code_commune":
        df_log_clean[col] = pd.to_numeric(df_log_clean[col], errors="coerce")

# Indicateurs dérivés
df_log_clean["part_collectif"] = (
    df_log_clean["appartements"] / df_log_clean["total_logements"] * 100
).round(2)

df_log_clean["part_proprietaires"] = (
    df_log_clean["menages_proprietaires"] / df_log_clean["residences_principales"] * 100
).round(2)

df_log_clean["part_menages_avec_garage"] = (
    df_log_clean["menages_avec_garage"] / df_log_clean["residences_principales"] * 100
).round(2)

df_log_clean["taux_vacance"] = (
    df_log_clean["logements_vacants"] / df_log_clean["total_logements"] * 100
).round(2)

print(f"  -> {len(df_log_clean)} communes")
print(f"  -> Part collectif moyenne: {df_log_clean['part_collectif'].mean():.1f}%")
print(f"  -> Part ménages avec garage moyenne: {df_log_clean['part_menages_avec_garage'].mean():.1f}%")
df_log_clean.to_csv(f"{CLEANED}/logements.csv", index=False)
print(f"  -> Sauvegardé dans {CLEANED}/logements.csv")


# =============================================================================
# 4. REVENUS PAR COMMUNE
# =============================================================================
print("\n" + "=" * 60)
print("4/7 - Nettoyage revenus_commune.csv")
print("=" * 60)

df_rev = pd.read_csv(
    f"{RAW}/revenus_commune.csv",
    sep=";",
    dtype={1: str}  # Code géographique par index
)

# Sélection par index de colonnes (évite les problèmes d'encodage Unicode)
all_cols = list(df_rev.columns)
col_map = {
    all_cols[1]: "code_commune",       # Code géographique
    all_cols[0]: "nom_commune",        # Nom géographique GMS
    all_cols[3]: "nb_menages_fiscaux", # [DISP] Nbre de ménages fiscaux
    all_cols[4]: "nb_personnes",       # [DISP] Nbre de personnes
    all_cols[6]: "revenu_q1",          # [DISP] 1er quartile
    all_cols[7]: "revenu_median",      # [DISP] Médiane
    all_cols[8]: "revenu_q3",          # [DISP] 3e quartile
    all_cols[10]: "revenu_d1",         # [DISP] 1er décile
    all_cols[17]: "revenu_d9",         # [DISP] 9e décile
    all_cols[21]: "part_revenus_activite",  # [DISP] Part revenus d'activité
    all_cols[25]: "part_retraites",    # [DISP] Part pensions retraites
}

df_rev_clean = df_rev[list(col_map.keys())].rename(columns=col_map)
df_rev_clean["code_commune"] = df_rev_clean["code_commune"].apply(pad_code_commune)

for col in df_rev_clean.columns:
    if col not in ["code_commune", "nom_commune"]:
        df_rev_clean[col] = pd.to_numeric(df_rev_clean[col], errors="coerce")

# Indicateur d'écart de revenus
df_rev_clean["ecart_interdecile"] = (df_rev_clean["revenu_d9"] / df_rev_clean["revenu_d1"]).round(2)

df_rev_clean = df_rev_clean.dropna(subset=["revenu_median"])

print(f"  -> {len(df_rev_clean)} communes")
print(f"  -> Revenu médian moyen: {df_rev_clean['revenu_median'].mean():.0f} EUR")
df_rev_clean.to_csv(f"{CLEANED}/revenus.csv", index=False)
print(f"  -> Sauvegardé dans {CLEANED}/revenus.csv")


# =============================================================================
# 5. RNIC - Agrégation par commune
# =============================================================================
print("\n" + "=" * 60)
print("5/7 - Nettoyage et agrégation RNIC T4 2025")
print("=" * 60)

# Lecture par chunks car fichier volumineux (438 MB)
chunks = []
cols_rnic = [
    "code_officiel_commune", "nom_officiel_commune",
    "code_officiel_departement", "nom_officiel_region",
    "nombre_total_de_lots", "nombre_de_lots_a_usage_d_habitation",
    "nombre_de_lots_de_stationnement",
    "periode_de_construction",
    "type_de_syndic_benevole_professionnel_non_connu",
    "long", "lat"
]

print("  Lecture par chunks (fichier 438 MB)...")
for chunk in pd.read_csv(
    f"{RAW}/rnic_t4_2025.csv",
    usecols=cols_rnic,
    dtype={"code_officiel_commune": str, "code_officiel_departement": str},
    chunksize=100000
):
    chunks.append(chunk)
    print(f"    ... {len(chunks) * 100000} lignes lues")

df_rnic = pd.concat(chunks, ignore_index=True)
print(f"  Total: {len(df_rnic)} copropriétés")

# Nettoyage
df_rnic["code_commune"] = df_rnic["code_officiel_commune"].apply(pad_code_commune)
for col in ["nombre_total_de_lots", "nombre_de_lots_a_usage_d_habitation", "nombre_de_lots_de_stationnement"]:
    df_rnic[col] = pd.to_numeric(df_rnic[col], errors="coerce").fillna(0).astype(int)

df_rnic["a_parking"] = (df_rnic["nombre_de_lots_de_stationnement"] > 0).astype(int)

# Agrégation par commune
rnic_agg = df_rnic.groupby("code_commune").agg(
    nb_coproprietes=("code_commune", "size"),
    total_lots=("nombre_total_de_lots", "sum"),
    total_lots_habitation=("nombre_de_lots_a_usage_d_habitation", "sum"),
    total_lots_stationnement=("nombre_de_lots_de_stationnement", "sum"),
    lots_stationnement_moyen=("nombre_de_lots_de_stationnement", "mean"),
    nb_copro_avec_parking=("a_parking", "sum"),
    lots_total_moyen=("nombre_total_de_lots", "mean"),
).reset_index()

rnic_agg["part_copro_avec_parking"] = (
    rnic_agg["nb_copro_avec_parking"] / rnic_agg["nb_coproprietes"] * 100
).round(2)

rnic_agg["lots_stationnement_moyen"] = rnic_agg["lots_stationnement_moyen"].round(1)
rnic_agg["lots_total_moyen"] = rnic_agg["lots_total_moyen"].round(1)

# Agrégation par période de construction
periodes_agg = df_rnic.groupby(["code_commune", "periode_de_construction"]).size().unstack(fill_value=0)
periodes_agg.columns = [f"copro_{col.lower().replace(' ', '_')}" for col in periodes_agg.columns]
periodes_agg = periodes_agg.reset_index()

rnic_final = rnic_agg.merge(periodes_agg, on="code_commune", how="left")

print(f"  -> {len(rnic_final)} communes avec des copropriétés")
print(f"  -> Total lots stationnement: {rnic_agg['total_lots_stationnement'].sum():,.0f}")
print(f"  -> Part copro avec parking (moy): {rnic_agg['part_copro_avec_parking'].mean():.1f}%")
rnic_final.to_csv(f"{CLEANED}/rnic.csv", index=False)
print(f"  -> Sauvegardé dans {CLEANED}/rnic.csv")


# =============================================================================
# 6. DVF 2025 S1 - Agrégation par commune
# =============================================================================
print("\n" + "=" * 60)
print("6/7 - Nettoyage et agrégation DVF 2025 S1")
print("=" * 60)

cols_dvf = [
    "Code departement", "Code commune", "Nature mutation",
    "Valeur fonciere", "Code type local", "Type local",
    "Nombre de lots", "Surface reelle bati", "Nombre pieces principales"
]

chunks_dvf = []
print("  Lecture par chunks...")
for chunk in pd.read_csv(
    f"{RAW}/ValeursFoncieres-2025-S1.txt",
    sep="|",
    usecols=cols_dvf,
    dtype={"Code departement": str, "Code commune": str},
    chunksize=200000
):
    chunks_dvf.append(chunk)
    print(f"    ... {len(chunks_dvf) * 200000} lignes lues")

df_dvf = pd.concat(chunks_dvf, ignore_index=True)
print(f"  Total: {len(df_dvf)} lignes")

# Construire le code commune complet (dep + commune)
df_dvf["code_commune"] = df_dvf["Code departement"].str.strip() + df_dvf["Code commune"].str.strip().str.zfill(3)
df_dvf["code_commune"] = df_dvf["code_commune"].apply(pad_code_commune)

# Nettoyage valeur foncière
df_dvf["Valeur fonciere"] = df_dvf["Valeur fonciere"].astype(str).str.replace(",", ".").str.strip()
df_dvf["valeur"] = pd.to_numeric(df_dvf["Valeur fonciere"], errors="coerce")

# Filtrer les ventes uniquement
df_dvf_ventes = df_dvf[df_dvf["Nature mutation"].str.strip() == "Vente"].copy()

# Identifier les types
df_dvf_ventes["type_clean"] = df_dvf_ventes["Type local"].str.strip()
df_dvf_ventes["is_dependance"] = (df_dvf_ventes["type_clean"].str.contains("pendance", na=False)).astype(int)
df_dvf_ventes["is_appartement"] = (df_dvf_ventes["type_clean"] == "Appartement").astype(int)
df_dvf_ventes["is_maison"] = (df_dvf_ventes["type_clean"] == "Maison").astype(int)
df_dvf_ventes["nb_lots"] = pd.to_numeric(df_dvf_ventes["Nombre de lots"], errors="coerce").fillna(0)

# Agrégation par commune
dvf_agg = df_dvf_ventes.groupby("code_commune").agg(
    nb_ventes_total=("code_commune", "size"),
    nb_ventes_dependances=("is_dependance", "sum"),
    nb_ventes_appartements=("is_appartement", "sum"),
    nb_ventes_maisons=("is_maison", "sum"),
    valeur_fonciere_mediane=("valeur", "median"),
    nb_lots_moyen=("nb_lots", "mean"),
).reset_index()

dvf_agg["part_dependances"] = (
    dvf_agg["nb_ventes_dependances"] / dvf_agg["nb_ventes_total"] * 100
).round(2)

dvf_agg["nb_lots_moyen"] = dvf_agg["nb_lots_moyen"].round(1)

print(f"  -> {len(dvf_agg)} communes avec des transactions")
print(f"  -> Ventes totales: {dvf_agg['nb_ventes_total'].sum():,.0f}")
print(f"  -> dont dépendances (parkings/garages): {dvf_agg['nb_ventes_dependances'].sum():,.0f}")
dvf_agg.to_csv(f"{CLEANED}/dvf.csv", index=False)
print(f"  -> Sauvegardé dans {CLEANED}/dvf.csv")


# =============================================================================
# 7. STATIONNEMENT BNLS - Agrégation par commune
# =============================================================================
print("\n" + "=" * 60)
print("7/7 - Nettoyage et agrégation stationnement BNLS")
print("=" * 60)

df_stat = pd.read_csv(
    f"{RAW}/stationnement_bnls.csv",
    sep=";",
    dtype={"insee": str}
)

df_stat["code_commune"] = df_stat["insee"].apply(pad_code_commune)
df_stat["nb_places"] = pd.to_numeric(df_stat["nb_places"], errors="coerce").fillna(0)
df_stat["gratuit_bool"] = (df_stat["gratuit"] == 1).astype(int)

# Tarifs : convertir en numérique
for col_tarif in ["tarif_1h", "tarif_2h", "tarif_24h", "abo_resident", "abo_non_resident"]:
    df_stat[col_tarif] = pd.to_numeric(df_stat[col_tarif], errors="coerce")

stat_agg = df_stat.groupby("code_commune").agg(
    nb_parkings_publics=("code_commune", "size"),
    nb_places_total=("nb_places", "sum"),
    nb_parkings_gratuits=("gratuit_bool", "sum"),
    tarif_1h_moyen=("tarif_1h", "mean"),
    tarif_24h_moyen=("tarif_24h", "mean"),
    abo_resident_moyen=("abo_resident", "mean"),
).reset_index()

stat_agg["tarif_1h_moyen"] = stat_agg["tarif_1h_moyen"].round(2)
stat_agg["tarif_24h_moyen"] = stat_agg["tarif_24h_moyen"].round(2)
stat_agg["abo_resident_moyen"] = stat_agg["abo_resident_moyen"].round(2)

print(f"  -> {len(stat_agg)} communes avec des parkings publics")
print(f"  -> Total places: {stat_agg['nb_places_total'].sum():,.0f}")
print(f"  -> Tarif 1h moyen: {stat_agg['tarif_1h_moyen'].mean():.2f} EUR")
stat_agg.to_csv(f"{CLEANED}/stationnement.csv", index=False)
print(f"  -> Sauvegardé dans {CLEANED}/stationnement.csv")


# =============================================================================
# RÉSUMÉ FINAL
# =============================================================================
print("\n" + "=" * 60)
print("RÉSUMÉ - Fichiers nettoyés dans data/cleaned/")
print("=" * 60)

for f in sorted(os.listdir(CLEANED)):
    if f.endswith(".csv"):
        size = os.path.getsize(f"{CLEANED}/{f}")
        df_tmp = pd.read_csv(f"{CLEANED}/{f}", nrows=0)
        print(f"  {f:30s} {size/1024/1024:6.1f} MB  {len(df_tmp.columns):3d} colonnes")

print("\nNettoyage terminé !")
