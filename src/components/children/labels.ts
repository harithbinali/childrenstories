import type { Dictionary } from "@/i18n/dictionaries";
import type { ChildFormLabels } from "./ChildForm";

/** Only plain strings may cross into the client form (dictionary entries can be functions). */
export function childFormLabels(t: Dictionary["children"]): ChildFormLabels {
  const { name, namePlaceholder, nameHint, age, agePlaceholder, interests, interestsPlaceholder, interestsHint, language, appearance, appearancePlaceholder, appearanceHint, save, saved } = t;
  return { name, namePlaceholder, nameHint, age, agePlaceholder, interests, interestsPlaceholder, interestsHint, language, appearance, appearancePlaceholder, appearanceHint, save, saved };
}
