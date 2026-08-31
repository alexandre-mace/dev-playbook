import type { Pile } from "./types";

const featureFullstack = {
  id: "feature",
  label: "Feature full-stack",
  resume:
    "Un écran dont l'état vit dans l'URL, son loader, le raccord Convex de bout en bout, et le spec qui le prouve.",
  ecrans: [
    {
      id: "route",
      rang: "1",
      titre: "L'écran et ses search params typés",
      intention:
        "Le schéma vit sur la route, donc les lectures et les liens sont vérifiés à la compilation. Renommer un champ casse le build de chaque lien qui l'utilisait.",
      fichier: "src/routes/produits.tsx",
      langage: "tsx",
      source: "tanstack-start-guidelines.md, Patterns",
      surligne: [6, 7, 8, 9],
      piege:
        "Un filtre, un onglet ou une pagination qu'un utilisateur voudrait partager en lien n'a rien à faire dans un useState. Il étend le schéma Zod de la route.",
      code: `import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/produits")({
  validateSearch: z.object({
    page: z.number().default(1),
    tri: z.enum(["recent", "prix"]).default("recent"),
  }),
  component: Produits,
});

function Produits() {
  const { page, tri } = Route.useSearch();

  return (
    <Link from={Route.fullPath} search={(prec) => ({ ...prec, page: prec.page + 1 })}>
      Page suivante
    </Link>
  );
}`,
    },
    {
      id: "loader",
      rang: "2",
      titre: "Le loader alimente le cache Query",
      intention:
        "La route rend depuis le cache puis revalide, au lieu de bloquer sur une cascade de requêtes lancées dans les composants.",
      fichier: "src/routes/produits.tsx",
      langage: "tsx",
      source: "tanstack-start-guidelines.md, Patterns · §2",
      surligne: [6, 7],
      code: `import { convexQuery } from "@convex-dev/react-query";

import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/produits")({
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(convexQuery(api.produits.lister, deps)),
  loaderDeps: ({ search }) => ({ page: search.page, tri: search.tri }),
  component: Produits,
});`,
    },
    {
      id: "schema",
      rang: "3",
      titre: "Le schéma Convex",
      intention:
        "Les tables et leurs index. Un .collect() sans index scanne la table : chaque filtre de requête a le sien.",
      fichier: "convex/schema.ts",
      langage: "ts",
      source: "tanstack-start-guidelines.md §3",
      surligne: [10],
      code: `import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  taches: defineTable({
    titre: v.string(),
    faite: v.boolean(),
    proprietaireId: v.id("users"),
    noteInterne: v.optional(v.string()),
  }).index("by_proprietaire", ["proprietaireId"]),
});`,
    },
    {
      id: "query-mutation",
      rang: "4",
      titre: "La query lit, la mutation écrit",
      intention:
        "Session, puis autorisation sur le document, puis validation des arguments. Une identité n'est pas une autorisation.",
      fichier: "convex/taches.ts",
      langage: "ts",
      source: "tanstack-start-guidelines.md §3 · §3 bis",
      surligne: [8, 9, 14, 22, 23],
      piege:
        "Convex renvoie ce que la fonction retourne : rendre le document entier le publie entier. On sélectionne les champs. Ce qui n'est pas destiné au client se déclare internalQuery ou internalMutation.",
      code: `import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listerMiennes = query({
  args: {},
  handler: async (ctx) => {
    const identite = await ctx.auth.getUserIdentity();
    if (!identite) throw new Error("Non authentifié");

    const taches = await ctx.db
      .query("taches")
      .withIndex("by_proprietaire", (q) => q.eq("proprietaireId", identite.subject))
      .collect();

    // On sélectionne : noteInterne ne traverse pas.
    return taches.map(({ _id, titre, faite }) => ({ _id, titre, faite }));
  },
});

export const marquerFaite = mutation({
  args: { id: v.id("taches"), faite: v.boolean() },
  handler: async (ctx, args) => {
    const identite = await ctx.auth.getUserIdentity();
    if (!identite) throw new Error("Non authentifié");

    const tache = await ctx.db.get(args.id);
    if (tache?.proprietaireId !== identite.subject) throw new Error("Interdit");

    await ctx.db.patch(args.id, { faite: args.faite });
  },
});`,
    },
    {
      id: "pont",
      rang: "5",
      titre: "Le pont Convex vers Query, câblé une fois",
      intention:
        "Une seule fois dans le projet, et toute lecture passe ensuite par le cache Query.",
      fichier: "src/router.tsx",
      langage: "ts",
      source: "tanstack-start-guidelines.md §3",
      surligne: [11],
      code: `import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
const convexQueryClient = new ConvexQueryClient(convex);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});

convexQueryClient.connect(queryClient);

// L'application est montée dans ConvexProvider et QueryClientProvider.`,
    },
    {
      id: "lecture-ecriture",
      rang: "6",
      titre: "Lire et écrire depuis l'écran",
      intention:
        "useSuspenseQuery pour que le fetch démarre pendant le SSR : le client navigateur reprend ensuite l'abonnement vivant, sans flash de chargement.",
      fichier: "src/routes/taches.tsx",
      langage: "tsx",
      source: "tanstack-start-guidelines.md §3",
      surligne: [7, 10, 11],
      piege:
        "Les abonnements survivent 5 minutes après le démontage (gcTime). Baisser cette valeur est une décision, pas un accident.",
      code: `import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import { api } from "../../convex/_generated/api";

function Taches() {
  const { data } = useSuspenseQuery(convexQuery(api.taches.listerMiennes, {}));

  const basculer = useMutation({
    mutationFn: useConvexMutation(api.taches.marquerFaite),
  });

  return data.map((tache) => (
    <button
      key={tache._id}
      type="button"
      onClick={() => basculer.mutate({ id: tache._id, faite: !tache.faite })}
    >
      {tache.titre}
    </button>
  ));
}`,
    },
    {
      id: "formulaire",
      rang: "7",
      titre: "Le formulaire, avec le même Zod que le serveur",
      intention:
        "TanStack Form côté client, le même schéma au bord de la mutation. On valide au bord, une fois, et le type inféré descend de là.",
      fichier: "src/routes/taches.nouvelle.tsx",
      langage: "tsx",
      source: "tanstack-start-guidelines.md, Playbook · §2",
      surligne: [5, 11],
      code: `import { useForm } from "@tanstack/react-form";
import { z } from "zod";

// Le même schéma sert au formulaire et à la fonction serveur.
export const tacheSchema = z.object({ titre: z.string().min(1).max(120) });

function NouvelleTache() {
  const form = useForm({
    defaultValues: { titre: "" },
    validators: { onChange: tacheSchema },
    onSubmit: ({ value }) => creer({ data: value }),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="titre">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
    </form>
  );
}`,
    },
    {
      id: "server-fn",
      rang: "8",
      titre: "La fonction serveur",
      intention:
        "Du RPC typé, validé au bord, appelable depuis un loader ou un composant. Pour une opération ponctuelle : un appel tiers, un secret.",
      fichier: "src/serveur/facture.ts",
      langage: "ts",
      source: "tanstack-start-guidelines.md, Patterns · §3 bis",
      surligne: [5, 8],
      piege:
        "Elle compile en route publique appelable avec n'importe quel payload. Garder la route qui rend l'interface ne garde rien : la vérification est dans la fonction.",
      code: `import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const genererFacture = createServerFn({ method: "POST" })
  .validator(z.object({ commandeId: z.string() }))
  .handler(async ({ data, context }) => {
    // Session, puis autorisation sur l'objet, avant tout travail.
    if (!context.userId) throw new Error("Non authentifié");

    const commande = await lireCommande(data.commandeId);
    if (commande.clientId !== context.userId) throw new Error("Interdit");

    return facturer(commande);
  });

// Une route d'API ne s'écrit que pour un vrai consommateur externe.`,
    },
    {
      id: "tests",
      rang: "9",
      titre: "Le spec du parcours",
      intention:
        "C'est une application, pas une brochure : un nouveau parcours utilisateur part avec son spec Playwright.",
      fichier: "e2e/taches.spec.ts",
      langage: "ts",
      source: "tanstack-start-guidelines.md §5",
      surligne: [10, 11],
      piege:
        "Aucun test unitaire ne voit une régression de mémoisation : Vitest tourne sans le plugin compilateur. Seul un test sur un vrai build la voit.",
      code: `import { expect, test } from "@playwright/test";

test("creer une tache, la cocher, la retrouver filtree", async ({ page }) => {
  await page.goto("/taches");
  await page.getByLabel("Titre").fill("Relire le playbook");
  await page.getByRole("button", { name: "Creer" }).click();

  await expect(page.getByText("Relire le playbook")).toBeVisible();

  // L'état d'écran vit dans l'URL : le filtre se vérifie là.
  await page.getByRole("button", { name: "Faites" }).click();
  await expect(page).toHaveURL(/statut=faites/);
});`,
    },
    {
      id: "dod",
      rang: "10",
      titre: "Definition of Done",
      intention: "L'écran est fini quand ces lignes sont vertes.",
      langage: "md",
      source: "tanstack-start-guidelines.md §5",
      code: `- [ ] /quality passe : \`pnpm build\`, \`pnpm test\`, \`tsc --noEmit\`, le linter
- [ ] /live-test joue : le chemin nominal en navigateur, console et réseau propres
- [ ] Un nouveau parcours utilisateur part avec son spec Playwright
- [ ] Ce qu'un utilisateur partagerait en lien vit dans \`validateSearch\`, pas dans un \`useState\`
- [ ] Chaque nouvelle fonction serveur valide son entrée avec Zod, au bord
- [ ] Rien de neuf sous \`components/ui/\` quand le projet consomme le kit`,
    },
  ],
};

