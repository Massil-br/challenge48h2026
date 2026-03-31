# ParkShare Analytics

Dashboard d'analyse du potentiel de partage de parking par commune française — basé sur des données ouvertes (INSEE, RNIC, DVF, IGN).

## Stack technique

| Technologie | Usage |
|---|---|
| **Next.js 16** | Framework full-stack (App Router, TypeScript) |
| **PostgreSQL 16** | Base de données relationnelle |
| **Prisma 7** | ORM type-safe + adapter `@prisma/adapter-pg` |
| **Tailwind CSS v4** | Styling (thème noir / jaune) |
| **Leaflet** | Carte interactive (tuiles CARTO dark) |
| **Recharts** | Graphiques dynamiques (bar, scatter, pie, heatmap) |

## Prérequis

- Node.js 20+
- PostgreSQL 14+
- Données du pipeline (`../data/output/kpis_par_commune.csv`) — voir `../data/README.md`

---

## Déploiement Docker

### Option 1 : Avec volume (développement)

```bash
cd app
cp .env.example .env
# Éditer .env et définir POSTGRES_PASSWORD
docker compose up -d --build
```

Le dossier `data/` est monté en lecture seule dans le conteneur.

### Option 2 : Standalone (production)

Image autonome avec données intégrées, sans dépendance externe :

```bash
cd app
cp .env.example .env
# Éditer .env et définir POSTGRES_PASSWORD
docker compose -f docker-compose.standalone.yml up -d --build
```

### Importer les données

```bash
curl -X POST http://localhost:3000/api/seed
```

Ou cliquer sur « Initialiser les données » dans le dashboard.

### Stopper

```bash
docker compose down        # Garde les données PostgreSQL
docker compose down -v     # Supprime aussi les données
```

### Variables d'environnement

| Variable | Description | Défaut |
|---|---|---|
| `POSTGRES_USER` | Utilisateur PostgreSQL | `parkshare` |
| `POSTGRES_PASSWORD` | Mot de passe (requis) | — |
| `POSTGRES_DB` | Nom de la base | `parkshare` |
| `POSTGRES_PORT` | Port exposé | `5432` |
| `PORT` | Port de l'application | `3000` |
| `DATA_CSV_PATH` | Chemin vers le CSV | `/data/output/kpis_par_commune.csv` |

### Donner les images à l'équipe infra

```bash
docker compose -f docker-compose.standalone.yml build
docker save app-app:latest -o parkshare-app.tar
docker pull postgres:16-alpine
docker save postgres:16-alpine -o postgres.tar
```

---

## Développement local (sans Docker)

