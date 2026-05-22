import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatOrderRef(nom: string, id: number): string {
  return `${nom}-N°${String(id).padStart(5, "0")}`;
}

export function matchesOrderSearch(o: { nom_commande: string; id: number }, q: string): boolean {
  if (!q) return true;
  const ql = q.toLowerCase();
  return (
    o.nom_commande.toLowerCase().includes(ql) ||
    String(o.id).includes(q) ||
    formatOrderRef(o.nom_commande, o.id).toLowerCase().includes(ql)
  );
}
