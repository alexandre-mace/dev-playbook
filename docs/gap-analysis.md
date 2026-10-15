# Gap Analysis : Theorie vs Pratique

> Ecarts entre les guidelines de la stack et le code actuel, à la date de l'audit.
> Organisé par priorité. Les cases servent le temps d'une session de nettoyage :
> le prochain audit réécrit le fichier.
> Audit de main à 94b5b552bc1668cfea3cac6eced3325feaf5ba74, le 16 octobre 2026. Un delta part de ce commit.

---

Passe complète, deuxième du dépôt. Les 23 fichiers source hors kit ont été relus, la
config, la porte et les fichiers d'instruction compris. Les quatorze constats du premier
passage sont tous fermés ou assumés ; ce qui suit est nouveau, et trois des quatre
viennent du lot de correction d'hier.

Ce qui a été vérifié sans rien donner, pour que le prochain passage ne le refasse pas à
l'aveugle : versions contre la référence du 29 septembre (toutes tenues, Next 16.3.8
au-dessus du plancher 16.3.7, TypeScript 7.0.2, React 19.3.1, Biome 2.5.14, Base UI
1.9.0, Tailwind 4.3.3), `tsconfig.json` strict, `packageManager` épinglé et lockfile
pnpm unique, `reactCompiler: true` avec son `babel-plugin-react-compiler`, les en-têtes
de sécurité, l'absence de `hostname: "**"`, de `useMemo` écrit à la main, d'`asChild`,
d'`outline-hidden`, de `fetch` au runtime, de `NEXT_PUBLIC_`, de `favicon.ico` et de
`tailwind.config`. Et les 54 écrans qui déclarent un surlignage pointent tous dans les
bornes de leur bloc.

## 0. La porte mécanique ne lit pas la prose du dépôt (Moyenne priorité)

**Idéal** : une règle qui se réduit à un motif est refusée au commit, pas relevée d'audit
en audit. Les règles de typographie d'`agent/writing.md` valent pour tout ce qui s'écrit,
documentation comprise.
**Actuel** : `scripts/check-mechanical.mjs` ne globe que
`{app,components,lib,scripts}/**/*.{ts,tsx,css,mjs}`.

- [x] `scripts/check-mechanical.mjs:36` : `AGENTS.md`, `README.md` et `docs/` échappent à la porte (sûr)
  - La règle du point médian et celle du tiret cadratin s'arrêtent au code. Le dépôt a pourtant plus de prose que de composants, et c'est la prose que `writing.md` vise en premier.
  - L'extension demande une exception, et c'est elle qui rend le constat non trivial : les sept premières lignes d'`AGENTS.md` sont le bloc auto-géré que `next dev` réécrit, et il porte deux tirets cadratins. `AGENTS.md` dit lui-même de le commiter sans l'éditer, donc la règle doit sauter ce bloc plutôt que le refuser, sinon `pnpm lint` échoue sur un texte que personne ne contrôle.

## 1. Deux couleurs jumelles rouvertes dans le lot qui fermait la famille (Basse priorité)

**Idéal** : une couleur vit une fois. `app/opengraph-image.tsx` lit `--background` et
`--primary` dans `globals.css` au build, par son helper `token()`.
**Actuel** : les deux icônes ajoutées dans le même commit recopient la valeur.

- [x] `app/icon.tsx:21` et `app/apple-icon.tsx:17` : `background: "#FAF8F0"` en dur (sûr)
  - C'est exactement `--background` de `app/globals.css:9`, et donc la jumelle que `token()` venait d'éliminer à côté. Changer le thème laisse les deux icônes derrière, sans bruit, comme l'image OG le faisait avant-hier.
  - Le correctif est l'appel qui existe déjà. Le helper vit dans `opengraph-image.tsx` : il remonte dans `lib/site.ts`, et les trois fichiers le partagent.
  - Le constat vaut autant pour la méthode : le lot d'hier a corrigé la ligne et pas la famille, alors qu'il créait les deux nouvelles occurrences dans le même diff.

## 2. Le focus se pose dans un sous-arbre aria-hidden (Basse priorité)

**Idéal** : `react-guidelines.md` §6. Rien d'atteignable ne vit sous un `aria-hidden`, et
un lecteur d'écran ne doit pas se retrouver sur un nœud que l'arbre d'accessibilité dit
inexistant.
**Actuel** : la réglette du deck est `aria-hidden="true"`, ses segments sont des
`<button>` cliquables.

- [x] `components/deck.tsx:136-158` : cliquer un segment laisse le focus dedans (sûr)
  - Mesuré dans le navigateur, pas déduit : après un clic réel sur le segment du cinquième écran, le deck passe bien à 5/12, et `document.activeElement.closest('[aria-hidden="true"]')` rend le bouton. Le `tabIndex={-1}` retire la tabulation, pas le focus au clic.
  - Le plus court est d'annuler le focus au `mousedown` plutôt que de défaire le `aria-hidden` : la réglette double volontairement ce que le compteur et les flèches exposent déjà, et lui rendre une voix la ferait annoncer douze fois.

