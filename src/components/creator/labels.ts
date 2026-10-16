import { num, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { WizardLabels } from "./CreateWizard";

/** Plain-string labels for the client wizard (dictionary entries may be functions). */
export function wizardLabels(d: Dictionary, locale: Locale): WizardLabels {
  const c = d.creator;
  return {
    steps: c.steps, next: c.next, back: c.back, pickChild: c.pickChild, noChildren: c.noChildren, pickCharacter: c.pickCharacter,
    noCharacters: c.noCharacters, makeCharacter: c.makeCharacter, pickTheme: c.pickTheme, ideaTitle: c.ideaTitle, ideaLabel: c.ideaLabel,
    ideaPlaceholder: c.ideaPlaceholder, ideaHint: c.ideaHint, ideaRequired: c.ideaRequired, lessonLabel: c.lessonLabel, lessonPlaceholder: c.lessonPlaceholder,
    settingsTitle: c.settingsTitle, language: c.language, ageRange: c.ageRange, length: c.length, lengthHint: c.lengthHint, orientation: c.orientation,
    portrait: c.portrait, landscape: c.landscape, dedication: c.dedication, dedicationPlaceholder: c.dedicationPlaceholder, write: c.write,
    writing: c.writing, free: c.free, addChild: d.children.add,
    pagesLabels: { 8: d.common.pages(8), 12: d.common.pages(12), 16: d.common.pages(16) },
    ageLabels: Object.fromEntries(["0-2", "3-5", "6-8", "9-12"].map((a) => [a, num(a.replace("-", "–"), locale)])),
  };
}
