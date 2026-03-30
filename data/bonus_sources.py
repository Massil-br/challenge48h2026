"""
ParkShare Challenge 48h - BONUS 1 : Sources complementaires
Telecharge et nettoie des sources additionnelles pour enrichir le scoring.

Sources ajoutees :
1. Zonage ABC (tension du marche immobilier) - data.gouv.fr
2. IRVE (bornes de recharge VE) - data.gouv.fr
3. Open data parkings metropoles (Grand Lyon, Bordeaux, Paris)

Usage:
    cd data/
    python bonus_sources.py
"""

import pandas as pd
import numpy as np
import requests
import os
import io
import warnings
warnings.filterwarnings('ignore')

RAW_BONUS = "raw/bonus"
CLEANED = "cleaned"
os.makedirs(RAW_BONUS, exist_ok=True)
os.makedirs(CLEANED, exist_ok=True)


def download_file(url, filepath, description="", timeout=180):
    """Telecharge un fichier avec gestion d'erreurs."""
    print(f"  Telechargement: {description}")
    print(f"  URL: {url[:120]}...")
    try:
        r = requests.get(url, timeout=timeout, stream=True)
        r.raise_for_status()
        total = 0
        with open(filepath, 'wb') as f:
            for chunk in r.iter_content(chunk_size=65536):
                f.write(chunk)
                total += len(chunk)
        size = total / 1024 / 1024
        print(f"  -> OK ({size:.1f} MB)")
        return True
    except Exception as e:
        print(f"  -> ERREUR: {e}")
        return False


def pad_code_commune(code):
    """Uniformise un code commune INSEE sur 5 caracteres."""
    if pd.isna(code):
        return None
    code = str(code).strip().replace('"', '').replace("'", "").split('.')[0]
    if len(code) < 5:
        code = code.zfill(5)
    return code


# =============================================================================
# 1. ZONAGE ABC - Tension du marche immobilier
# =============================================================================
print("=" * 60)
print("BONUS 1/3 - Zonage ABC (tension immobiliere)")
print("=" * 60)
print("  Source: Ministere de la Transition ecologique")
print("  Description: Classification des communes en zones de tension")
print("  immobiliere (A bis, A, B1, B2, C)")
print()

ZONAGE_URL = (
    "https://static.data.gouv.fr/resources/liste-des-communes-selon-le-zonage-abc/"
    "20250910-150516/liste-des-communes-zonage-abc-5-septembre-2025.csv"
)
zonage_file = f"{RAW_BONUS}/zonage_abc.csv"
zonage_ok = False

if download_file(ZONAGE_URL, zonage_file, "Zonage ABC communes (sept. 2025)"):
    # Essayer differents separateurs et encodages
    df_zonage = None
    for sep in [';', ',', '\t']:
        for encoding in ['utf-8', 'latin1', 'cp1252']:
            try:
                df_tmp = pd.read_csv(zonage_file, sep=sep, encoding=encoding, dtype=str)
                if len(df_tmp.columns) >= 2 and len(df_tmp) > 100:
                    df_zonage = df_tmp
                    break
            except:
                continue
        if df_zonage is not None:
            break

    if df_zonage is not None:
        print(f"  Colonnes detectees: {list(df_zonage.columns)}")
        print(f"  Lignes: {len(df_zonage)}")

        # Identifier les colonnes cles (code commune et zone)
        col_code = None
        col_zone = None
        col_nom = None
        for col in df_zonage.columns:
            cl = col.lower().strip()
            if col_code is None and ('code' in cl and ('commune' in cl or 'insee' in cl or 'geo' in cl)):
                col_code = col
            elif col_code is None and cl in ('codgeo', 'depcom', 'code'):
                col_code = col
            if col_zone is None and ('zone' in cl or 'zonage' in cl):
                col_zone = col
            if col_nom is None and ('nom' in cl or 'libelle' in cl or 'commune' in cl) and 'code' not in cl:
                col_nom = col

        # Si pas trouve, essayer par position (souvent: code, nom, zone)
        if col_code is None and col_zone is None:
            cols = df_zonage.columns.tolist()
            # Chercher une colonne avec des codes a 5 chiffres
            for col in cols:
                sample = df_zonage[col].dropna().head(20)
                if sample.str.match(r'^\d{4,5}$').all():
                    col_code = col
                    break
            # Chercher une colonne avec des zones ABC
            for col in cols:
                sample = df_zonage[col].dropna().str.strip().head(100)
                vals = set(sample.unique())
                if vals & {'A', 'B1', 'B2', 'C', 'A bis', 'Abis'}:
                    col_zone = col
                    break

        if col_code and col_zone:
            cols_to_keep = [col_code, col_zone]
            zonage_clean = df_zonage[cols_to_keep].copy()
            zonage_clean.columns = ['code_commune', 'zone_abc']
            zonage_clean['code_commune'] = zonage_clean['code_commune'].apply(pad_code_commune)
            zonage_clean['zone_abc'] = zonage_clean['zone_abc'].str.strip()

            # Mapper les zones en valeurs numeriques de tension
            zone_map = {
                'A bis': 5, 'Abis': 5, 'A BIS': 5,
                'A': 4,
                'B1': 3,
                'B2': 2,
                'C': 1
            }
            zonage_clean['tension_immobiliere'] = zonage_clean['zone_abc'].map(zone_map)

            # Dedupliquer
            zonage_clean = zonage_clean.drop_duplicates(subset=['code_commune'])
            zonage_clean = zonage_clean.dropna(subset=['code_commune', 'tension_immobiliere'])

            print(f"\n  Distribution des zones:")
            for zone, count in zonage_clean['zone_abc'].value_counts().items():
                print(f"    {zone:6s}: {count:>6d} communes")

            zonage_clean.to_csv(f"{CLEANED}/zonage_abc.csv", index=False)
            print(f"\n  -> {len(zonage_clean)} communes avec zonage ABC")
            print(f"  -> Sauvegarde dans {CLEANED}/zonage_abc.csv")
            zonage_ok = True
        else:
            print(f"  -> ERREUR: Colonnes code/zone non identifiees")
            print(f"     Colonnes disponibles: {list(df_zonage.columns)}")
            print(f"     Premiers enregistrements:")
            print(df_zonage.head(3).to_string())
    else:
        print(f"  -> ERREUR: Impossible de lire le CSV")

