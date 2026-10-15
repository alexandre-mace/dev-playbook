/**
 * Les règles d'écriture qui se réduisent à un motif, refusées ici plutôt que
 * relevées d'audit en audit. Lancé par `pnpm lint`.
 *
 * Une règle dit d'où elle vient et sur quoi elle se lit. La portée compte : un
 * attribut JSX tient rarement sur une ligne, et une règle qui crie au loup
 * finit désactivée.
 */
import { globSync, lstatSync, readFileSync } from "node:fs";

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
    // Une règle de code : en prose, target="_blank" est une citation, pas un
    // attribut, et la documentation de cette porte la cite forcément.
    code: true,
    // Sur le fichier entier : l'attribut et son rel sont sur deux lignes.
    scope: "file",
    pattern: /target=["']_blank["'](?![\s\S]{0,200}?rel=)/g,
    fix: 'ajouter rel="noreferrer" sur la même balise',
  },
];

// La prose compte autant que le code : agent/writing.md vise d'abord ce qui se lit.
// docs/gap-analysis.md est écarté comme en amont, il cite ses sources telles quelles.
const FILES = [
  ...globSync("{app,components,lib,scripts}/**/*.{ts,tsx,css,mjs}"),
  ...globSync("{*.md,docs/**/*.md}"),
].filter(
  (file) =>
    !file.includes("components/ui/") &&
    file !== "scripts/check-mechanical.mjs" &&
    file !== "docs/gap-analysis.md" &&
    // Les guidelines sont des liens vers dev-standards : elles appartiennent à
    // un autre dépôt, et c'est /gap-sota qui les corrige, pas cette porte.
    !lstatSync(file).isSymbolicLink(),
);

/**
 * Un bloc généré ne se juge pas : `next dev` réécrit le sien dans AGENTS.md à
 * chaque lancement, tirets cadratins compris, et le fichier dit de le commiter
 * sans l'éditer. Les lignes sont vidées plutôt que retirées, pour que les
 * numéros rapportés restent ceux du fichier.
 */
const GENERE = /<!--\s*BEGIN:[^>]*-->[\s\S]*?<!--\s*END:[^>]*-->/g;

function sansBlocsGeneres(content) {
  return content.replace(GENERE, (bloc) => bloc.replace(/[^\n]/g, " "));
}

function report(file, line, rule, text) {
  console.error(
    `${file}:${line}  ${rule.name}  (${rule.source})\n    ${text.trim().slice(0, 100)}\n    → ${rule.fix}`,
  );
}

let failures = 0;
for (const file of FILES) {
  const content = sansBlocsGeneres(readFileSync(file, "utf8"));
  const lines = content.split("\n");

  const estProse = file.endsWith(".md");

  for (const rule of RULES) {
    if (rule.code && estProse) continue;
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
