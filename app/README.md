# ParkShare Analytics

Dashboard d'analyse du potentiel de partage de parking par commune française — basé sur des données ouvertes (INSEE, RNIC, DVF, IGN).

## Stack technique

| Technologie | Usage |
|---|---|
| **Next.js 16** | Framework full-stack (App Router, TypeScript) |
| **PostgreSQL** | Base de données relationnelle |
| **Prisma 7** | ORM type-safe + adapter `@prisma/adapter-pg` |
| **Tailwind CSS v4** | Styling (thème noir / jaune) |
| **Leaflet** | Carte interactive (tuiles CARTO dark) |

## Prérequis

- Node.js 20+
- PostgreSQL 14+
- Données du pipeline (`../data/output/kpis_par_commune.csv`) — voir `../data/README.md`

## Déploiement Docker (recommandé)

### Lancer l'application

```bash
cd app
docker compose up -d --build
```

Cela démarre deux conteneurs :

| Service | Image | Port |
|---|---|---|
| `db` | `postgres:16-alpine` | 5432 |
| `app` | Build local (Dockerfile) | 3000 |

Au démarrage, le conteneur `app` synchronise automatiquement le schéma Prisma avec PostgreSQL (`prisma db push`).

Ouvrir [http://localhost:3000](http://localhost:3000).

### Importer les données

Le dossier `data/` est monté en lecture seule dans le conteneur. Pour importer le CSV :

```bash
curl -X POST http://localhost:3000/api/seed
```

Ou cliquer sur « Initialiser les données » dans le dashboard.

### Stopper

```bash
docker compose down
```

Pour supprimer aussi les données PostgreSQL :

```bash
docker compose down -v
```

### Donner les images à l'équipe infra

```bash
docker compose build
docker save app-app:latest -o parkshare-app.tar
docker pull postgres:16-alpine
docker save postgres:16-alpine -o postgres.tar
```

L'équipe infra charge les images avec `docker load -i parkshare-app.tar` et `docker load -i postgres.tar`, puis lance `docker compose up -d` avec le `docker-compose.yml` fourni.

---

## Développement local (sans Docker)

### Installation

```bash
cd app
npm install
```

### Configuration

```bash
cp .env.example .env
```

Adapter `DATABASE_URL` dans `.env` :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/parkshare?schema=public"
```

### Migration de la base

```bash
npx prisma migrate dev --name init
```

### Lancer le serveur

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Importer les données

Deux méthodes :

1. **Via le dashboard** : cliquer sur « Initialiser les données »
2. **Via curl** :
```bash
curl -X POST http://localhost:3000/api/seed
```

Le seed lit `../data/output/kpis_par_commune.csv` (13 024 communes scorées, 93 colonnes) et alimente les deux tables.

## Structure du projet

```
src/
├── app/                          # Pages et API routes (App Router)
│   ├── api/
│   │   ├── kpis/route.ts        # GET — KPIs agrégés
│   │   ├── raw-data/route.ts    # GET (paginé) / POST (anti-duplication hash)
│   │   ├── seed/route.ts        # POST — Import CSV pipeline data
│   │   └── transformed-data/    # GET — Données par commune + filtres
│   ├── globals.css               # Thème Tailwind noir/jaune
│   ├── layout.tsx                # Layout racine (lang="fr")
│   └── page.tsx                  # Dashboard
├── components/
│   ├── dashboard/
│   │   ├── Dashboard.tsx         # Orchestrateur (fetch + filtres client-side)
│   │   ├── DataTable.tsx         # Données brutes paginées
│   │   ├── Filters.tsx           # Région, département, densité, score, tri
│   │   ├── KpiCards.tsx          # 6 indicateurs clés
│   │   ├── MapContent.tsx        # Carte Leaflet (13 000+ marqueurs)
│   │   ├── ZoneMap.tsx           # Wrapper SSR-safe
│   │   └── ZoneRanking.tsx       # Classement paginé par score
│   └── ui/Card.tsx
├── config/database.ts
├── lib/
│   ├── csv.ts                    # Parser CSV pour l'import
│   ├── hash.ts                   # SHA-256 anti-duplication
│   └── prisma.ts                 # Singleton PrismaClient + adapter PG
└── types/index.ts                # Types centralisés
```

## Schéma de base de données

### `raw_data` — Données brutes

| Colonne | Type | Description |
|---|---|---|
| `id` | CUID | Identifiant unique |
| `hash` | String (unique) | SHA-256 du JSON — empêche les doublons |
| `raw` | JSONB | Ligne CSV complète (93 colonnes) |
| `created_at` | DateTime | Timestamp d'ingestion |

### `transformed_data` — Données par commune

| Colonne | Type | Description |
|---|---|---|
| `code_insee` | String (unique) | Code INSEE de la commune |
| `nom` | String | Nom de la commune |
| `dep_code` / `dep_nom` | String | Département |
| `reg_nom` | String | Région |
| `population` / `densite` | Int / Float | Démographie |
| `latitude` / `longitude` | Float | Centre géographique |
| `score_potentiel` | Float | Score composite ParkShare (0–100) |
| `rang` | Int | Classement national |
| `nb_coproprietes` | Float | Nombre de copropriétés |
| `total_lots_stationnement` | Float | Lots parking en copropriété |
| `taux_motorisation` | Float | % ménages motorisés |
| `part_collectif` | Float | % logements collectifs |
| `taux_voiture_sans_garage` | Float | % voitures sans garage |
| `indice_tension_stationnement` | Float | Indice de tension (motori. × sans garage × densité) |
| `densite_opportunite` | Float | Copropriétés / km² |

## API REST

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/kpis` | KPIs agrégés |
| `GET` | `/api/raw-data?page=1&limit=20` | Données brutes paginées |
| `POST` | `/api/raw-data` | Insérer une donnée (dédupliquée par hash) |
| `GET` | `/api/transformed-data` | Communes — filtres : `region`, `departement`, `scoreMin`, `scoreMax`, `grilleTexte`, `sortBy`, `sortOrder` |
| `POST` | `/api/seed` | Importer le CSV du pipeline data |

## Score de potentiel (0–100)

Moyenne pondérée de 7 facteurs normalisés (percentiles 1%-99%) :

| Facteur | Poids | Source |
|---|---|---|
| Densité de copropriétés (copro/km²) | 20% | RNIC |
| Taux de ménages sans garage | 20% | INSEE Logements |
| Part logements collectifs | 15% | INSEE Logements |
| Lots parking / 1000 hab | 15% | RNIC |
| Taux de motorisation | 10% | INSEE |
| Densité de population | 10% | INSEE |
| Part copro avec parking | 10% | RNIC |
