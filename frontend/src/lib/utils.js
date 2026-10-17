import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Junta clases de Tailwind resolviendo los choques ("p-2 p-4" -> "p-4"). Es la utilidad que
// esperan los componentes de shadcn/mapcn (import { cn } from "@/lib/utils"); el resto de la app
// no la necesita.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
