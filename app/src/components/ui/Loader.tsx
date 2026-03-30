"use client";

interface LoaderProps {
  label?: string;
}

/** Overlay plein écran avec fond flouté et spinner animé */
export default function Loader({ label = "Chargement…" }: LoaderProps) {
  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        <svg className="animate-spin h-10 w-10 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-muted text-sm font-medium animate-pulse">{label}</span>
      </div>
    </div>
  );
}