if not zonage_ok:
    print("  -> Source zonage ABC non disponible, sera ignoree dans le scoring")


# =============================================================================
# 2. IRVE - Bornes de recharge pour vehicules electriques
# =============================================================================
print("\n" + "=" * 60)
print("BONUS 2/3 - IRVE (bornes de recharge VE)")
print("=" * 60)
print("  Source: data.gouv.fr / Etalab")
print("  Description: Base nationale des infrastructures de recharge")
print("  pour vehicules electriques, agregee par commune")
print()

irve_ok = False

# Utiliser l'API data.gouv.fr pour trouver l'URL la plus recente
print("  Recherche de l'URL la plus recente via API data.gouv.fr...")
irve_url = None
try:
    api_resp = requests.get(
        "https://www.data.gouv.fr/api/1/datasets/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/",
        timeout=30
    ).json()
    for resource in api_resp.get('resources', []):
        title = resource.get('title', '').lower()
        fmt = resource.get('format', '').lower()
        if fmt == 'csv' and 'statique' in title and 'derniere' in title:
            irve_url = resource['url']
            print(f"  URL trouvee: {irve_url[:100]}...")
            break
    if irve_url is None:
        # Fallback : chercher tout CSV statique
        for resource in api_resp.get('resources', []):
            title = resource.get('title', '').lower()
            fmt = resource.get('format', '').lower()
            if fmt == 'csv' and 'statique' in title:
                irve_url = resource['url']
                print(f"  URL fallback: {irve_url[:100]}...")
                break
except Exception as e:
    print(f"  API indisponible: {e}")

if irve_url is None:
    # Fallback statique
    irve_url = (
        "https://static.data.gouv.fr/resources/fichier-consolide-des-bornes-de-recharge-pour-vehicules-electriques/"
        "20250714-041510/consolidation-etalab-schema-irve-statique-v-2.3.1-20250714.csv"
    )
    print(f"  Utilisation de l'URL de fallback")

irve_file = f"{RAW_BONUS}/irve_statique.csv"

