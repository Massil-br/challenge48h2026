# Infrastructure — ParkShare Analytics

## Architecture

```
Internet
  │
  ▼
┌──────────┐     ┌──────────┐     ┌──────────────┐
│  Nginx   │────▶│ Next.js  │────▶│ PostgreSQL   │
│ (port 80)│     │ (port    │     │ (port 5432)  │
│ reverse  │     │  3000)   │     │ réseau       │
│  proxy)  │     │ internal │     │ internal     │
└──────────┘     └──────────┘     └──────────────┘
   externe         interne           interne
```

Seuls Nginx est exposé sur le réseau externe. La base de données et l'application restent sur le réseau Docker interne.

## Prérequis

- Docker et Docker Compose installés
- Les données du pipeline data dans `/data/output/kpis_par_commune.csv`

## Déploiement

### 1. Configurer les variables d'environnement

```bash
cp ../.env.example .env
# Éditer .env avec vos valeurs de production
```

### 2. Lancer la stack

```bash
cd infra/
docker compose up -d --build
```

Cela démarre 3 services :
- **db** : PostgreSQL 16 (réseau interne uniquement)
- **app** : Next.js 16 (réseau interne uniquement)
- **nginx** : Reverse proxy (port 80, accessible depuis l'extérieur)

### 3. Initialiser les données

Accéder au dashboard et cliquer sur "Initialiser les données", ou :

```bash
curl -X POST http://<IP_SERVEUR>/api/seed
```

### 4. Accéder au dashboard

```
http://<IP_SERVEUR>/
```

## Variables d'environnement

| Variable | Description | Défaut |
|---|---|---|
| `POSTGRES_USER` | Utilisateur PostgreSQL | `parkshare` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `change_me_in_production` |
| `POSTGRES_DB` | Nom de la base | `parkshare` |
| `DATABASE_URL` | URL de connexion Prisma | construite depuis les vars ci-dessus |
| `APP_PORT` | Port exposé par Nginx | `80` |

## Services Docker

| Service | Image | Ports exposés | Réseau |
|---|---|---|---|
| `db` | postgres:16-alpine | aucun | internal |
| `app` | build depuis `/app` | aucun | internal |
| `nginx` | nginx:alpine | `${APP_PORT}:80` | internal + external |

## Sécurité

- Les secrets sont gérés via variables d'environnement (`.env`)
- Le fichier `.env.example` est versionné sans valeurs réelles
- Seul le reverse proxy Nginx est exposé sur le réseau externe
- La base de données n'est pas accessible depuis l'extérieur
- HTTPS peut être ajouté via Certbot ou en remplaçant Nginx par Traefik

## Commandes utiles

```bash
# Voir les logs
docker compose logs -f

# Redémarrer un service
docker compose restart app

# Arrêter la stack
docker compose down

# Supprimer les données (volumes)
docker compose down -v
```
