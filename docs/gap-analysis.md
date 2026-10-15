# Gap Analysis : Theorie vs Pratique

> Ecarts entre les guidelines de la stack et le code actuel, à la date de l'audit.
> Organisé par priorité. Les cases servent le temps d'une session de nettoyage :
> le prochain audit réécrit le fichier.
> Audit de main à 140f6330a03a49d1dc23b0058191e41673629bf7, le 15 octobre 2026. Un delta part de ce commit.

---

## 0. Plancher de sécurité Next non atteint (Haute priorité)

**Idéal** : `next-guidelines.md` fixe le plancher à **16.3.7**, publié le 30 septembre 2026.
La ligne 16.3 compte aujourd'hui huit correctifs, jusqu'à 16.3.8.
**Actuel** : `package.json` épingle `16.3.3`, et `node_modules` confirme 16.3.3 installé.

- [x] `package.json:14` : quatre correctifs de retard, dont deux de sécurité (sûr)
  - Monter à `16.3.8`, le dernier de la ligne mineure que la guideline impose. Rester en 16.3 : le passage en 16.4, publié depuis, relève de `/gap-sota`, pas de cet audit.
  - Le plus grave des deux, 16.3.6, corrige une exécution de code à distance par `ImageResponse` quand une entrée utilisateur atteint le SVG. Ce dépôt a bien un `app/opengraph-image.tsx` qui passe par `ImageResponse`, mais il ne rend que `TITRE` et `DESCRIPTION`, deux constantes de `lib/site.ts`. Rien de ce qu'un visiteur contrôle n'y entre, donc la faille n'est pas atteignable ici. Le plancher reste à atteindre.

## 1. Langue du code (Moyenne priorité)

**Idéal** : `agent/writing.md`, section « Which language », impose l'anglais pour les
classes, fonctions, variables, propriétés, noms de fichiers et routes, quelle que soit la
langue du projet. Le contenu et les commentaires restent en français.
**Actuel** : le contenu des écrans a été traduit en septembre, le code qui l'affiche non.

- [x] `lib/playbook/types.ts`, `lib/playbook/render.ts`, `components/`, `app/`, `lib/` : 50 identifiants français (sûr)
  - Les types : `Pile`, `Piste`, `Ecran`, `PileColoree`, `PisteColoree`, `EcranColore`.
  - Leurs champs : `titre`, `intention`, `piege`, `surligne`, `langage`, `fichier`, `rang`, `resume`, `these`, `labelCourt`, `pistes`, `ecrans`.
  - Les fonctions : `colorerPiles`, `colorer`, `lireAncre`, `ecrireAncre`, `noterPosition`, `changerDePile`, `changerDePiste`, `saisieEnCours`.
  - Les composants et constantes : `Carte`, `Entete`, `MarqueGithub`, `TITRE`, `DESCRIPTION`, `DOMAINE`, `LANGAGES`.
  - L'état local : `focusAuMontage`, `conteneur`, `depart`, `revision`, `positions`, `cle`, `actif`, `precedent`, `suivant`.
  - Le site montre l'anglais dans ses blocs de code et l'enfreint dans celui qui les affiche. `AGENTS.md` ne nomme que `types.ts` et le champ `source`, tous deux inchangés : il n'a rien à suivre.

## 2. Style shadcn et paquet `cn` (Moyenne priorité)

**Idéal** : `react-guidelines.md` §3 impose `"style": "base-vega"` et un `lib/utils.ts`
réduit à `export { cn } from "cn"` depuis la CLI 4.21.
**Actuel** : le projet est sur Nova, et `cn` est encore assemblé à la main.

- [ ] `components.json:3` : `"style": "base-nova"` au lieu de `"base-vega"` (sûr)
  - La guideline nomme explicitement ce cas comme un écart que `/gap-code` doit lever. Nova donne un bouton de 32 px sur `rounded-lg` là où Vega donne 36 px sur `rounded-md`, donc des contrôles plus petits que le reste de l'interface.
  - Migration en entier, jamais deux bases dans un projet. Vérifier au passage les ombres, les anneaux de focus et les tailles dans un navigateur.
- [x] `lib/utils.ts:1` : `clsx` + `tailwind-merge` au lieu du paquet `cn` (sûr)
  - `npx shadcn@latest migrate cn`, puis retirer les deux dépendances de `package.json`.

## 3. Le compilateur React fait le travail (Moyenne priorité)