if download_file(irve_url, irve_file, "IRVE consolide (CSV)", timeout=300):
    print("  Lecture et agregation par commune...")

    # Lire par chunks car fichier volumineux (~108 MB)
    # Detecter les colonnes disponibles
    try:
        sample = pd.read_csv(irve_file, nrows=5, sep=',', encoding='utf-8', dtype=str)
        all_cols = list(sample.columns)
        print(f"  Colonnes ({len(all_cols)}): {all_cols[:10]}...")
    except:
        try:
            sample = pd.read_csv(irve_file, nrows=5, sep=';', encoding='utf-8', dtype=str)
            all_cols = list(sample.columns)
        except:
            sample = pd.read_csv(irve_file, nrows=5, sep=';', encoding='latin1', dtype=str)
            all_cols = list(sample.columns)

    # Colonnes connues du schema IRVE v2.3.1
    col_insee = 'code_insee_commune' if 'code_insee_commune' in all_cols else None
    col_pdc = 'nbre_pdc' if 'nbre_pdc' in all_cols else None
    col_station = 'id_station_itinerance' if 'id_station_itinerance' in all_cols else None
    sep_used = ',' if ',' in open(irve_file, encoding='utf-8', errors='ignore').readline() else ';'

    if col_insee is None:
        # Fallback: chercher la colonne avec "code_insee"
        for col in all_cols:
            if col.lower() == 'code_insee_commune':
                col_insee = col
                break
        if col_insee is None:
            for col in all_cols:
                if 'code_insee' in col.lower() and 'modified' not in col.lower() and 'verified' not in col.lower():
                    col_insee = col
                    break

    if col_insee:
        print(f"  Colonne INSEE: {col_insee}")
        print(f"  Colonne PDC: {col_pdc}")
        print(f"  Colonne station: {col_station}")

        usecols = [c for c in [col_insee, col_pdc, col_station] if c is not None]

        chunks = []
        for chunk in pd.read_csv(irve_file, sep=sep_used, usecols=usecols,
                                  dtype=str, chunksize=100000, encoding='utf-8',
                                  on_bad_lines='skip'):
            chunks.append(chunk)
            print(f"    ... {len(chunks) * 100000} lignes lues")

        df_irve = pd.concat(chunks, ignore_index=True)
        print(f"  Total: {len(df_irve)} points de recharge")

        df_irve['code_commune'] = df_irve[col_insee].apply(pad_code_commune)

        if col_pdc:
            df_irve['nbre_pdc'] = pd.to_numeric(df_irve[col_pdc], errors='coerce').fillna(1)
        else:
            df_irve['nbre_pdc'] = 1

        # Agreger par commune
        irve_agg = df_irve.groupby('code_commune').agg(
            nb_stations_irve=('code_commune', 'size'),
            nb_points_charge=('nbre_pdc', 'sum'),
        ).reset_index()

        irve_agg = irve_agg.dropna(subset=['code_commune'])
        irve_agg['nb_points_charge'] = irve_agg['nb_points_charge'].astype(int)

        print(f"\n  -> {len(irve_agg)} communes avec des bornes IRVE")
        print(f"  -> Total stations: {irve_agg['nb_stations_irve'].sum():,.0f}")
        print(f"  -> Total points de charge: {irve_agg['nb_points_charge'].sum():,.0f}")

        irve_agg.to_csv(f"{CLEANED}/irve.csv", index=False)
        print(f"  -> Sauvegarde dans {CLEANED}/irve.csv")
        irve_ok = True
    else:
        print(f"  -> ERREUR: Colonne INSEE non trouvee parmi: {all_cols}")

if not irve_ok:
    print("  -> Source IRVE non disponible, sera ignoree dans le scoring")


# =============================================================================
# 3. OPEN DATA METROPOLES - Parkings publics
# =============================================================================
print("\n" + "=" * 60)
print("BONUS 3/3 - Open data parkings metropoles")
print("=" * 60)
print("  Sources: Grand Lyon, Bordeaux Metropole, Paris")
print("  Description: Donnees de stationnement des grandes metropoles")
print("  pour enrichir la couverture de la BNLS (161 communes)")
print()

all_metro_parkings = []

# --- Grand Lyon ---
print("  [Grand Lyon]")
LYON_URL = "https://download.data.grandlyon.com/files/rdata/pvo_patrimoine_voirie.pvoparking/Parking_Metropole_de_Lyon.csv"
lyon_file = f"{RAW_BONUS}/parkings_lyon.csv"