```bash
cd app
npm install
cp .env.example .env
# Éditer DATABASE_URL dans .env
npx prisma db push
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

---

## Schéma de base de données

Le schéma comprend **3 types de tables** conformément aux exigences :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SCHÉMA BASE DE DONNÉES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐      │
│  │    raw_data      │    │ transformed_data │    │    kpi_data      │      │
│  │  (TABLE SOURCE)  │    │(TABLE TRANSFORMÉE)│   │  (TABLE KPIs)    │      │
│  ├──────────────────┤    ├──────────────────┤    ├──────────────────┤      │
│  │ id         CUID  │    │ id         CUID  │    │ id         CUID  │      │
│  │ hash     UNIQUE  │    │ code_insee UNIQUE│    │ label    UNIQUE  │      │
│  │ raw        JSON  │    │ nom              │    │ total_communes   │      │
│  │ created_at       │    │ dep_code/dep_nom │    │ avg_score        │      │
│  └──────────────────┘    │ reg_nom          │    │ total_coproprietes│     │
│                          │ population       │    │ total_lots_stat. │      │
│  Données brutes du CSV   │ densite          │    │ avg_tension      │      │
│  93 colonnes en JSON     │ latitude/longitude│   │ top_commune_*    │      │
│  Hash SHA-256 anti-dup   │ score_potentiel  │    │ created_at       │      │
│                          │ rang             │    │ updated_at       │      │
│                          │ nb_coproprietes  │    └──────────────────┘      │
│                          │ total_lots_stat. │                              │
│                          │ taux_motorisation│    KPIs agrégés précalculés  │
│                          │ part_collectif   │    pour affichage rapide     │
│                          │ taux_sans_garage │                              │
│                          │ indice_tension   │                              │
│                          │ densite_opportun.│                              │
│                          │ zone_abc         │                              │
│                          │ tension_immo     │                              │
│                          │ score_infra_rech │                              │
│                          │ score_tension_im │                              │
│                          │ created_at       │                              │
│                          │ updated_at       │                              │
│                          └──────────────────┘                              │
│                                                                             │
│                          Données nettoyées et                               │
│                          enrichies par commune                              │
│                          ~13 000 entrées                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### `raw_data` — Données sources brutes

Table de traçabilité contenant les données CSV telles que reçues, sans transformation.

| Colonne | Type | Description |
|---|---|---|
| `id` | CUID | Identifiant unique |
| `hash` | String (unique) | SHA-256 du JSON — empêche les doublons |
| `raw` | JSONB | Ligne CSV complète (93 colonnes) |
| `created_at` | DateTime | Timestamp d'ingestion |

### `transformed_data` — Données transformées par commune

Données nettoyées, enrichies et prêtes pour l'analyse. Filtre les données de mauvaise qualité à l'import.

| Colonne | Type | Description |
|---|---|---|
| `code_insee` | String (unique) | Code INSEE de la commune |
| `nom` | String | Nom de la commune |
| `dep_code` / `dep_nom` | String | Département |
| `reg_nom` | String | Région |
| `code_postal` | String? | Code postal |
| `population` | Int | Population |
| `densite` | Float | Densité (hab/km²) |
| `latitude` / `longitude` | Float | Centre géographique |
| `score_potentiel` | Float | Score composite (0–100) |
| `rang` | Int | Classement national |
| `nb_coproprietes` | Float | Nombre de copropriétés |
| `total_lots_stationnement` | Float | Lots parking en copropriété |
| `taux_motorisation` | Float | % ménages motorisés |
| `part_collectif` | Float | % logements collectifs |
| `taux_voiture_sans_garage` | Float | % voitures sans garage |
| `indice_tension_stationnement` | Float | Indice de tension |
| `densite_opportunite` | Float | Copropriétés / km² |
| `zone_abc` | String? | Zone de tension immobilière (Abis, A, B1, B2, C) |
| `tension_immobiliere` | Float? | Score tension immobilière |
| `score_infra_recharge` | Float? | Score infrastructure recharge VE |
| `score_tension_immo` | Float? | Score tension immobilière normalisé |

### `kpi_data` — KPIs agrégés

Résultats précalculés pour affichage rapide dans le dashboard.

| Colonne | Type | Description |
|---|---|---|
| `label` | String (unique) | Identifiant du KPI (ex: "global") |
| `total_communes` | Int | Nombre de communes |
| `avg_score` | Float | Score moyen |
| `total_coproprietes` | Int | Total copropriétés |
| `total_lots_stationnement` | Int | Total lots stationnement |
| `avg_tension_stationnement` | Float | Tension moyenne |
| `avg_densite_opportunite` | Float | Densité opportunité moyenne |
| `top_commune_nom` | String? | Nom de la meilleure commune |
| `top_commune_dep` | String? | Département |
| `top_commune_score` | Float? | Score |

---

## Qualité des données

L'import (`POST /api/seed`) filtre automatiquement les données invalides :
- Code INSEE manquant ou vide
- Nom de commune manquant
- Score hors plage [0, 100]
- Coordonnées invalides (sauf communes connues : Paris, Lyon, Marseille)
- Population négative

Le nombre de lignes ignorées est retourné dans la réponse API.

---

## API REST

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/kpis` | KPIs agrégés |
| `GET` | `/api/raw-data?page=1&limit=20` | Données brutes paginées |
| `POST` | `/api/raw-data` | Insérer une donnée (dédupliquée par hash) |
| `GET` | `/api/transformed-data` | Communes — filtres : `region`, `departement`, `scoreMin`, `scoreMax`, `grilleTexte`, `sortBy`, `sortOrder` |
| `POST` | `/api/seed` | Importer le CSV du pipeline data |

---

## Fonctionnalités du dashboard

- **Carte interactive** : 13 000+ communes avec scoring coloré
- **Filtres dynamiques** : région, département, grille de densité, plage de score
- **Graphiques dynamiques** :
  - Top 15 communes par score
  - Top 10 départements
  - Scatter plot : Motorisation vs Densité d'opportunité
  - Répartition par grille de densité
  - **Matrice de corrélation interactive** (Bonus 2) — cliquer sur une cellule affiche le nuage de points correspondant
- **Classement paginé** des communes
- **Données brutes** consultables avec pagination

---

## Score de potentiel (0–100)

Moyenne pondérée de 9 facteurs normalisés (percentiles 1%-99%) :

| Facteur | Poids | Source |
|---|---|---|
| Densité de copropriétés (copro/km²) | 17% | RNIC |
| Taux de ménages sans garage | 17% | INSEE Logements |
| Part logements collectifs | 12% | INSEE Logements |
| Lots parking / 1000 hab | 12% | RNIC |
| **Tension immobilière (zonage ABC)** | **10%** | data.gouv.fr |
| Taux de motorisation | 8% | INSEE |
| Densité de population | 8% | INSEE |
| Part copro avec parking | 8% | RNIC |
| **Infrastructure recharge VE** | **8%** | IRVE data.gouv.fr |
