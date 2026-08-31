<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# dev-playbook

Comment se fait une feature full-stack, aujourd'hui, dans chacune des trois piles de
[dev-standards](https://github.com/alexandre-mace/dev-standards). Trois onglets de pile,
trois pistes par pile, et un deck d'écrans de code qui se parcourt aux flèches.

## Commandes

- `pnpm dev` développement
- `pnpm build` build de production, et c'est le contrôle : il type-check et échoue sur une erreur de compilation
- `pnpm lint` Biome

## Stack

Next 16 en App Router, React 19 avec le compilateur, TypeScript strict, Tailwind 4,
shadcn sur base Base UI, kit `@alexandremace`. Coloration Shiki au build, carrousel Embla.

Conventions de la stack : `docs/next-guidelines.md` et `docs/react-guidelines.md`, liens
vers [dev-standards](https://github.com/alexandre-mace/dev-standards).

## Le contenu est la moitié du projet

Tout vit dans `lib/playbook/`, une pile par fichier, en TypeScript typé par
`types.ts`. Un écran porte son code, ce que l'étape décide, le piège, et la section de
dev-standards qui fait autorité. Rien n'est chargé au runtime : `app/page.tsx` colore
tout au build par Shiki et descend le HTML en props.

**Quand une guideline bouge, l'écran correspondant bouge.** C'est le seul contrat du
dépôt, et rien ne l'automatise : le champ `source` de chaque écran dit où regarder.

## Une chose à savoir avant de toucher aux onglets

**Base UI garde un panneau monté après sa première activation.** Chaque piste déjà vue
laisserait donc un deck vivant derrière elle, qui écouterait les flèches et écrirait
l'ancre de l'URL. D'où la garde explicite dans `components/playbook.tsx` : le deck ne se
rend que pour la pile et la piste actives.

## Biome ne voit pas le kit

`components/ui/`, `brand.tsx`, `page-hero.tsx`, `made-with-love.tsx` et `back-to-top.tsx` viennent du registry
et sont exclus dans `biome.json` : les reformater créerait une dérive avec le kit, qui
est la source.