if download_file(LYON_URL, lyon_file, "Parkings Metropole de Lyon"):
    try:
        # Essayer differents separateurs
        for sep in [';', ',']:
            try:
                df_lyon = pd.read_csv(lyon_file, sep=sep, encoding='utf-8', dtype=str)
                if len(df_lyon.columns) > 3:
                    break
            except:
                continue

        print(f"    Colonnes: {list(df_lyon.columns)[:10]}")

        # Chercher colonnes pertinentes
        col_places = None
        col_nom = None
        col_commune = None
        col_insee = None

        for col in df_lyon.columns:
            cl = col.lower()
            if 'place' in cl and col_places is None:
                col_places = col
            if ('nom' in cl or 'name' in cl) and 'commune' not in cl and col_nom is None:
                col_nom = col
            if 'commune' in cl and 'code' not in cl and col_commune is None:
                col_commune = col
            if 'insee' in cl or ('code' in cl and 'commune' in cl):
                col_insee = col

        if col_places:
            df_lyon[col_places] = pd.to_numeric(df_lyon[col_places], errors='coerce')

        # Si on a un code INSEE, utiliser directement
        if col_insee:
            df_lyon['code_commune'] = df_lyon[col_insee].apply(pad_code_commune)
        elif col_commune:
            # Sinon, on devra joindre par nom de commune plus tard
            # Pour l'instant, on garde le nom
            df_lyon['commune_nom'] = df_lyon[col_commune]
            df_lyon['code_commune'] = None  # Sera rempli par jointure

        if col_places:
            lyon_agg = df_lyon.groupby('code_commune' if col_insee else 'commune_nom').agg(
                nb_parkings=('code_commune' if col_insee else 'commune_nom', 'size'),
                nb_places=(col_places, 'sum'),
            ).reset_index()
            lyon_agg['source_metropole'] = 'Grand Lyon'

            if not col_insee and col_commune:
                lyon_agg = lyon_agg.rename(columns={'commune_nom': 'nom_commune_metro'})

            print(f"    -> {len(lyon_agg)} communes/zones, {lyon_agg['nb_places'].sum():.0f} places")
            all_metro_parkings.append(lyon_agg)
        else:
            print(f"    -> Colonne places non trouvee")
    except Exception as e:
        print(f"    -> Erreur traitement: {e}")

# --- Bordeaux Metropole ---
print("\n  [Bordeaux Metropole]")
BORDEAUX_URL = "https://opendata.bordeaux-metropole.fr/api/explore/v2.1/catalog/datasets/st_park_p/exports/csv?use_labels=true&delimiter=%3B"
bordeaux_file = f"{RAW_BONUS}/parkings_bordeaux.csv"

if download_file(BORDEAUX_URL, bordeaux_file, "Parkings Bordeaux Metropole"):
    try:
        for sep in [';', ',']:
            try:
                df_bdx = pd.read_csv(bordeaux_file, sep=sep, encoding='utf-8', dtype=str)
                if len(df_bdx.columns) > 3:
                    break
            except:
                continue

        print(f"    Colonnes: {list(df_bdx.columns)[:10]}")

        col_places = None
        col_insee = None
        col_commune = None

        for col in df_bdx.columns:
            cl = col.lower()
            # Bordeaux utilise 'np_total' pour le nombre de places total
            if cl == 'np_total':
                col_places = col
            elif ('place' in cl or 'capacite' in cl or 'nb_place' in cl or 'total' in cl) and col_places is None:
                col_places = col
            if 'insee' in cl:
                col_insee = col
            if 'commune' in cl and 'code' not in cl and col_commune is None:
                col_commune = col

        if col_places:
            df_bdx[col_places] = pd.to_numeric(df_bdx[col_places], errors='coerce')

        key_col = col_insee if col_insee else col_commune
        if key_col and col_places:
            if col_insee:
                df_bdx['code_commune'] = df_bdx[col_insee].apply(pad_code_commune)
                group_col = 'code_commune'
            else:
                group_col = col_commune

            bdx_agg = df_bdx.groupby(group_col).agg(
                nb_parkings=(group_col, 'size'),
                nb_places=(col_places, 'sum'),
            ).reset_index()
            bdx_agg['source_metropole'] = 'Bordeaux Metropole'

            if not col_insee:
                bdx_agg = bdx_agg.rename(columns={col_commune: 'nom_commune_metro'})

            print(f"    -> {len(bdx_agg)} communes/zones, {bdx_agg['nb_places'].sum():.0f} places")
            all_metro_parkings.append(bdx_agg)
        else:
            print(f"    -> Colonnes cles non trouvees")
    except Exception as e:
        print(f"    -> Erreur traitement: {e}")

# --- Paris ---
print("\n  [Paris]")
PARIS_URL = "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/stationnement-en-ouvrage/exports/csv?delimiter=%3B"
paris_file = f"{RAW_BONUS}/parkings_paris.csv"

