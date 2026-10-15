import type { Stack } from "./types";

const featureFullstack = {
  id: "feature",
  label: "Feature full-stack",
  summary:
    "Un écran dont l'état vit dans l'URL, son loader, le raccord Convex de bout en bout, et le spec qui le prouve.",
  screens: [
    {
      id: "route",
      rank: "1",
      title: "L'écran et ses search params typés",
      intent:
        "Le schéma vit sur la route, donc les lectures et les liens sont vérifiés à la compilation. Renommer un champ casse le build de chaque lien qui l'utilisait.",
      file: "src/routes/tasks.tsx",
      language: "tsx",
      source: "tanstack-start-guidelines.md, Patterns",
      highlightedLines: [5, 6, 7],
      pitfall:
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
      rank: "2",
      title: "Le loader alimente le cache Query",
      intent:
        "La route rend depuis le cache puis revalide, au lieu de bloquer sur une cascade de requêtes lancées dans les composants.",
      file: "src/routes/tasks.tsx",
      language: "tsx",
      source: "tanstack-start-guidelines.md, Patterns, §2",
      highlightedLines: [6, 8],
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
      rank: "3",
      title: "Le schéma Convex",
      intent:
        "Les tables et leurs index. Un .collect() sans index scanne la table : chaque filtre de requête a le sien.",
      file: "convex/schema.ts",
      language: "ts",
      source: "tanstack-start-guidelines.md §3",
      highlightedLines: [10],
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
      rank: "3 bis",
      title: "Ce que Convex a écrit pour vous",
      intent:
        "Le schéma génère le modèle de données et les constructeurs de fonctions. Le routeur génère son arbre. Les deux se commitent, aucun des deux ne s'édite.",
      file: "convex/_generated/",
      language: "ts",
      source: "tanstack-start-guidelines.md §3, §1",
      highlightedLines: [10, 11, 12, 18],
      pitfall:
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
      rank: "4",
      title: "La query lit, la mutation écrit",
      intent:
        "Les arguments sont validés par args avant même le handler. Le handler vérifie ensuite la session, puis l'autorisation sur le document visé : une identité n'est pas une autorisation.",
      file: "convex/tasks.ts",
      language: "ts",
      source: "tanstack-start-guidelines.md §3, §3 bis",
      highlightedLines: [8, 14, 27, 31],
      pitfall:
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
      rank: "5",
      title: "Le pont Convex vers Query, câblé une fois",
      intent:
        "Une seule fois dans le projet, et toute lecture passe ensuite par le cache Query.",
      file: "src/router.tsx",
      language: "ts",
      source: "tanstack-start-guidelines.md §3",
      highlightedLines: [11],
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
      rank: "6",
      title: "Lire et écrire depuis l'écran",
      intent:
        "useSuspenseQuery pour que le fetch démarre pendant le SSR : le client navigateur reprend ensuite l'abonnement vivant, sans flash de chargement.",
      file: "src/routes/tasks.tsx",
      language: "tsx",
      source: "tanstack-start-guidelines.md §3",
      highlightedLines: [8, 11],
      pitfall:
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
      rank: "7",
      title: "Le formulaire, avec le même Zod que la mutation",
      intent:
        "TanStack Form côté client, et la mutation Convex valide avec le même schéma Zod grâce à convex-helpers. On valide au bord, une fois, et le type inféré descend de là.",
      file: "convex/schemas.ts, convex/tasks.ts, src/routes/tasks.new.tsx",
      language: "tsx",
      source: "tanstack-start-guidelines.md, Playbook, §2",
      highlightedLines: [2, 7, 20],
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
      rank: "8",
      title: "La fonction serveur",
      intent:
        "Du RPC typé, validé au bord, appelable depuis un loader ou un composant. Pour une opération ponctuelle : un appel tiers, un secret.",
      file: "src/server/invoice.ts",
      language: "ts",
      source: "tanstack-start-guidelines.md, Patterns, §3 bis",
      highlightedLines: [9, 14, 19],
      pitfall:
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
      rank: "9",
      title: "Le spec du parcours",
      intent:
        "C'est une application, pas une brochure : un nouveau parcours utilisateur part avec son spec Playwright.",
      file: "e2e/tasks.spec.ts",
      language: "ts",
      source: "tanstack-start-guidelines.md §5",
      highlightedLines: [11, 12],
      pitfall:
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
      rank: "10",
      title: "Definition of Done",
      intent: "L'écran est fini quand ces lignes sont vertes.",
      language: "md",
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
  summary: "Les briques qui ne dépendent pas d'une feature en cours.",
  screens: [
    {
      id: "compilateur",
      rank: "Compilateur",
      title: "Le compilateur, chemin natif sur Vite",
      intent:
        "Le chemin Rust est environ dix fois plus rapide que le plugin Babel. Il demande oxc-transform-react en peer optionnelle.",
      file: "vite.config.ts",
      language: "ts",
      source: "tanstack-start-guidelines.md, Patterns",
      highlightedLines: [5],
      pitfall:
        "Le plugin marque encore ce chemin expérimental : le chemin Babel (reactCompilerPreset via @rolldown/plugin-babel) reste le repli stable.",
      code: `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react({ compiler: true })],
});`,
    },
    {
      id: "optimistic",
      rank: "React 19",
      title: "useOptimistic",
      intent:
        "Montrer une mutation atterrir avant la réponse du serveur. Pour une action réversible et non critique, pas pour une création qui peut échouer visiblement.",
      language: "tsx",
      source: "react-guidelines.md §1",
      highlightedLines: [4, 5, 6, 7],
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
      rank: "Auth",
      title: "La garde vit dans une route de layout",
      intent:
        "S'il y a des comptes, on les garde une fois, dans le layout, jamais feuille par feuille.",
      file: "src/routes/_authenticated.tsx",
      language: "tsx",
      source: "tanstack-start-guidelines.md §2",
      highlightedLines: [5, 6],
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
      rank: "État",
      title: "L'état serveur n'est pas de l'état client",
      intent:
        "Query possède ce qui vient du serveur. Zustand est pour l'état client vraiment global, jamais comme cache.",
      language: "ts",
      source: "tanstack-start-guidelines.md §2",
      highlightedLines: [2, 6],
      code: `// Non : Zustand ne sait pas invalider, ni revalider, ni dédupliquer.
const useStore = create((set) => ({ tasks: [], setTasks: (t) => set({ tasks: t }) }));

// Oui : Query pour le serveur.
const { data } = useSuspenseQuery(convexQuery(api.tasks.listMine, { status: "all" }));

// Zustand pour ce qui est client et global : un thème, une sidebar, un assistant en cours.`,
    },
    {
      id: "table",
      rank: "Compilateur",
      title: "Ne jamais passer une instance de librairie en prop",
      intent:
        "useReactTable rend un objet stable dont il mute les entrailles. L'enfant qui le reçoit ne rappelle pas le hook : le compilateur le mémoise sur une référence qui ne change jamais.",
      language: "tsx",
      source: "react-guidelines.md §2",
      highlightedLines: [2, 8, 9],
      pitfall:
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
  summary: "Ce que le framework rend facile à perdre de vue.",
  screens: [
    {
      id: "frontiere",
      rank: "Sécurité",
      title: "Le client et le serveur ont l'air d'être le même fichier",
      intent:
        "C'est exactement ce qui rend la frontière facile à perdre de vue. Seule une variable préfixée VITE_ appartient au bundle, et elle est lisible par tous.",
      language: "ts",
      source: "tanstack-start-guidelines.md §3 bis",
      highlightedLines: [2, 5],
      code: `// Dans le bundle, public.
const url = import.meta.env.VITE_CONVEX_URL;

// Lu dans une fonction serveur, ou en variable d'environnement Convex.
const secret = process.env.STRIPE_SECRET_KEY;`,
    },
    {
      id: "urlsearchparams",
      rank: "Routeur",
      title: "Parser URLSearchParams à la main",
      intent:
        "Le routeur est le framework. Le faire soi-même veut dire qu'on a quitté les rails, et on perd la vérification à la compilation avec.",
      language: "ts",
      source: "tanstack-start-guidelines.md §2",
      highlightedLines: [2, 3],
      code: `// Non.
const params = new URLSearchParams(window.location.search);
const page = Number(params.get("page") ?? 1);

// Oui : le schéma de la route rend la valeur déjà typée et déjà par défaut.
const { page } = Route.useSearch();`,
    },
    {
      id: "document-entier",
      rank: "Sécurité",
      title: "Retourner le document entier",
      intent:
        "Convex envoie ce que la fonction retourne. Un email, un hash, une note interne voyagent sinon.",
      language: "ts",
      source: "tanstack-start-guidelines.md §3 bis",
      highlightedLines: [2, 5],
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

export const TANSTACK_START: Stack = {
  id: "tanstack-start",
  label: "TanStack Start, applications",
  shortLabel: "TanStack Start",
  thesis:
    "L'écran est généré par ce que fait l'utilisateur. Routage typé, search params typés, Convex derrière.",
  guideline: "tanstack-start/tanstack-start-guidelines.md",
  tracks: [featureFullstack, patterns, pieges],
};
