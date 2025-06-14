// src/lib/utils.ts
import { clsx } from 'clsx';           // ggf. installieren: npm install clsx
import { twMerge } from 'tailwind-merge'; // ggf. installieren: npm install tailwind-merge

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(...inputs));
}