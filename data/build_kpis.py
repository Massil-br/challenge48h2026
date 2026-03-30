"""
ParkShare Challenge 48h - Jointure, indicateurs dérivés et KPIs
Produit la table finale et les scores dans data/output/
"""

import pandas as pd
import numpy as np
import os
import warnings
warnings.filterwarnings('ignore')

CLEANED = "cleaned"
OUTPUT = "output"
os.makedirs(OUTPUT, exist_ok=True)


# =============================================================================
# ÉTAPE 3 : JOINTURE
# =============================================================================
print("=" * 60)
print("ÉTAPE 3 - Jointure des datasets")
print("=" * 60)

# Charger tous les datasets nettoyés
communes = pd.read_csv(f"{CLEANED}/communes.csv", dtype={"code_insee": str, "dep_code": str, "reg_code": str})
motorisation = pd.read_csv(f"{CLEANED}/motorisation.csv", dtype={"code_commune": str})
logements = pd.read_csv(f"{CLEANED}/logements.csv", dtype={"code_commune": str})
revenus = pd.read_csv(f"{CLEANED}/revenus.csv", dtype={"code_commune": str})
rnic = pd.read_csv(f"{CLEANED}/rnic.csv", dtype={"code_commune": str})
dvf = pd.read_csv(f"{CLEANED}/dvf.csv", dtype={"code_commune": str})
stationnement = pd.read_csv(f"{CLEANED}/stationnement.csv", dtype={"code_commune": str})

# Sources bonus (chargement conditionnel)
zonage_abc = None
irve = None
parkings_metro = None

if os.path.exists(f"{CLEANED}/zonage_abc.csv"):
    zonage_abc = pd.read_csv(f"{CLEANED}/zonage_abc.csv", dtype={"code_commune": str})
if os.path.exists(f"{CLEANED}/irve.csv"):
    irve = pd.read_csv(f"{CLEANED}/irve.csv", dtype={"code_commune": str})
if os.path.exists(f"{CLEANED}/parkings_metropoles.csv"):
    parkings_metro = pd.read_csv(f"{CLEANED}/parkings_metropoles.csv", dtype={"code_commune": str})

print(f"  Communes (base)     : {len(communes)}")
print(f"  Motorisation        : {len(motorisation)}")
print(f"  Logements           : {len(logements)}")
print(f"  Revenus             : {len(revenus)}")
print(f"  RNIC                : {len(rnic)}")
print(f"  DVF                 : {len(dvf)}")
print(f"  Stationnement       : {len(stationnement)}")
print(f"  [BONUS] Zonage ABC  : {len(zonage_abc) if zonage_abc is not None else 'non disponible'}")
print(f"  [BONUS] IRVE        : {len(irve) if irve is not None else 'non disponible'}")
print(f"  [BONUS] Parkings metro: {len(parkings_metro) if parkings_metro is not None else 'non disponible'}")

# Jointure progressive
df = communes.copy()
df = df.merge(motorisation[["code_commune", "taux_motorisation", "menages_motorises", "menages_total"]],
              left_on="code_insee", right_on="code_commune", how="left").drop(columns=["code_commune"])

df = df.merge(logements, left_on="code_insee", right_on="code_commune", how="left").drop(columns=["code_commune"])

df = df.merge(revenus.drop(columns=["nom_commune"]),
              left_on="code_insee", right_on="code_commune", how="left").drop(columns=["code_commune"])

df = df.merge(rnic, left_on="code_insee", right_on="code_commune", how="left").drop(columns=["code_commune"])

df = df.merge(dvf, left_on="code_insee", right_on="code_commune", how="left").drop(columns=["code_commune"])

df = df.merge(stationnement, left_on="code_insee", right_on="code_commune", how="left").drop(columns=["code_commune"])

# Jointure des sources bonus
if zonage_abc is not None:
    df = df.merge(zonage_abc, left_on="code_insee", right_on="code_commune", how="left").drop(columns=["code_commune"])

if irve is not None:
    df = df.merge(irve, left_on="code_insee", right_on="code_commune", how="left").drop(columns=["code_commune"])

if parkings_metro is not None:
    df = df.merge(parkings_metro, left_on="code_insee", right_on="code_commune", how="left").drop(columns=["code_commune"])
    # Enrichir le stationnement public avec les données métropoles
    # Si une commune a des données métropoles mais pas BNLS, utiliser les données métropoles
    if "nb_places_total" in df.columns and "nb_places_metro" in df.columns:
        df["nb_places_total_enrichi"] = df["nb_places_total"].fillna(0) + df["nb_places_metro"].fillna(0)
        df["nb_parkings_publics_enrichi"] = df["nb_parkings_publics"].fillna(0) + df["nb_parkings_metro"].fillna(0)

