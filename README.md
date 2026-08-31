# Dev Playbook

Comment se fait une feature full-stack, aujourd'hui, dans chacune des trois piles de
[dev-standards](https://github.com/alexandre-mace/dev-standards).

Trois onglets de pile, Symfony + îlots React, Next.js statique, TanStack Start. Trois
pistes par pile : la séquence complète d'une feature, les patterns du moment, et les
pièges. Chaque écran porte un bloc de code, ce que l'étape décide, le détail qui coûte
une heure, et la section de dev-standards qui fait autorité.

Le deck se parcourt aux flèches ← et →, `Home` et `End` pour les extrémités. L'URL retient
où on en est : `#next/patterns/3` rouvre la page au bon endroit.

## Développement

```bash
pnpm install
pnpm dev
```

`pnpm build` est le contrôle : il type-check et échoue sur une erreur de compilation.

## Le contenu

Tout vit dans `lib/playbook/`, une pile par fichier. Ajouter un écran veut dire ajouter
un objet à la piste concernée : le code, l'intention, le piège, et le champ `source` qui
dit d'où vient la règle. La coloration se fait au build, la page n'embarque pas Shiki.
