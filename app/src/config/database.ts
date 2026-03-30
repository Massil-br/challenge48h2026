/** Configuration centralisée pour la connexion PostgreSQL */
export const databaseConfig = {
  url: process.env.DATABASE_URL,
  isProduction: process.env.NODE_ENV === "production",
} as const;

export function validateDatabaseConfig(): void {
  if (!databaseConfig.url)
    throw new Error("DATABASE_URL manquante — vérifiez votre fichier .env");
}