print(f"\n  Table jointe : {len(df)} lignes x {len(df.columns)} colonnes")

# Vérifier les taux de jointure
join_checks = [
    ("taux_motorisation", "Motorisation"),
    ("total_logements", "Logements"),
    ("revenu_median", "Revenus"),
    ("nb_coproprietes", "RNIC"),
    ("nb_ventes_total", "DVF"),
    ("nb_parkings_publics", "Stationnement"),
]
if zonage_abc is not None:
    join_checks.append(("tension_immobiliere", "[BONUS] Zonage ABC"))
if irve is not None:
    join_checks.append(("nb_stations_irve", "[BONUS] IRVE"))
if parkings_metro is not None:
    join_checks.append(("nb_places_metro", "[BONUS] Parkings metro"))

for col, label in join_checks:
    if col in df.columns:
        matched = df[col].notna().sum()
        pct = matched / len(df) * 100
        print(f"  {label:20s}: {matched:6d} communes matchées ({pct:.1f}%)")


# =============================================================================
# ÉTAPE 3bis : INDICATEURS DÉRIVÉS
# =============================================================================
print("\n" + "=" * 60)
print("ÉTAPE 3bis - Indicateurs dérivés")
print("=" * 60)

# Copropriétés pour 1000 habitants
df["copro_pour_1000_hab"] = (
    df["nb_coproprietes"] / df["population"] * 1000
).round(2)

# Lots stationnement pour 1000 habitants
df["lots_parking_pour_1000_hab"] = (
    df["total_lots_stationnement"] / df["population"] * 1000
).round(2)

# Ratio parking privé (RNIC) vs public (BNLS)
df["ratio_parking_prive_vs_public"] = (
    df["total_lots_stationnement"] / df["nb_places_total"].replace(0, np.nan)
).round(2)

# Taux de ménages motorisés sans garage
# menages_1voiture_plus = ménages avec au moins 1 voiture
# menages_avec_garage = ménages avec garage ou parking
df["taux_voiture_sans_garage"] = (
    (df["menages_1voiture_plus"] - df["menages_avec_garage"])
    / df["menages_1voiture_plus"].replace(0, np.nan) * 100
).round(2)
# Clip à 0 minimum (cas où garage > voitures)
df["taux_voiture_sans_garage"] = df["taux_voiture_sans_garage"].clip(lower=0)

# Lots d'habitation par copropriété (taille moyenne)
df["lots_hab_par_copro"] = (
    df["total_lots_habitation"] / df["nb_coproprietes"].replace(0, np.nan)
).round(1)

# Dépendances (parkings DVF) pour 1000 habitants
df["dependances_dvf_pour_1000_hab"] = (
    df["nb_ventes_dependances"] / df["population"] * 1000
).round(2)

# Part des ventes qui sont des dépendances (activité parking dans les transactions)
# déjà dans dvf: part_dependances

# Densité de copropriétés par km2
df["copro_par_km2"] = (
    df["nb_coproprietes"] / df["superficie_km2"].replace(0, np.nan)
).round(2)

indicators = [
    "copro_pour_1000_hab", "lots_parking_pour_1000_hab",
    "ratio_parking_prive_vs_public", "taux_voiture_sans_garage",
    "lots_hab_par_copro", "dependances_dvf_pour_1000_hab", "copro_par_km2"
]

# Indicateurs bonus
if "nb_stations_irve" in df.columns:
    df["irve_pour_1000_hab"] = (
        df["nb_stations_irve"] / df["population"] * 1000
    ).round(2)
    indicators.append("irve_pour_1000_hab")

if "tension_immobiliere" in df.columns:
    indicators.append("tension_immobiliere")

for ind in indicators:
    valid = df[ind].notna().sum()
    mean = df[ind].mean()
    print(f"  {ind:40s}: {valid:6d} valeurs, moyenne = {mean:.2f}")


# =============================================================================
# ÉTAPE 4 : SCORING ET KPIs
# =============================================================================
print("\n" + "=" * 60)
print("ÉTAPE 4 - Scoring et KPIs")
print("=" * 60)

# On ne score que les communes qui ont au moins des copropriétés (cible ParkShare)
df_score = df[df["nb_coproprietes"].notna() & (df["nb_coproprietes"] > 0)].copy()
print(f"  Communes avec copropriétés : {len(df_score)}")