**Idéal** : `react-guidelines.md` §2, aucun `useMemo`, `useCallback` ni `React.memo` écrit
à la main. Le compilateur est actif, `reactCompiler: true` est bien dans `next.config.ts`.
**Actuel** : deux `useCallback` à la main dans le deck.

- [x] `components/deck.tsx:63-64` : `precedent` et `suivant` enveloppés dans `useCallback` (sûr)
  - Les deux sont des appels d'une ligne à `embla?.scrollPrev()` et `embla?.scrollNext()`. Le compilateur les mémoïse si besoin.
  - `lib/playbook/next.ts:134` enseigne précisément l'inverse au lecteur : « Pas de useMemo ni de useCallback : le compilateur les place. » Le site enfreint la règle qu'il affiche.

## 4. Versions en retard sur la guideline (Moyenne priorité)

**Idéal** : les versions de référence de l'en-tête « Last watch » du 29 septembre 2026.
**Actuel** : quatre outils derrière, sans conséquence de sécurité connue.

- [ ] `package.json` : TypeScript `^5` (5.9.3 installé) au lieu de 7.0 (sûr)
  - `next build` type-check avec TypeScript 7 depuis 16.3. La migration passe par 6.0 d'abord, la procédure est dans `symfony-react/reactony.md` §8.
- [ ] `package.json` : Biome 2.4.2 au lieu de 2.5 (sûr)
- [ ] `package.json` : `@base-ui/react` 1.7.0 au lieu de 1.8 (sûr)
- [ ] `package.json` : React 19.2.8 au lieu de 19.3 (sûr)
  - 19.3 rend les transitions indépendantes séparément au lieu de les regrouper. Le deck n'utilise pas `startTransition`, donc rien à vérifier côté comportement.

## 5. Un `Omit` qui n'omet rien (Moyenne priorité)

**Idéal** : un type dérivé dit ce qu'il remplace.
**Actuel** : la clé passée à `Omit` porte un accent que le champ n'a pas.

- [ ] `lib/playbook/rendu.ts:12` : `Omit<Piste, "écrans">` au lieu de `Omit<Piste, "ecrans">` (sûr)
  - Vérifié en compilant le cas isolé : `Omit` contraint sa clé à `keyof any`, pas à `keyof T`, donc une clé qui n'existe pas n'émet aucune erreur et `ecrans` survit à l'omission. Le type compile parce que `EcranColore[]` est assignable à `Ecran[]`, pas parce que l'`Omit` a fait son travail.
  - La ligne 16 juste en dessous, `Omit<Pile, "pistes">`, est correcte : c'est bien une faute de frappe, pas une intention.

## 6. Aucune porte ne refuse les règles mécaniques (Moyenne priorité)

**Idéal** : une règle qui se réduit à un motif est refusée au commit, pas relevée d'audit
en audit.
**Actuel** : ni `.husky/`, ni `.github/workflows/`, et `pnpm lint` se limite à Biome.

- [ ] racine du dépôt : la famille du point médian revient à chaque audit sans rien pour l'arrêter (sûr)
  - 29 occurrences de `·` comme séparateur, détaillées en 9.2. `agent/writing.md` l'interdit, rien ne le refuse.
  - Un script de quelques lignes lancé par `pnpm lint` suffit ici : la stack Next n'a pas d'équivalent de `bin/check-mechanical`, et ce dépôt n'a pas de hook de commit.

## 7. Icônes (Basse priorité)

**Idéal** : `next-guidelines.md` §2, les icônes de marque absentes de lucide 1.x vivent
dans `components/icons.tsx`. §4, `app/apple-icon.png` en 180×180 accompagne `app/icon.svg`.
**Actuel** : le mark GitHub est inline dans l'en-tête, et l'icône iOS manque.

- [ ] `components/entete.tsx:6-16` : `MarqueGithub` défini dans le fichier qui l'utilise (sûr)
  - Sa place est `components/icons.tsx`, qui n'existe pas encore.
- [ ] `app/` : pas d'`apple-icon.png` (sûr)
  - 180×180, pour l'écran d'accueil iOS. Next émet la balise tout seul.

## 8. `shadcn/tailwind.css` non importé (Basse priorité)

**Idéal** : `react-guidelines.md` §3, les composants du registry supposent
`@import "shadcn/tailwind.css"`, qui déclare les variantes `data-open`, `data-closed`,
`data-selected`, `data-horizontal` et les autres.
**Actuel** : `app/globals.css:1` n'importe que `tailwindcss`, et le paquet `shadcn` n'est
pas installé.