const patterns = {
  id: "patterns",
  label: "Patterns du moment",
  resume: "Les briques qui ne dépendent pas d'une feature en cours.",
  ecrans: [
    {
      id: "compilateur",
      rang: "Compilateur",
      titre: "Le compilateur, chemin natif sur Vite",
      intention:
        "Le chemin Rust est environ dix fois plus rapide que le plugin Babel. Il demande oxc-transform-react en peer optionnelle.",
      fichier: "vite.config.ts",
      langage: "ts",
      source: "tanstack-start-guidelines.md, Patterns",
      surligne: [5],
      piege:
        "Le plugin marque encore ce chemin expérimental : le chemin Babel (reactCompilerPreset via @rolldown/plugin-babel) reste le repli stable.",
      code: `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react({ compiler: true })],
});`,
    },
    {
      id: "optimistic",
      rang: "React 19",
      titre: "useOptimistic",
      intention:
        "Montrer une mutation atterrir avant la réponse du serveur. Pour une action réversible et non critique, pas pour une création qui peut échouer visiblement.",
      langage: "tsx",
      source: "react-guidelines.md §1",
      surligne: [4, 5, 6, 7],
      code: `function ListeTaches({ taches }: { taches: Tache[] }) {
  const basculer = useMutation({ mutationFn: useConvexMutation(api.taches.marquerFaite) });

  const [affichees, basculerOptimiste] = useOptimistic(
    taches,
    (etat, id: string) =>
      etat.map((t) => (t._id === id ? { ...t, faite: !t.faite } : t)),
  );

  return affichees.map((tache) => (
    <Toggle
      key={tache._id}
      pressed={tache.faite}
      onPressedChange={() => {
        basculerOptimiste(tache._id);
        basculer.mutate({ id: tache._id, faite: !tache.faite });
      }}
    />
  ));
}`,
    },
    {
      id: "garde-layout",
      rang: "Auth",
      titre: "La garde vit dans une route de layout",
      intention:
        "S'il y a des comptes, on les garde une fois, dans le layout, jamais feuille par feuille.",
      fichier: "src/routes/_authentifie.tsx",
      langage: "tsx",
      source: "tanstack-start-guidelines.md §2",
      surligne: [5, 6],
      code: `import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authentifie")({
  beforeLoad: ({ context, location }) => {
    if (!context.userId) {
      throw redirect({ to: "/connexion", search: { retour: location.href } });
    }
  },
});

// Clerk par défaut, Better Auth quand l'auto-hébergement est exigé. Jamais les deux.`,
    },
    {
      id: "etat-serveur",
      rang: "État",
      titre: "L'état serveur n'est pas de l'état client",
      intention:
        "Query possède ce qui vient du serveur. Zustand est pour l'état client vraiment global, jamais comme cache.",
      langage: "ts",
      source: "tanstack-start-guidelines.md §2",
      surligne: [2, 6],
      code: `// Non : Zustand ne sait pas invalider, ni revalider, ni dédupliquer.
const useStore = create((set) => ({ taches: [], setTaches: (t) => set({ taches: t }) }));

// Oui : Query pour le serveur.
const { data } = useSuspenseQuery(convexQuery(api.taches.listerMiennes, {}));

// Zustand pour ce qui est client et global : un thème, une sidebar, un assistant en cours.`,
    },
    {
      id: "migrations",
      rang: "Convex",
      titre: "Les migrations de données",
      intention:
        "Par @convex-dev/migrations, jamais par une boucle take(n) écrite à la main.",
      fichier: "convex/migrations.ts",
      langage: "ts",
      source: "tanstack-start-guidelines.md §2 · §3",
      code: `import { Migrations } from "@convex-dev/migrations";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const migrations = new Migrations<DataModel>(components.migrations);

export const remplirNoteInterne = migrations.define({
  table: "taches",
  migrateOne: (ctx, tache) =>
    tache.noteInterne === undefined ? { noteInterne: "" } : undefined,
});`,
    },
    {
      id: "table",
      rang: "Compilateur",
      titre: "Ne jamais passer une instance de librairie en prop",
      intention:
        "useReactTable rend un objet stable dont il mute les entrailles. L'enfant qui le reçoit ne rappelle pas le hook : le compilateur le mémoise sur une référence qui ne change jamais.",
      langage: "tsx",
      source: "react-guidelines.md §2",
      surligne: [2, 8, 9],
      piege:
        "Le symptôme : un compteur lié à filtered.length qui bouge pendant que les lignes restent en place. Le correctif n'est pas \"use no memo\", c'est de passer la donnée dérivée.",
      code: `// Non : la table est stable, l'enfant cesse de re-rendre au changement de filtre.
<TableBody table={table} />

// Oui : getHeaderGroups() et getRowModel().rows produisent une référence fraîche
// dès que la donnée change. C'est aussi ce que recommandent React et TanStack.
<TableBody
  headerGroups={table.getHeaderGroups()}
  rows={table.getRowModel().rows}
/>`,
    },
  ],
};

