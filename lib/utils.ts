// Utility to compose class names safely.
// - clsx handles conditional/class array logic
// - tailwind-merge dedupes conflicting Tailwind classes
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
