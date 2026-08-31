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

## La page tient dans l'écran, mais on ne l'y force pas

Rien ici ne verrouille la hauteur : pas de `h-dvh`, pas d'`overflow-hidden`. La page
défile comme n'importe quelle page. C'est la carte du deck qui est dimensionnée pour que,
en pratique, il n'y ait rien à faire défiler :

```
md:h-[clamp(22rem,calc(100dvh_-_21rem),42rem)]
```

Les `21rem` sont la somme mesurée de ce qui entoure la carte : l'en-tête, la thèse de la
pile, les deux rangées d'onglets, les commandes du deck et le footer. Le pari tient de
700px de haut (la carte fait alors 364px) jusqu'à 1000 et au-delà, où le plafond de
`42rem` reprend la main.

**Les deux bornes du clamp sont le filet, pas la contrainte.** Sous 700px de haut, le
plancher de `22rem` gagne et la page se met à défiler : c'est voulu, mieux vaut défiler
qu'écraser le bloc de code. Si une thèse passe à trois lignes ou qu'une rangée d'onglets
s'allonge, il faut remesurer les `21rem`, pas ajouter une contrainte de hauteur.

Sous `md`, le `md:` tombe : la carte reprend `h-[min(70vh,42rem)]`. Sans ce repli, le
bloc de code tombait à quatre lignes sur mobile.

## Biome ne voit pas le kit

`components/ui/`, `brand.tsx`, `page-hero.tsx`, `made-with-love.tsx` et `back-to-top.tsx` viennent du registry
et sont exclus dans `biome.json` : les reformater créerait une dérive avec le kit, qui
est la source.
