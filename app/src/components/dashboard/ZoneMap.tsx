"use client";

import dynamic from "next/dynamic";
import type { TransformedDataEntry } from "@/types";

/** Import dynamique — Leaflet ne supporte pas le rendu côté serveur (SSR) */
const MapContent = dynamic(() => import("./MapContent"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[450px] bg-card flex items-center justify-center text-muted">
      Chargement de la carte…
    </div>
  ),
});

interface ZoneMapProps {
  data: TransformedDataEntry[];
}

export default function ZoneMap({ data }: ZoneMapProps) {
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden" style={{ minHeight: "450px" }}>
      <MapContent data={data} />
    </div>
  );
}