## 3. AGENTS.md a trois longueurs de retard sur le lot d'hier (Basse priorité)

**Idéal** : `AGENTS.md` porte ce qui est vrai du dépôt, et `writing-things-down.md` veut
qu'un piège qui coûte une heure y vive plutôt que dans un fichier réécrit à chaque audit.
**Actuel** : trois choses posées hier n'y sont pas.

- [x] `AGENTS.md:21` : « `pnpm lint` Biome » (sûr)
  - La commande est `biome check && node scripts/check-mechanical.mjs` depuis hier. La porte mécanique n'est nommée nulle part dans le fichier, alors que c'est elle qui refuse le point médian et qu'un contributeur a besoin de savoir qu'elle existe avant de se demander pourquoi son commit est refusé.
- [x] `AGENTS.md:73` : la liste des exclusions Biome omet `public/` (sûr)
  - Ajouté hier. La raison est un vrai piège : Biome 2.5 lit désormais les SVG et `noSvgWithoutTitle` réclame un titre sur `public/mark.svg`, qui n'est rendu que par `<Brand>` en `alt=""`. Lui donner un titre le ferait annoncer en double avec le nom de la marque, ce que `react-guidelines.md` §6 interdit. Cette raison ne vit aujourd'hui que dans ce fichier, que le prochain audit écrase.
- [x] `AGENTS.md` : le coût de build des icônes n'est écrit nulle part (sûr)
  - `app/icon.tsx` et `app/apple-icon.tsx` rendent un emoji par `ImageResponse`, ce qui va chercher la police Noto sur un CDN. Mesuré, le premier build froid passe de 2 s à 26 s. Quelqu'un qui voit un build lent sans cette ligne cherchera ailleurs.

## Écarts assumés

- `scripts/check-mechanical.mjs` : la règle du `rel` ne vaut que pour le code. En prose, `target="_blank"` est une citation, et la documentation de cette porte dans `AGENTS.md` en contient une. Les règles de typographie, elles, valent partout.

- `package.json` : Biome épinglé en **2.5.14**, pas en 2.5.15. La 2.5.15 panique sur tout `.gitignore` non vide quand `vcs.useIgnoreFile` est à vrai, `path is expected to be under the root`, depuis `ignore-0.4.25/src/gitignore.rs:232`. Bissecté : 2.5.10 à 2.5.14 passent, 2.5.15 non, et un `.gitignore` vide suffit à faire disparaître la panique quelles que soient les `includes`. C'est un bug amont, pas notre config, et le contourner en passant `useIgnoreFile` à faux reviendrait à cacher un plantage. À relever au prochain `/gap-sota`.
- `biome.json` : `public/` est écarté du linter, pour la raison détaillée en 3 ci-dessus.
- `app/icon.tsx` et `app/apple-icon.tsx` : le rendu de l'emoji dépend d'un CDN au build, pour 24 s sur un build froid. Vercel repart froid à chaque déploiement, sur des builds qui durent déjà 21 à 38 s. C'est le prix d'un emoji qui se dessine pareil partout, au lieu d'un `<text>` SVG rendu par la police du système.
- `app/opengraph-image.tsx:31-32` : `#171717` et `#6b6a63` restent en littéral. Leurs jumeaux `--foreground` et `--muted-foreground` sont déclarés en OkLCh, que Satori ne sait pas interpréter. Les deux lignes le disent.
- `components/code-block.tsx:72` : `dangerouslySetInnerHTML` sur le HTML de Shiki. `react-guidelines.md` §4 réserve l'échappatoire au markup produit par le projet : c'est le cas, il est produit au build depuis des constantes du dépôt, aucune entrée utilisateur n'y arrive. La raison est dans le `biome-ignore` au-dessus de la ligne.
- `AGENTS.md:1-9` : le bloc auto-géré par `next dev` porte deux tirets cadratins, que `writing.md` interdit. Il se réécrit tout seul à chaque `next dev` et le fichier dit de le commiter sans l'éditer.
- `components/brand.tsx` et `components/made-with-love.tsx` portent `"use client"` sans tenir d'état ni d'interaction, là où `next-guidelines.md` §4 réserve la directive à ce qui en tient. Les deux viennent du registry `@alexandremace` et `biome.json` les exclut : la correction appartient au kit, à remonter par `/propagate-kit`.
- Pas de suite de tests, et pas de hook de commit. `next-guidelines.md` ne rend les tests obligatoires qu'avec un backend (§6), que ce site n'a pas : tout est cuit au build, personne n'écrit. `pnpm build`, `pnpm lint` et `/live-test` sont la porte, et c'est celle que la Definition of Done de la stack demande.