# --- Fonction de normalisation min-max (0-100) ---
def normalize(series):
    """Normalise une série entre 0 et 100 (min-max)."""
    s = series.copy()
    smin, smax = s.quantile(0.01), s.quantile(0.99)  # Robuste aux outliers
    if smax == smin:
        return pd.Series(50, index=s.index)
    normalized = ((s - smin) / (smax - smin) * 100).clip(0, 100)
    return normalized


# --- KPI 1 : Score de potentiel ---
print("\n  KPI 1 - Score de potentiel")
print("  " + "-" * 40)

# Composantes du score (7 facteurs de base)
# 1. Densité de copropriétés (nb copro / km2)
df_score["score_densite_copro"] = normalize(df_score["copro_par_km2"])

# 2. Taux de motorisation
df_score["score_motorisation"] = normalize(df_score["taux_motorisation"])

# 3. Part de logements collectifs
df_score["score_collectif"] = normalize(df_score["part_collectif"])

# 4. Densité de population
df_score["score_densite_pop"] = normalize(df_score["densite"])

# 5. Manque de garage (taux voiture sans garage)
df_score["score_sans_garage"] = normalize(df_score["taux_voiture_sans_garage"])

# 6. Lots de stationnement existants en copro (opportunité de partage)
df_score["score_lots_parking"] = normalize(df_score["lots_parking_pour_1000_hab"])

# 7. Part des copro qui ont du parking (= infrastructure existante partageable)
df_score["score_copro_avec_parking"] = normalize(df_score["part_copro_avec_parking"])

# --- BONUS : Facteurs complémentaires ---
has_zonage = "tension_immobiliere" in df_score.columns and df_score["tension_immobiliere"].notna().any()
has_irve = "irve_pour_1000_hab" in df_score.columns and df_score["irve_pour_1000_hab"].notna().any()

if has_zonage:
    # 8. Tension immobilière (zonage ABC : A bis=5, A=4, B1=3, B2=2, C=1)
    # Zones tendues = forte demande de logement = forte demande de parking
    df_score["score_tension_immo"] = normalize(df_score["tension_immobiliere"].fillna(1))
    print("  [BONUS] Score tension immobilière (zonage ABC) ajouté")

if has_irve:
    # 9. Infrastructure de recharge VE (proxy pour investissement mobilité/parking)
    # Communes avec beaucoup de bornes = infrastructure parking moderne
    df_score["score_infra_recharge"] = normalize(df_score["irve_pour_1000_hab"].fillna(0))
    print("  [BONUS] Score infrastructure recharge (IRVE) ajouté")

# Pondérations ajustées selon les sources bonus disponibles
if has_zonage and has_irve:
    # 9 facteurs : on redistribue les poids pour intégrer les 2 bonus
    weights = {
        "score_densite_copro": 0.17,       # Concentration de cibles
        "score_sans_garage": 0.17,          # Demande latente (voiture mais pas de garage)
        "score_collectif": 0.12,            # Parc adapté (copropriétés)
        "score_lots_parking": 0.12,         # Offre partageable existante
        "score_tension_immo": 0.10,         # [BONUS] Tension du marché immobilier
        "score_motorisation": 0.08,         # Demande de stationnement
        "score_densite_pop": 0.08,          # Tension urbaine
        "score_copro_avec_parking": 0.08,   # Infrastructure parking en copro
        "score_infra_recharge": 0.08,       # [BONUS] Infra recharge VE
    }
elif has_zonage:
    weights = {
        "score_densite_copro": 0.18,
        "score_sans_garage": 0.18,
        "score_collectif": 0.13,
        "score_lots_parking": 0.13,
        "score_tension_immo": 0.10,
        "score_motorisation": 0.08,
        "score_densite_pop": 0.08,
        "score_copro_avec_parking": 0.08,
        "score_infra_recharge": 0.04,
    }
elif has_irve:
    weights = {
        "score_densite_copro": 0.18,
        "score_sans_garage": 0.18,
        "score_collectif": 0.13,
        "score_lots_parking": 0.13,
        "score_motorisation": 0.09,
        "score_densite_pop": 0.09,
        "score_copro_avec_parking": 0.09,
        "score_infra_recharge": 0.07,
    }
else:
    # Pas de sources bonus : pondérations originales
    weights = {
        "score_densite_copro": 0.20,
        "score_motorisation": 0.10,
        "score_collectif": 0.15,
        "score_densite_pop": 0.10,
        "score_sans_garage": 0.20,
        "score_lots_parking": 0.15,
        "score_copro_avec_parking": 0.10,
    }

