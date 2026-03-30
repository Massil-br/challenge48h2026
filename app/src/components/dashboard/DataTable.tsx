"use client";

import { useEffect, useState, useCallback } from "react";
import type { RawDataEntry } from "@/types";

const PER_PAGE = 20;

export default function DataTable() {
  const [data, setData] = useState<RawDataEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPage = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/raw-data?page=${p}&limit=${PER_PAGE}`)
      .then((r) => r.json())
      .then((r) => {
        if (r.success) { setData(r.data); setTotal(r.total); }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPage(page); }, [page, fetchPage]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-accent font-semibold text-sm uppercase tracking-wide">
          Données brutes ingérées ({total.toLocaleString("fr-FR")} entrées)
        </h3>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="px-2 py-1 border border-card-border rounded hover:bg-accent/10 disabled:opacity-30 cursor-pointer">←</button>
            <span className="text-muted">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="px-2 py-1 border border-card-border rounded hover:bg-accent/10 disabled:opacity-30 cursor-pointer">→</button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-muted text-sm py-4">Chargement…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs border-b border-card-border">
              <th className="text-left pb-2">ID</th>
              <th className="text-left pb-2">Hash SHA-256</th>
              <th className="text-left pb-2">Payload JSON</th>
              <th className="text-left pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.id} className="border-b border-card-border/50 hover:bg-accent/5 transition-colors">
                <td className="py-2 font-mono text-xs">{entry.id.slice(0, 10)}…</td>
                <td className="py-2 font-mono text-xs text-muted">{entry.hash.slice(0, 16)}…</td>
                <td className="py-2 text-xs max-w-sm truncate">{JSON.stringify(entry.raw).slice(0, 100)}…</td>
                <td className="py-2 text-xs text-muted whitespace-nowrap">{new Date(entry.createdAt).toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && data.length === 0 && (
        <p className="text-center text-muted py-8">Aucune donnée brute — cliquez sur « Initialiser les données ».</p>
      )}
    </div>
  );
}
