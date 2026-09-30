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
      fichier: "src/routes/tasks.tsx",
      langage: "tsx",
      source: "tanstack-start-guidelines.md, Patterns",
      surligne: [5, 6, 7],
      piege:
        "Un filtre, un onglet ou une pagination qu'un utilisateur voudrait partager en lien n'a rien à faire dans un useState. Il étend le schéma Zod de la route.",
      code: `import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/tasks")({
  validateSearch: z.object({
    status: z.enum(["all", "todo", "done"]).default("all"),
    page: z.number().default(1),
  }),
  component: Tasks,
});

function Tasks() {
  const { status } = Route.useSearch();

  return (
    <Link from={Route.fullPath} search={(prev) => ({ ...prev, status: "done", page: 1 })}>
      Faites
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
      fichier: "src/routes/tasks.tsx",
      langage: "tsx",
      source: "tanstack-start-guidelines.md, Patterns · §2",
      surligne: [6, 8],
      code: `import { convexQuery } from "@convex-dev/react-query";

import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/tasks")({
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(convexQuery(api.tasks.listMine, deps)),
  component: Tasks,
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
  tasks: defineTable({
    title: v.string(),
    done: v.boolean(),
    ownerId: v.string(), // identity.tokenIdentifier du propriétaire
    internalNote: v.optional(v.string()),
  }).index("by_owner", ["ownerId"]),
});`,
    },
    {
      id: "genere",
      rang: "3 bis",
      titre: "Ce que Convex a écrit pour vous",
      intention:
        "Le schéma génère le modèle de données et les constructeurs de fonctions. Le routeur génère son arbre. Les deux se commitent, aucun des deux ne s'édite.",
      fichier: "convex/_generated/",
      langage: "ts",
      source: "tanstack-start-guidelines.md §3 · §1",
      surligne: [10, 11, 12, 18],
      piege:
        "Un api.tasks.listMine qui cesse de compiler après un renommage, ce n'est pas le générateur qui casse : c'est lui qui montre les appels devenus faux. C'est tout l'intérêt de commiter ce qu'il écrit.",
      code: `// Régénéré à chaque \`convex dev\`, commité, jamais édité :
//
//   convex/_generated/
//     api.d.ts        api et components, une entrée par fonction publiée
//     dataModel.d.ts  Doc, Id, TableNames, DataModel, tirés du schéma
//     server.d.ts     query, mutation, action, et leurs variantes internal
//
//   routeTree.gen.ts  l'arbre de routes, écrit par le plugin du routeur

import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

// Côté serveur : les constructeurs connaissent déjà le modèle de données.
export const list = query({ handler: (ctx) => ctx.db.query("tasks").collect() });

// Côté client : arguments et valeur de retour sont typés de bout en bout.
useSuspenseQuery(convexQuery(api.tasks.list, {}));`,
    },
    {
      id: "query-mutation",
      rang: "4",
      titre: "La query lit, la mutation écrit",
      intention:
        "Les arguments sont validés par args avant même le handler. Le handler vérifie ensuite la session, puis l'autorisation sur le document visé : une identité n'est pas une autorisation.",
      fichier: "convex/tasks.ts",
      langage: "ts",
      source: "tanstack-start-guidelines.md §3 · §3 bis",
      surligne: [8, 14, 27, 31],
      piege:
        "Convex renvoie ce que la fonction retourne : rendre le document entier le publie entier. On sélectionne les champs. Ce qui n'est pas destiné au client se déclare internalQuery ou internalMutation.",
      code: `import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listMine = query({
  args: { status: v.union(v.literal("all"), v.literal("todo"), v.literal("done")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Non authentifié");

    // Le propriétaire vient de la session, jamais des arguments.
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.tokenIdentifier))
      .collect();

    // On sélectionne : internalNote ne traverse pas.
    return tasks
      .filter((t) => args.status === "all" || t.done === (args.status === "done"))
      .map(({ _id, title, done }) => ({ _id, title, done }));
  },
});

