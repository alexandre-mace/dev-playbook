/**
 * Les règles d'écriture qui se réduisent à un motif, refusées ici plutôt que
 * relevées d'audit en audit. Lancé par `pnpm lint`.
 *
 * Une règle dit d'où elle vient et sur quoi elle se lit. La portée compte : un
 * attribut JSX tient rarement sur une ligne, et une règle qui crie au loup
 * finit désactivée.
 */
import { globSync, readFileSync } from "node:fs";

const RULES = [
  {
    name: "point médian",
    source: "agent/writing.md, Typography",
    scope: "line",
    pattern: /·/,
    fix: "une virgule, ou « et » quand il joint deux éléments",
  },
  {
    name: "tiret cadratin",
    source: "agent/writing.md, Typography",
    scope: "line",
    pattern: /—/,
    fix: "des virgules pour une apposition, deux-points pour une explication",
  },
  {
    name: 'target="_blank" sans rel',
    source: "react-guidelines.md §4",
    // Sur le fichier entier : l'attribut et son rel sont sur deux lignes.
    scope: "file",
    pattern: /target=["']_blank["'](?![\s\S]{0,200}?rel=)/g,
    fix: 'ajouter rel="noreferrer" sur la même balise',
  },
];

const FILES = globSync(
  "{app,components,lib,scripts}/**/*.{ts,tsx,css,mjs}",
).filter(
  (file) =>
    !file.includes("components/ui/") && file !== "scripts/check-mechanical.mjs",
);

function report(file, line, rule, text) {
  console.error(
    `${file}:${line}  ${rule.name}  (${rule.source})\n    ${text.trim().slice(0, 100)}\n    → ${rule.fix}`,
  );
}

let failures = 0;
for (const file of FILES) {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (const rule of RULES) {
    if (rule.scope === "line") {
      lines.forEach((line, index) => {
        if (rule.pattern.test(line)) {
          failures += 1;
          report(file, index + 1, rule, line);
        }
      });
      continue;
    }

    rule.pattern.lastIndex = 0;
    for (const match of content.matchAll(rule.pattern)) {
      failures += 1;
      const line = content.slice(0, match.index).split("\n").length;
      report(file, line, rule, lines[line - 1] ?? match[0]);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} écart(s) mécanique(s).`);
  process.exit(1);
}
console.log(`${FILES.length} fichiers, 0 écart mécanique.`);
