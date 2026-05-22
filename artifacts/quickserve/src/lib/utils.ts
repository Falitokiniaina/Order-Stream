import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatOrderRef(nom: string, id: number): string {
  return `${nom}-N°${String(id).padStart(5, "0")}`;
}
