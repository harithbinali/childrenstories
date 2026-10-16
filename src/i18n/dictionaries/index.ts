import type { Locale } from "../config";
import type { Dictionary } from "./en";
import en from "./en";
import ar from "./ar";

const DICTIONARIES: Record<Locale, Dictionary> = { en, ar };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
