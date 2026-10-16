# Gap Analysis : Theorie vs Pratique

> Ecarts entre les guidelines de la stack et le code actuel, à la date de l'audit.
> Organisé par priorité. Les cases servent le temps d'une session de nettoyage :
> le prochain audit réécrit le fichier.
> Audit de main à b3a14cf0f10739687a73781e065c73e0a97fa761, le 16 octobre 2026. Un delta part de ce commit.

---

Troisième passe complète. Deux constats, et tous deux portent sur le lot de correction
précédent. C'est la troisième fois de suite : chaque lot produit les constats de la passe
qui le suit, et aucun des constats d'origine n'est jamais revenu. Le code ne régresse pas,
mais ce qui le garde se corrige moins bien qu'il ne corrige.

Vérifié sans rien donner, pour que le prochain passage ne le refasse pas à l'aveugle :
le balayage mécanique sur les 26 fichiers que la porte lit, les versions contre la
référence du 29 septembre (Next 16.3.8 au-dessus du plancher 16.3.7, TypeScript 7.0.2,
React 19.3.1, Biome 2.5.14, Base UI 1.9.0, Tailwind 4.3.3), `tsconfig.json` strict,
`packageManager` et lockfile, `reactCompiler: true` avec son plugin Babel, les quatre
en-têtes de sécurité, et l'absence d'`asChild`, d'`outline-hidden`, de `fetch` au
runtime, de `NEXT_PUBLIC_`, de `favicon.ico` et de `tailwind.config`.

Et le pari des `21rem`, que les deux écrans ajoutés hier mettaient en jeu : mesuré à
1512×900, 1280×700 et 1024×768, la page ne défile à aucune des trois.

## 0. La règle du `rel` se trompe dans les deux sens (Moyenne priorité)

**Idéal** : `react-guidelines.md` §4. Un `target="_blank"` porte son `rel`, et la porte
le refuse quand il manque.
**Actuel** : `scripts/check-mechanical.mjs:34` cherche un `rel=` dans les 200 caractères
qui suivent. Une fenêtre de caractères n'est pas une balise.

- [ ] `scripts/check-mechanical.mjs:34` : la règle laisse passer un vrai défaut et en invente un faux (sûr)
  - **Faux négatif, prouvé** : un `<a target="_blank">` sans aucun `rel`, suivi cinquante caractères plus loin d'une autre balise qui en porte un, passe. La porte rend 0. C'est précisément la chose que cette règle existe pour refuser, et elle se tait.
  - **Faux positif, prouvé** : un lien correct dont le `rel` arrive après 200 caractères de `className` est refusé. Les classes de ce dépôt dépassent couramment cette longueur, donc le cas n'est pas théorique.
  - Le correctif est de lire la balise, pas une fenêtre : isoler chaque balise ouvrante, puis vérifier qu'une balise qui porte `target="_blank"` porte aussi `rel=`. Les trois liens du dépôt passent aujourd'hui, mais par chance, pas par la règle.
  - `AGENTS.md:84` décrit la règle comme se lisant « sur le fichier entier », ce qui est vrai de l'implémentation et faux de l'intention. Les deux se corrigent ensemble.

## 1. Une citation qui ne résout pas (Basse priorité)

**Idéal** : `AGENTS.md` ne cite que ce qu'on peut ouvrir. La convention du dépôt est un
lien symbolique sous `docs/`, qui existe pour les deux guidelines de la pile.
**Actuel** : les règles d'écriture sont citées par un chemin qui n'existe pas ici.

- [ ] `AGENTS.md:75` : `agent/writing.md` n'existe pas dans le dépôt (sûr)
  - Relevé par `check-agent-files.py`, le script du skill. Ce n'est pas un faux positif : `docs/` ne lie que `next-guidelines.md` et `react-guidelines.md`, et il n'y a pas d'`agent/` ici.
  - La dépendance est pourtant réelle depuis hier : c'est `agent/writing.md` qui fournit les règles de typographie que la porte applique désormais à la prose du dépôt. Un `docs/writing.md` pointant vers `dev-standards/agent/writing.md` ferait résoudre la citation et suivrait la convention déjà en place.
  - Même famille, `AGENTS.md:95` cite `react-guidelines.md` à nu là où la ligne 28 écrit `docs/react-guidelines.md`.

## Écarts assumés

- `package.json` : Biome épinglé en **2.5.14**, pas en 2.5.15. La 2.5.15 panique sur tout `.gitignore` non vide quand `vcs.useIgnoreFile` est à vrai, `path is expected to be under the root`, depuis `ignore-0.4.25/src/gitignore.rs:232`. Bissecté : 2.5.10 à 2.5.14 passent, 2.5.15 non, et un `.gitignore` vide suffit à faire disparaître la panique quelles que soient les `includes`. Bug amont, pas notre config, et le contourner en passant `useIgnoreFile` à faux reviendrait à cacher un plantage. À relever au prochain `/gap-sota`.
- `biome.json` : `public/` est écarté du linter. Biome 2.5 lit les SVG, et `noSvgWithoutTitle` réclame un titre sur `public/mark.svg`, qui n'est rendu que par `<Brand>` en `alt=""`. Lui donner un titre le ferait annoncer en double avec le nom de la marque, ce que `react-guidelines.md` §6 interdit. La raison est aussi dans `AGENTS.md`, qui lui survit.
- `scripts/check-mechanical.mjs` : la règle du `rel` ne vaut que pour le code. En prose, `target="_blank"` est une citation, et la documentation de cette porte dans `AGENTS.md` en contient une.
- `app/icon.tsx` et `app/apple-icon.tsx` : le rendu de l'emoji dépend d'un CDN au build, pour 24 s sur un build froid. Vercel repart froid à chaque déploiement, sur des builds qui durent déjà 18 à 38 s. C'est le prix d'un emoji qui se dessine pareil partout, au lieu d'un `<text>` SVG rendu par la police du système.
- `lib/theme.ts:31-32` : `#171717` et `#6b6a63` restent en littéral. Leurs jumeaux `--foreground` et `--muted-foreground` sont déclarés en OkLCh, que Satori ne sait pas interpréter. Les deux lignes le disent.
- `components/code-block.tsx:72` : `dangerouslySetInnerHTML` sur le HTML de Shiki. `react-guidelines.md` §4 réserve l'échappatoire au markup produit par le projet : c'est le cas, il est produit au build depuis des constantes du dépôt, aucune entrée utilisateur n'y arrive. La raison est dans le `biome-ignore` au-dessus de la ligne.
- `AGENTS.md:1-9` : le bloc auto-géré par `next dev` porte deux tirets cadratins, que `writing.md` interdit. Il se réécrit tout seul à chaque `next dev` et le fichier dit de le commiter sans l'éditer. La porte saute le bloc par ses marqueurs.
- `components/brand.tsx` et `components/made-with-love.tsx` portent `"use client"` sans tenir d'état ni d'interaction, là où `next-guidelines.md` §4 réserve la directive à ce qui en tient. Les deux viennent du registry `@alexandremace` et `biome.json` les exclut : la correction appartient au kit, à remonter par `/propagate-kit`.
- Pas de suite de tests, et pas de hook de commit. `next-guidelines.md` ne rend les tests obligatoires qu'avec un backend (§6), que ce site n'a pas : tout est cuit au build, personne n'écrit. `pnpm build`, `pnpm lint` et `/live-test` sont la porte, et c'est celle que la Definition of Done de la stack demande.