- [ ] `app/globals.css:1` : risque latent, pas encore un défaut (sûr)
  - Vérifié : le code n'utilise qu'une seule variante nue, `data-active:`, onze fois. `node_modules/@base-ui/react/tabs/tab/TabsTabDataAttributes.js` documente `data-active` comme « Present when the tab is active », sans valeur, donc le `[data-active]` natif de Tailwind le capte correctement. Les onglets fonctionnent.
  - Ce qui casserait : `data-orientation` porte une valeur, et `tabs.tsx` l'écrit déjà en forme explicite `group-data-[orientation=horizontal]`. Mais le jour où un composant du registry arrive avec `data-horizontal:` ou `data-selected:`, la règle tombe en silence. C'est le défaut décrit dans la guideline : un panneau d'onglets à zéro pixel de large, sur toutes les pages.
  - Soit `@import "shadcn/tailwind.css"` avec `shadcn` en dépendance de développement, soit le fichier vendu à côté de `globals.css`.

## 9. Cosmétique et jumeaux (Basse priorité)

### 9.1 Couleurs en dur, jumelles des tokens

**Idéal** : les couleurs vivent une fois, dans les tokens de `:root`.
**Actuel** : l'image OG les recopie.

- [ ] `app/opengraph-image.tsx:18,22,29,33` : `#FAF8F0`, `#0737FF`, `#6b6a63` en dur (sûr)
  - `ImageResponse` n'a pas de feuille de style, donc la valeur littérale est inévitable. Ce qui ne l'est pas, c'est qu'elle soit écrite ici : `#FAF8F0` est le `--background` de `app/globals.css:9` et `#0737FF` son `--primary` de la ligne 18. Changer le thème laisse l'image OG derrière, sans bruit.
  - Les sortir en constantes de `lib/site.ts`, lues des deux côtés.

### 9.2 Point médian comme séparateur

**Idéal** : `agent/writing.md`, section Typography, pas de point médian comme séparateur.
**Actuel** : 29 occurrences.

- [ ] `lib/playbook/symfony-react.ts` (13), `next.ts` (9), `tanstack-start.ts` (5) : champs `source` du type `"symfony-guidelines.md, Playbook 1 · reactony.md §2"` (sûr)
- [ ] `app/opengraph-image.tsx:34` : `"Symfony + React · Next.js · TanStack Start"` (sûr)
- [ ] `app/layout.tsx:11` : le gabarit de titre `` `%s · ${TITRE}` `` (sûr)
  - La guideline autorise le tiret demi-cadratin pour joindre une page et le site dans un titre, « Annonces – La Grange ». C'est exactement ce cas.

### 9.3 Cibles tactiles de la réglette

**Idéal** : `react-guidelines.md` §6, une cible tactile fait au moins 24 × 24 pixels CSS
(WCAG 2.2, critère 2.5.8, niveau AA).
**Actuel** : les segments de progression font 4 pixels de haut.

- [ ] `components/deck.tsx:150` : `h-1 flex-1` sur des `<button>` cliquables (probable)
  - Les segments sont `aria-hidden` et `tabIndex={-1}`, donc hors de l'arbre d'accessibilité et hors tabulation : au clavier, seules les flèches pilotent le deck. Le critère tolère qu'une autre commande de la page rende le même service, et les deux boutons de 32 px le font.
  - L'équivalence n'est pourtant que partielle : les flèches avancent d'un écran, la réglette saute au septième. Au doigt, cette seconde fonction n'est pas atteignable.
  - Le moins coûteux : garder la barre fine à l'œil et élargir la zone cliquable par un `py-2` plus un fond transparent, sans changer l'aspect.

## Écarts assumés

- `components/code-block.tsx:68` : `dangerouslySetInnerHTML` sur le HTML de Shiki. `react-guidelines.md` §4 réserve l'échappatoire au markup produit par le projet : c'est le cas, le HTML est produit au build à partir de constantes du dépôt, aucune entrée utilisateur n'y arrive. La raison est déjà écrite dans le `biome-ignore` au-dessus de la ligne.
- `components/brand.tsx` et `components/made-with-love.tsx` portent `"use client"` sans tenir d'état ni d'interaction, là où `next-guidelines.md` §4 réserve la directive à ce qui en tient. Les deux viennent du registry `@alexandremace` et `biome.json` les exclut : la correction appartient au kit, pas à ce dépôt. À remonter par `/propagate-kit` plutôt qu'à corriger ici.
- Pas de suite de tests. `next-guidelines.md` ne les rend obligatoires qu'avec un backend (§6), que ce site n'a pas : tout est cuit au build, personne n'écrit. `pnpm build` et `/live-test` sont la porte.