const pieges = {
  id: "pieges",
  label: "Pièges",
  resume: "Ce que le framework rend facile à perdre de vue.",
  ecrans: [
    {
      id: "frontiere",
      rang: "Sécurité",
      titre: "Le client et le serveur ont l'air d'être le même fichier",
      intention:
        "C'est exactement ce qui rend la frontière facile à perdre de vue. Seule une variable préfixée VITE_ appartient au bundle, et elle est lisible par tous.",
      langage: "ts",
      source: "tanstack-start-guidelines.md §3 bis",
      surligne: [2, 5],
      code: `// Dans le bundle, public.
const url = import.meta.env.VITE_CONVEX_URL;

// Lu dans une fonction serveur, ou en variable d'environnement Convex.
const secret = process.env.STRIPE_SECRET_KEY;`,
    },
    {
      id: "urlsearchparams",
      rang: "Routeur",
      titre: "Parser URLSearchParams à la main",
      intention:
        "Le routeur est le framework. Le faire soi-même veut dire qu'on a quitté les rails, et on perd la vérification à la compilation avec.",
      langage: "ts",
      source: "tanstack-start-guidelines.md §2",
      surligne: [2, 3],
      code: `// Non.
const params = new URLSearchParams(window.location.search);
const page = Number(params.get("page") ?? 1);

// Oui : le schéma de la route rend la valeur déjà typée et déjà par défaut.
const { page } = Route.useSearch();`,
    },
    {
      id: "document-entier",
      rang: "Sécurité",
      titre: "Retourner le document entier",
      intention:
        "Convex envoie ce que la fonction retourne. Un email, un hash, une note interne voyagent sinon.",
      langage: "ts",
      source: "tanstack-start-guidelines.md §3 bis",
      surligne: [2, 5],
      code: `// Non.
return await ctx.db.get(args.id);

// Oui.
const { _id, titre, faite } = await ctx.db.get(args.id);
return { _id, titre, faite };

// Et ce qui n'est pas destiné au client : internalQuery / internalMutation,
// les seules que le client ne peut pas appeler.`,
    },
    {
      id: "start-inutile",
      rang: "Pile",
      titre: "Garder Start quand rien ne s'en sert",
      intention:
        "Sans SSR, sans fonction serveur et sans streaming, la doc TanStack recommande de lâcher Start pour TanStack Router seul, en SPA.",
      langage: "md",
      source: "tanstack-start-guidelines.md, ce que ce fichier couvre",
      code: `La question qui tranche entre next/ et tanstack-start/, une seule, testable :

  le rendu serveur ferait-il economiser du JavaScript au navigateur ?

  oui  -> les pages sont du contenu, les Server Components servent a quelque chose : next/
  non  -> tout est interactif de toute facon : tanstack-start/ et des URL typees

Elle se tranche au demarrage du projet. Un projet mixte, landing plus application,
reste un seul projet a deux audiences : la landing servie en statique, l'application ici.`,
    },
  ],
};

export const TANSTACK_START: Pile = {
  id: "tanstack-start",
  label: "TanStack Start, applications",
  labelCourt: "TanStack Start",
  these:
    "L'écran est généré par ce que fait l'utilisateur. Routage typé, search params typés, Convex derrière.",
  guideline: "tanstack-start/tanstack-start-guidelines.md",
  pistes: [featureFullstack, patterns, pieges],
};
