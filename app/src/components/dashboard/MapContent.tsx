"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { TransformedDataEntry } from "@/types";

interface MapContentProps {
  data: TransformedDataEntry[];
}

/** Palette proportionnelle au score de potentiel ParkShare */
function scoreColor(score: number): string {
  if (score >= 60) return "#facc15";
  if (score >= 45) return "#ca8a04";
  if (score >= 30) return "#a16207";
  if (score >= 15) return "#78350f";
  return "#451a03";
}

export default function MapContent({ data }: MapContentProps) {
  return (
    <MapContainer center={[46.603354, 1.888334]} zoom={6} className="h-full w-full" style={{ minHeight: "500px", background: "#0a0a0a" }}>
      <TileLayer
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {data.map((c) => (
        <CircleMarker
          key={c.codeInsee}
          center={[c.latitude, c.longitude]}
          radius={Math.max(3, Math.min(12, c.scorePotentiel / 8))}
          pathOptions={{ fillColor: scoreColor(c.scorePotentiel), color: "#eab308", weight: 0.5, fillOpacity: 0.7 }}
        >
          <Popup>
            <div className="text-sm leading-relaxed min-w-[200px]">
              <p className="font-bold text-base">{c.nom}</p>
              <p className="text-gray-500">{c.depNom} — {c.regNom}</p>
              <hr className="my-1.5" />
              <p>Score : <strong>{c.scorePotentiel.toFixed(1)}/100</strong> (rang #{c.rang})</p>
              <p>Population : {c.population.toLocaleString("fr-FR")}</p>
              <p>Copropriétés : {c.nbCoproprietes.toLocaleString("fr-FR")}</p>
              <p>Lots stationnement : {c.totalLotsStationnement.toLocaleString("fr-FR")}</p>
              <p>Motorisation : {c.tauxMotorisation.toFixed(1)}%</p>
              <p>Part collectif : {c.partCollectif.toFixed(1)}%</p>
              <p>Tension : {c.indiceTensionStationnement.toFixed(1)}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
