export interface RawDataEntry {
  id: string;
  hash: string;
  raw: unknown;
  createdAt: Date;
}

export interface TransformedDataEntry {
  id: string;
  codeInsee: string;
  nom: string;
  depCode: string;
  depNom: string;
  regNom: string;
  codePostal: string | null;
  population: number;
  densite: number;
  latitude: number;
  longitude: number;
  scorePotentiel: number;
  rang: number;
  nbCoproprietes: number;
  totalLotsStationnement: number;
  tauxMotorisation: number;
  partCollectif: number;
  tauxVoitureSansGarage: number;
  indiceTensionStationnement: number;
  densiteOpportunite: number;
  grilleTexte: string | null;
  zoneAbc: string | null;
  tensionImmobiliere: number | null;
  scoreInfraRecharge: number | null;
  scoreTensionImmo: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardKpis {
  totalCommunes: number;
  avgScore: number;
  totalCoproprietes: number;
  totalLotsStationnement: number;
  avgTensionStationnement: number;
  avgDensiteOpportunite: number;
  topCommune: { nom: string; depNom: string; scorePotentiel: number } | null;
}

export interface DataFilters {
  region?: string;
  departement?: string;
  scoreMin?: number;
  scoreMax?: number;
  grilleTexte?: string;
  zoneAbc?: string;
  populationMin?: number;
  populationMax?: number;
  tensionMin?: number;
  tensionMax?: number;
  sortBy?: "scorePotentiel" | "nom" | "population" | "indiceTensionStationnement" | "densiteOpportunite";
  sortOrder?: "asc" | "desc";
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  total: number;
  page: number;
  limit: number;
}