if download_file(PARIS_URL, paris_file, "Stationnement en ouvrage Paris"):
    try:
        for sep in [';', ',']:
            try:
                df_paris = pd.read_csv(paris_file, sep=sep, encoding='utf-8', dtype=str)
                if len(df_paris.columns) > 3:
                    break
            except:
                continue

        print(f"    Colonnes: {list(df_paris.columns)[:10]}")

        col_places = None
        col_arrond = None

        for col in df_paris.columns:
            cl = col.lower()
            if ('place' in cl or 'capacite' in cl or 'nb_place' in cl) and col_places is None:
                col_places = col
            if ('arrond' in cl or 'zipcode' in cl or 'code_postal' in cl) and col_arrond is None:
                col_arrond = col

        if col_places:
            df_paris[col_places] = pd.to_numeric(df_paris[col_places], errors='coerce')

        if col_places:
            # Paris = code INSEE 75056, arrondissements = 75101 a 75120
            # On agregre tout sous 75056 (commune de Paris)
            paris_total = pd.DataFrame([{
                'code_commune': '75056',
                'nb_parkings': len(df_paris),
                'nb_places': df_paris[col_places].sum(),
                'source_metropole': 'Paris'
            }])
            print(f"    -> Paris: {len(df_paris)} parkings, {df_paris[col_places].sum():.0f} places")
            all_metro_parkings.append(paris_total)
        else:
            print(f"    -> Colonne places non trouvee")
    except Exception as e:
        print(f"    -> Erreur traitement: {e}")

# --- Consolider les parkings metropoles ---
metro_ok = False
if all_metro_parkings:
    print(f"\n  Consolidation des donnees metropoles...")

    # Garder seulement les dataframes avec code_commune
    dfs_with_code = []
    for df_m in all_metro_parkings:
        if 'code_commune' in df_m.columns:
            dfs_with_code.append(df_m[['code_commune', 'nb_parkings', 'nb_places', 'source_metropole']])

    if dfs_with_code:
        df_metro = pd.concat(dfs_with_code, ignore_index=True)
        df_metro['nb_places'] = pd.to_numeric(df_metro['nb_places'], errors='coerce').fillna(0)
        df_metro['nb_parkings'] = pd.to_numeric(df_metro['nb_parkings'], errors='coerce').fillna(0)

        # Agreger par commune (une commune peut apparaitre dans plusieurs sources)
        metro_agg = df_metro.groupby('code_commune').agg(
            nb_parkings_metro=('nb_parkings', 'sum'),
            nb_places_metro=('nb_places', 'sum'),
        ).reset_index()

        metro_agg['nb_parkings_metro'] = metro_agg['nb_parkings_metro'].astype(int)
        metro_agg['nb_places_metro'] = metro_agg['nb_places_metro'].astype(int)

        metro_agg.to_csv(f"{CLEANED}/parkings_metropoles.csv", index=False)
        print(f"  -> {len(metro_agg)} communes avec donnees metropoles")
        print(f"  -> Total: {metro_agg['nb_parkings_metro'].sum()} parkings, "
              f"{metro_agg['nb_places_metro'].sum()} places")
        print(f"  -> Sauvegarde dans {CLEANED}/parkings_metropoles.csv")
        metro_ok = True
    else:
        print("  -> Aucune donnee metropole avec code INSEE exploitable")

if not metro_ok:
    print("  -> Donnees metropoles non disponibles, seront ignorees")


# =============================================================================
# RESUME
# =============================================================================
print("\n" + "=" * 60)
print("RESUME - Sources bonus")
print("=" * 60)
print(f"  Zonage ABC (tension immobiliere) : {'OK' if zonage_ok else 'NON DISPONIBLE'}")
print(f"  IRVE (bornes de recharge)        : {'OK' if irve_ok else 'NON DISPONIBLE'}")
print(f"  Parkings metropoles              : {'OK' if metro_ok else 'NON DISPONIBLE'}")

bonus_files = ['zonage_abc.csv', 'irve.csv', 'parkings_metropoles.csv']
print(f"\n  Fichiers dans {CLEANED}/:")
for f in bonus_files:
    path = f"{CLEANED}/{f}"
    if os.path.exists(path):
        size = os.path.getsize(path) / 1024
        df_tmp = pd.read_csv(path, nrows=0)
        print(f"    {f:30s} {size:7.1f} KB  {len(df_tmp.columns)} colonnes")
    else:
        print(f"    {f:30s} (non genere)")

print("\nSources bonus terminees !")
print("Relancez build_kpis.py pour integrer les nouvelles sources au scoring.")