export const markDone = mutation({
  args: { id: v.id("tasks"), done: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Non authentifié");

    const task = await ctx.db.get(args.id);
    if (task?.ownerId !== identity.tokenIdentifier) throw new Error("Interdit");

    await ctx.db.patch(args.id, { done: args.done });
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
      fichier: "src/routes/tasks.tsx",
      langage: "tsx",
      source: "tanstack-start-guidelines.md §3",
      surligne: [8, 11],
      piege:
        "Les abonnements survivent 5 minutes après le démontage (gcTime). Baisser cette valeur est une décision, pas un accident.",
      code: `import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

import { api } from "../../convex/_generated/api";

function Tasks() {
  const { status } = Route.useSearch();
  const { data } = useSuspenseQuery(convexQuery(api.tasks.listMine, { status }));

  const toggle = useMutation({
    mutationFn: useConvexMutation(api.tasks.markDone),
  });

  return data.map((task) => (
    <button
      key={task._id}
      type="button"
      onClick={() => toggle.mutate({ id: task._id, done: !task.done })}
    >
      {task.title}
    </button>
  ));
}`,
    },
    {
      id: "formulaire",
      rang: "7",
      titre: "Le formulaire, avec le même Zod que la mutation",
      intention:
        "TanStack Form côté client, et la mutation Convex valide avec le même schéma Zod grâce à convex-helpers. On valide au bord, une fois, et le type inféré descend de là.",
      fichier: "convex/schemas.ts, convex/tasks.ts, src/routes/tasks.new.tsx",
      langage: "tsx",
      source: "tanstack-start-guidelines.md, Playbook · §2",
      surligne: [2, 7, 20],
      code: `// convex/schemas.ts : du Zod pur, importé des deux côtés.
export const taskSchema = z.object({ title: z.string().min(1).max(120) });

// convex/tasks.ts : la mutation valide avec ce même schéma.
const zMutation = zCustomMutation(mutation, NoOp); // convex-helpers/server/zod4
export const create = zMutation({
  args: taskSchema.shape,
  handler: async (ctx, { title }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Non authentifié");
    await ctx.db.insert("tasks", { title, done: false, ownerId: identity.tokenIdentifier });
  },
});

// src/routes/tasks.new.tsx : le formulaire valide avec le même schéma.
function NewTask() {
  const create = useMutation({ mutationFn: useConvexMutation(api.tasks.create) });
  const form = useForm({
    defaultValues: { title: "" },
    validators: { onChange: taskSchema },
    onSubmit: ({ value }) => create.mutateAsync(value),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      <form.Field name="title">
        {(field) => (
          <>
            <label htmlFor={field.name}>Titre</label>
            <input id={field.name} value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)} />
          </>
        )}
      </form.Field>
      <button type="submit">Créer</button>
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
      fichier: "src/server/invoice.ts",
      langage: "ts",
      source: "tanstack-start-guidelines.md, Patterns · §3 bis",
      surligne: [9, 14, 19],
      piege:
        "Elle compile en route publique appelable avec n'importe quel payload. Garder la route qui rend l'interface ne garde rien : la vérification est dans la fonction.",
      code: `import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// context ne contient que ce qu'un middleware y met : la session en fait partie.
const authenticated = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { userId } = await readSession();
    if (!userId) throw new Error("Non authentifié");
    return next({ context: { userId } });
  },
);

export const generateInvoice = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data, context }) => {
    // La session est acquise, reste l'autorisation sur l'objet visé.
    const order = await readOrder(data.orderId);
    if (order.clientId !== context.userId) throw new Error("Interdit");

    return bill(order);
  });

// Une route d'API ne s'écrit que pour un vrai consommateur externe.`,
    },
    {
      id: "tests",
      rang: "9",
      titre: "Le spec du parcours",
      intention:
        "C'est une application, pas une brochure : un nouveau parcours utilisateur part avec son spec Playwright.",
      fichier: "e2e/tasks.spec.ts",
      langage: "ts",
      source: "tanstack-start-guidelines.md §5",
      surligne: [11, 12],
      piege:
        "Aucun test unitaire ne voit une régression de mémoisation : Vitest tourne sans le plugin compilateur. Seul un test sur un vrai build la voit.",
      code: `import { expect, test } from "@playwright/test";

test("créer une tâche, la cocher, la retrouver filtrée", async ({ page }) => {
  await page.goto("/tasks");
  await page.getByLabel("Titre").fill("Relire le playbook");
  await page.getByRole("button", { name: "Créer" }).click();

  await expect(page.getByText("Relire le playbook")).toBeVisible();

  // L'état d'écran vit dans l'URL : le filtre se vérifie là.
  await page.getByRole("link", { name: "Faites" }).click();
  await expect(page).toHaveURL(/status=done/);
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
      code: `function TaskList({ tasks }: { tasks: Task[] }) {
  const toggle = useMutation({ mutationFn: useConvexMutation(api.tasks.markDone) });

  const [displayed, toggleOptimistic] = useOptimistic(
    tasks,
    (state, id: string) =>
      state.map((t) => (t._id === id ? { ...t, done: !t.done } : t)),
  );

  return displayed.map((task) => (
    <Toggle
      key={task._id}
      pressed={task.done}
      onPressedChange={() => {
        toggleOptimistic(task._id);
        toggle.mutate({ id: task._id, done: !task.done });
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
      fichier: "src/routes/_authenticated.tsx",
      langage: "tsx",
      source: "tanstack-start-guidelines.md §2",
      surligne: [5, 6],
      code: `import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    if (!context.userId) {
      throw redirect({ to: "/login", search: { back: location.href } });
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
const useStore = create((set) => ({ tasks: [], setTasks: (t) => set({ tasks: t }) }));

// Oui : Query pour le serveur.
const { data } = useSuspenseQuery(convexQuery(api.tasks.listMine, { status: "all" }));

// Zustand pour ce qui est client et global : un thème, une sidebar, un assistant en cours.`,
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
const { _id, title, done } = await ctx.db.get(args.id);
return { _id, title, done };

// Et ce qui n'est pas destiné au client : internalQuery / internalMutation,
// les seules que le client ne peut pas appeler.`,
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