df_score["score_potentiel"] = sum(
    df_score[col].fillna(0) * w for col, w in weights.items()
).round(2)

print(f"\n  Pondérations ({len(weights)} facteurs, total = {sum(weights.values()):.2f}) :")
for col, w in weights.items():
    label = col.replace("score_", "")
    bonus = " [BONUS]" if "tension" in col or "recharge" in col else ""
    print(f"    {label:25s}: {w:.0%}{bonus}")
print(f"\n  Score moyen   : {df_score['score_potentiel'].mean():.1f}")
print(f"  Score médian  : {df_score['score_potentiel'].median():.1f}")
print(f"  Score max     : {df_score['score_potentiel'].max():.1f}")


# --- KPI 2 : Classement des zones ---
print("\n  KPI 2 - Classement Top 30 zones")
print("  " + "-" * 40)

df_score = df_score.sort_values("score_potentiel", ascending=False)
df_score["rang"] = range(1, len(df_score) + 1)

top30 = df_score.head(30)[[
    "rang", "code_insee", "nom_standard", "dep_nom", "reg_nom",
    "population", "densite", "nb_coproprietes", "total_lots_stationnement",
    "taux_motorisation", "part_collectif", "taux_voiture_sans_garage",
    "score_potentiel"
]]

for _, row in top30.head(15).iterrows():
    print(f"  #{row['rang']:3d} | {row['nom_standard']:25s} ({row['dep_nom']}) | "
          f"pop={row['population']:>8.0f} | copros={row['nb_coproprietes']:>5.0f} | "
          f"score={row['score_potentiel']:.1f}")


# --- KPI 3 : Indice de tension stationnement ---
print("\n  KPI 3 - Indice de tension stationnement")
print("  " + "-" * 40)

# Tension = motorisation élevée + peu de garages + forte densité
df_score["indice_tension_stationnement"] = (
    (df_score["taux_motorisation"].fillna(0) / 100)
    * (df_score["taux_voiture_sans_garage"].fillna(0) / 100)
    * df_score["densite"].fillna(0)
).round(2)

top_tension = df_score.nlargest(10, "indice_tension_stationnement")
for _, row in top_tension.iterrows():
    print(f"  {row['nom_standard']:25s} | tension = {row['indice_tension_stationnement']:>10.1f} | "
          f"motori={row['taux_motorisation']:.0f}% sans_garage={row['taux_voiture_sans_garage']:.0f}%")


# --- KPI 4 : Densité d'opportunité copropriété ---
print("\n  KPI 4 - Densité d'opportunité copropriété")
print("  " + "-" * 40)

df_score["densite_opportunite"] = (
    df_score["nb_coproprietes"] / df_score["superficie_km2"].replace(0, np.nan)
).round(2)

top_opportunite = df_score.nlargest(10, "densite_opportunite")
for _, row in top_opportunite.iterrows():
    print(f"  {row['nom_standard']:25s} | {row['densite_opportunite']:>8.1f} copro/km2 | "
          f"{row['nb_coproprietes']:.0f} copros | {row['total_lots_stationnement']:.0f} lots parking")


# =============================================================================
# SAUVEGARDE
# =============================================================================
print("\n" + "=" * 60)
print("SAUVEGARDE")
print("=" * 60)

# Table complète
df_score.to_csv(f"{OUTPUT}/kpis_par_commune.csv", index=False)
print(f"  -> {OUTPUT}/kpis_par_commune.csv ({len(df_score)} communes, {len(df_score.columns)} colonnes)")

# Top 30
top30.to_csv(f"{OUTPUT}/top30_zones.csv", index=False)
print(f"  -> {OUTPUT}/top30_zones.csv")

# Table complète jointe (toutes les communes, même sans copro)
df.to_csv(f"{OUTPUT}/communes_enrichies.csv", index=False)
print(f"  -> {OUTPUT}/communes_enrichies.csv ({len(df)} communes)")

# Stats résumé
print(f"\n  Résumé :")
print(f"  - {len(df_score)} communes scorées (avec copropriétés)")
print(f"  - Score potentiel : min={df_score['score_potentiel'].min():.1f}, "
      f"median={df_score['score_potentiel'].median():.1f}, max={df_score['score_potentiel'].max():.1f}")
print(f"  - Top 1 : {df_score.iloc[0]['nom_standard']} ({df_score.iloc[0]['dep_nom']}) "
      f"score={df_score.iloc[0]['score_potentiel']:.1f}")

print("\nTerminé !")
