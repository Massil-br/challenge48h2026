interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export default function Card({ title, value, subtitle }: CardProps) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 hover:border-accent/40 transition-colors">
      <span className="text-muted text-xs font-medium uppercase tracking-wide">{title}</span>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
      {subtitle && <p className="text-muted text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
