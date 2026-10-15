import type { Stack } from "./types";

const featureFullstack = {
  id: "feature",
  label: "Feature full-stack",
  summary:
    "Une page, ses données cuites au build, sa part interactive, et la sécurité du jour où le site gagne un backend.",
  screens: [
    {
      id: "route",
      rank: "1",
      title: "La route",
      intent:
        "Un dossier sous app/, un Server Component, sa metadata. Une route dynamique qui n'énumère pas ses valeurs n'est pas statique.",
      file: "app/tools/[slug]/page.tsx",
      language: "tsx",
      source: "next-guidelines.md, Playbook et §4",
      highlightedLines: [7, 8, 9],
      pitfall:
        "params est une promesse : elle s'attend. Oublier generateStaticParams ne casse rien au build, ça bascule juste la route en rendu à la demande, sans le dire.",
      code: `import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Simulator } from "@/components/simulator";
import { TOOLS } from "@/lib/tools";

// Sans cette fonction, la route dynamique n'est pas pré-rendue.
export function generateStaticParams() {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = TOOLS.find((candidate) => candidate.slug === slug);
  if (!tool) return {};

  return { title: tool.title, description: tool.summary };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = TOOLS.find((candidate) => candidate.slug === slug);
  if (!tool) notFound();

  // Server Component : la donnée est déjà là, elle descend en props.
  return <Simulator scale={tool.scale} />;
}`,
    },
    {
      id: "pipeline",
      rank: "2",
      title: "Le pipeline de données",
      intent:
        "Une source externe entre par un script, pas par un fetch au runtime. Les logs de contrôle sont le seul filet d'un site sans suite de tests.",
      file: "scripts/build-tools.mjs",
      language: "js",
      source: "next-guidelines.md §5",
      highlightedLines: [27, 28, 29, 30],
      pitfall:
        "Les logs de contrôle ne servent que si on les lit : un total croisé contre un agrégat de référence, pas un simple compte de lignes.",
      code: `// Lancé par \`pnpm data\`. Écrit du TypeScript type dans lib/, jamais du JSON lu au runtime.
import { writeFile } from "node:fs/promises";

const SOURCE = "https://ourworldindata.org/grapher/co2.csv";

const response = await fetch(SOURCE);
if (!response.ok) {
  throw new Error("Source indisponible : " + response.status);
}

const lines = (await response.text()).trim().split("\\n").slice(1);
const emissions = lines.map((line) => {
  const [country, year, value] = line.split(",");
  return { country, year: Number(year), value: Number(value) };
});

const header = [
  "// Généré par scripts/build-tools.mjs, ne pas éditer à la main.",
  "// Source : Our World in Data, CC BY.",
  "// Extraction : " + new Date().toISOString().slice(0, 10),
  "",
].join("\\n");

await writeFile(
  "lib/emissions.ts",
  header + "export const EMISSIONS = " + JSON.stringify(emissions, null, 2) + " as const;\\n",
);

// Les logs de contrôle : le total croisé contre un agrégat connu, puis les volumes.
const total = emissions.reduce((sum, e) => sum + e.value, 0);
console.log("Total 2023 :", total.toFixed(1), "Gt (attendu ~37,4)");
console.log(emissions.length, "lines,", new Set(emissions.map((e) => e.country)).size, "country");`,
    },
    {
      id: "fichier-genere",
      rank: "3",
      title: "Le fichier généré",
      intent:
        "Il porte son en-tête, sa source et sa date. Une édition à la main y survit jusqu'au prochain pnpm data, et pas au-delà.",
      file: "lib/emissions.ts",
      language: "ts",
      source: "next-guidelines.md §5",
      highlightedLines: [1, 2, 3],
      code: `// Généré par scripts/build-tools.mjs, ne pas éditer à la main.
// Source : Our World in Data, CC BY.
// Extraction : 2026-08-31

export const EMISSIONS = [
  { country: "France", year: 2023, value: 0.302 },
  { country: "Allemagne", year: 2023, value: 0.582 },
] as const;

export type Emission = (typeof EMISSIONS)[number];`,
    },
    {
      id: "client",
      rank: "4",
      title: "La part interactive",
      intent:
        "Le composant client descend le plus bas possible dans l'arbre. Sa page reste un Server Component et lui passe la donnée cuite en props.",
      file: "components/simulator.tsx",
      language: "tsx",
      source: "next-guidelines.md, Playbook, react-guidelines.md §2",
      highlightedLines: [1, 12],
      pitfall:
        "Pas de useMemo ni de useCallback : le compilateur les place. En écrire à la main n'est plus une optimisation, c'est du bruit qui devient no-op.",
      code: `"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Emission } from "@/lib/emissions";

export function Simulator({ scale }: { scale: readonly Emission[] }) {
  const [country, setCountry] = useState(scale[0].country);

  // Le compilateur React mémoise ce qui doit l'être : rien à annoter ici.
  const current = scale.find((line) => line.country === country) ?? scale[0];

  return (
    <div>
      <p>{current.value} Gt</p>
      <Button onClick={() => setCountry(scale[1].country)}>Comparer</Button>
    </div>
  );
}`,
    },
    {
      id: "activity",
      rank: "5",
      title: "Un onglet qui garde son état",
      intent:
        "Démonter un panneau caché lui fait perdre son état, son DOM et sa position de scroll. Activity le garde, et nettoie quand même les Effects.",
      file: "components/simulator-tabs.tsx",
      language: "tsx",
      source: "next-guidelines.md, Patterns, react-guidelines.md §1",
      highlightedLines: [10, 13],
      pitfall:
        "Un panneau caché par Activity est en display:none. Toute librairie qui mesure le DOM au montage (un carrousel, un graphe) doit se réinitialiser quand il redevient visible.",
      code: `"use client";

import { Activity, useState } from "react";

export function SimulatorTabs() {
  const [tab, setTab] = useState<"transport" | "housing">("transport");

  return (
    <>
      <Activity mode={tab === "transport" ? "visible" : "hidden"}>
        <TransportPanel />
      </Activity>
      <Activity mode={tab === "housing" ? "visible" : "hidden"}>
        <HousingPanel />
      </Activity>
    </>
  );
}`,
    },
    {
      id: "server-action",
      rank: "6",
      title: "La server action, si le site a un backend",
      intent:
        "Elle compile en route POST publique. Session, puis validation de l'entrée, puis autorisation sur l'objet que l'entrée désigne, dans cet ordre : on ne vérifie pas les droits sur un identifiant qu'on n'a pas encore validé.",
      file: "app/actions.ts",
      language: "ts",
      source: "next-guidelines.md §6 bis",
      highlightedLines: [9, 12, 17],
      pitfall:
        "Être appelée depuis un formulaire qu'il fallait être connecté pour atteindre ne prouve rien : la route reste appelable avec n'importe quel payload.",
      code: `"use server";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const schema = z.object({ id: z.string(), title: z.string().min(1).max(120) });

export async function renameProject(input: unknown) {
  // 1. La session.
  const { userId } = await auth();
  if (!userId) throw new Error("Non authentifié");

  // 2. La validation de l'entrée.
  const data = schema.parse(input);

  // 3. L'autorisation sur l'objet visé, et pas seulement le fait d'être connecté.
  const project = await readProject(data.id);
  if (project.owner !== userId) throw new Error("Interdit");

  await rename(data.id, data.title);
}`,
    },
    {
      id: "entetes",
      rank: "7",
      title: "Les en-têtes",
      intent:
        "CSP, X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security. Leur absence est silencieuse, donc c'est un constat de /gap-code à lui seul.",
      file: "next.config.ts",
      language: "ts",
      source: "next-guidelines.md §6 bis, §1",
      highlightedLines: [7, 24],
      pitfall:
        "images.remotePatterns avec hostname: \"**\" laisse n'importe qui router ses images par l'optimiseur du site. On liste les hôtes réels.",
      code: `import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  "img-src 'self' data: https://images.ctfassets.net",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.ctfassets.net" },
    ],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: CSP },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ],
};

export default nextConfig;`,
    },
    {
      id: "og",
      rank: "8",
      title: "L'image OG générée",
      intent:
        "Une image statique périme en silence. Celle-ci est rendue au build depuis les mêmes constantes que la page.",
      file: "app/opengraph-image.tsx",
      language: "tsx",
      source: "next-guidelines.md §4",
      highlightedLines: [4, 5],
      pitfall:
        "Elle ne rend que de la donnée cuite, jamais un paramètre de requête ni rien que le visiteur contrôle : dans le runtime Node, une entrée utilisateur qui atteignait le SVG était une exécution de code à distance avant Next 16.3.6.",
      code: `import { ImageResponse } from "next/og";

import { DESCRIPTION, TITLE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: 80,
          background: "#FAF8F0",
          color: "#171717",
        }}
      >
        <div style={{ fontSize: 76, fontWeight: 600 }}>{TITLE}</div>
        <div style={{ fontSize: 34, color: "#6b6b6b" }}>{DESCRIPTION}</div>
      </div>
    ),
    size,
  );
}`,
    },
    {
      id: "dod",
      rank: "9",
      title: "Definition of Done",
      intent:
        "La feature est finie quand ces lignes sont vertes, pas quand le build passe.",
      language: "md",
      source: "next-guidelines.md §7",
      code: `- [ ] /quality passe : \`pnpm build\` plus le linter
- [ ] /live-test joue : le chemin nominal en navigateur, console et réseau propres
- [ ] Une nouvelle page exporte sa \`metadata\`
- [ ] Une nouvelle route dynamique a son \`generateStaticParams\`
- [ ] Données cuites : \`pnpm data\` rejoué, et ses logs de contrôle lus
- [ ] Rien de neuf sous \`components/ui/\` : un manque du kit se corrige dans le kit
- [ ] Avec backend : Vitest et convex-test sur les fonctions, un spec Playwright sur le parcours`,
    },
  ],
};

const patterns = {
  id: "patterns",
  label: "Patterns du moment",
  summary:
    "Ce qui a bougé et qui se montre en un bloc de code, sans avoir besoin d'une feature autour.",
  screens: [
    {
      id: "compilateur",
      rank: "Compilateur",
      title: "Le compilateur React, activé",
      intent:
        "Stable depuis la 1.0, sortie d'expérimental depuis Next 16. Une clé dans la config et une devDependency.",
      file: "next.config.ts",
      language: "ts",
      source: "next-guidelines.md, Patterns, react-guidelines.md §2",
      pitfall:
        "Les règles de lint viennent de eslint-plugin-react-hooks >= 7. Le paquet eslint-plugin-react-compiler est gelé : ne pas l'installer.",
      code: `import type { NextConfig } from "next";

// La clé n'est plus sous expérimental depuis Next 16.
const nextConfig: NextConfig = { reactCompiler: true };

export default nextConfig;

// package.json : "babel-plugin-react-compiler" en devDependency.
// Next n'applique le plugin Babel qu'aux fichiers concernés, par une passe SWC :
// le coût de build reste marginal.`,
    },
    {
      id: "use-effect-event",
      rank: "React 19.2",
      title: "useEffectEvent",
      intent:
        "Sortir d'un Effect la logique qui lit des props ou du state sans les déclarer en dépendances. Stable depuis 19.2.",
      language: "tsx",
      source: "next-guidelines.md, Patterns, react-guidelines.md §1",
      highlightedLines: [6, 12],
      pitfall:
        "Jamais dans le tableau de dépendances, et jamais appelé hors de l'Effect qui le possède.",
      code: `"use client";

import { useEffect, useEffectEvent, useState } from "react";

export function Tracking({ url, theme }: { url: string; theme: string }) {
  // Lit thème sans le déclarer en dépendance : changer de thème ne relance pas la connexion.
  const onConnect = useEffectEvent(() => {
    log("visit", { url, theme });
  });

  useEffect(() => {
    const socket = connect(url);
    socket.on("open", onConnect);
    return () => socket.close();
  }, [url]);

  return null;
}`,
    },
    {
      id: "proxy",
      rank: "Next 16",
      title: "proxy.ts remplace middleware.ts",
      intent:
        "Le fichier middleware est déprécié et renommé. Même signature, même config, même emplacement racine.",
      file: "proxy.ts",
      language: "ts",
      source: "next-guidelines.md, tableau des versions, docs Next 16.3",
      pitfall:
        "Le proxy est fait pour tourner séparément du rendu, parfois déployé sur le CDN : ne pas compter sur un module ou un global partagés avec l'application. Ce qui doit passer passe par les en-têtes, les cookies, un rewrite ou l'URL.",
      code: `import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL("/home", request.url));
}

export const config = {
  matcher: "/about/:path*",
};`,
    },
    {
      id: "catch-error",
      rank: "Next 16",
      title: "catchError, la frontière d'erreur programmatique",
      intent:
        "L'alternative à error.js, posable n'importe où dans l'arbre. retry() rejoue le rendu dans une Transition, l'état des Client Components hors de la frontière survit.",
      file: "app/error-boundary.tsx",
      language: "tsx",
      source: "docs Next 16.3, next/error",
      highlightedLines: [3, 12],
      pitfall:
        "redirect() et notFound() lancent des erreurs spéciales : catchError les laisse passer, une frontière React écrite à la main les avalerait.",
      code: `"use client";

import { catchError, type ErrorInfo } from "next/error";

function Fallback({ title }: { title: string }, { error, retry }: ErrorInfo) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{error.message}</p>
      <button type="button" onClick={() => retry()}>
        Réessayer
      </button>
    </div>
  );
}

export default catchError(Fallback);`,
    },
    {
      id: "kit",
      rank: "Kit",
      title: "Le kit se déclare, il ne se copie pas",
      intent:
        "Un site de l'écosystème prend le registry @alexandremace. Tout passe par le CLI, jamais par un copier-coller entre projets, et le style suit celui du kit.",
      file: "components.json",
      language: "json",
      source: "next-guidelines.md §2, react-guidelines.md §3",
      pitfall:
        "Le globals.css importe aussi shadcn/tailwind.css, qui déclare les variantes data-open, data-selected, data-horizontal et les autres que les composants du registry supposent. Sans lui, les variantes natives de Tailwind s'appliquent sans lire la même chose : un data-horizontal nu ne correspond à rien, et le panneau d'un Tabs tombe à zéro pixel de large. Et shadcn add theme ne réécrit pas un globals.css déjà configuré : chaque nouveau token se pose à la main, la valeur dans :root et la correspondance --color-x dans @theme inline.",
      code: `{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "gray",
    "cssVariables": true
  },
  "aliases": { "components": "@/components", "utils": "@/lib/utils" },
  "registries": {
    "@alexandremace": "https://ui.alexandremace.fr/r/{name}.json"
  }
}`,
    },
    {
      id: "lien-bouton",
      rank: "Kit",
      title: "Un lien reste un lien",
      intent:
        "Le bon élément se choisit par ce que fait l'affordance, pas par ce à quoi elle ressemble. asChild est un idiome Radix : il n'existe pas sur Base UI.",
      language: "tsx",
      source: "react-guidelines.md §3",
      highlightedLines: [4, 7],
      pitfall:
        "Button render={<a />} semble marcher, mais Base UI réserve Button aux boutons : il avertit, et nativeButton={false}, qui fait taire l'avertissement, pose role=\"button\" sur le lien. Un lecteur d'écran annonce alors un bouton.",
      code: `// Action : un vrai bouton.
<Button variant="default" onClick={save}>Enregistrer</Button>

// Lien : ButtonLink, un vrai <a> avec l'allure d'un bouton, défini à côté de Button.
<ButtonLink href="/guides" variant="secondary">Les guides</ButtonLink>

// Filtre, sélection : ce n'est ni l'un ni l'autre.
<ToggleGroup value={filters} onValueChange={setFilters}>
  <Toggle value="next">Next</Toggle>
</ToggleGroup>`,
    },
  ],
};

const pieges = {
  id: "pieges",
  label: "Pièges",
  summary:
    "Ce qui ne casse pas le build, ne fait pas rougir le linter, et se paye plus tard.",
  screens: [
    {
      id: "next-public",
      rank: "Sécurité",
      title: "NEXT_PUBLIC_ est le modèle de sécurité entier",
      intent:
        "Une variable préfixée est dans le bundle, lisible par qui ouvre les sources, et rien ne prévient.",
      language: "ts",
      source: "next-guidelines.md §6 bis, react-guidelines.md §4",
      highlightedLines: [2, 8],
      pitfall:
        'Un secret lu dans un fichier qui s\'avère client est un secret publié. La frontière "use client" se suit de manière transitive, pas fichier par fichier.',
      code: `// Publié : prend le préfixe seulement ce qui irait sur un panneau publicitaire.
const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Serveur uniquement. Ce fichier ne doit être importé par aucun composant client,
// ni directement, ni par un module qui l'est.
import "server-only";

const secret = process.env.STRIPE_SECRET_KEY;`,
    },
    {
      id: "fetch-client",
      rank: "Données",
      title: "useEffect + fetch pour du contenu",
      intent:
        "Ce qui pouvait être cuit au build ne se va pas chercher au runtime : c'est un écran vide, une requête de plus, et rien à indexer.",
      language: "tsx",
      source: "next-guidelines.md §5",
      highlightedLines: [2, 3, 4, 5, 6],
      code: `// Non.
useEffect(() => {
  fetch("/data/emissions.json")
    .then((response) => response.json())
    .then(setEmissions);
}, []);

// Oui : la constante est générée par pnpm data, la page l'importe.
import { EMISSIONS } from "@/lib/emissions";

// Le fetch au runtime reste légitime pour l'exploration délibérée :
// un sélecteur de pays sur un graphe, en appels ciblés, avec un cache mémoire
// et une dégradation propre si la source tombe.`,
    },
    {
      id: "kit-fork",
      rank: "Kit",
      title: "Modifier components/ui dans un consommateur",
      intent:
        "Le kit est la source. Un besoin local est soit un vrai manque à corriger dans le kit, soit un cas à habiller par className.",
      language: "bash",
      source: "next-guidelines.md §2, react-guidelines.md §3",
      pitfall:
        "Un composant du kit modifié en local se fait écraser au prochain add, et la correction ne profite a aucun autre projet.",
      code: `# Le manque se corrige dans le kit, puis se propage.
/propagate-kit

# Un composant spécifique au project vit à la racine de components/,
# jamais dans components/ui/.
components/
  ui/            # le kit, jamais édité ici
  deck.tsx       # propre au project
  code-block.tsx`,
    },
    {
      id: "innerhtml",
      rank: "Sécurité",
      title: "dangerouslySetInnerHTML sur ce qu'un tiers influence",
      intent:
        "L'échappatoire est pour du markup produit par le projet, et assaini quand même. Le href d'un lien construit depuis de la donnée mérite la même suspicion.",
      language: "tsx",
      source: "next-guidelines.md §6 bis, react-guidelines.md §4",
      highlightedLines: [2, 5],
      code: `// Non : le contenu vient du CMS.
<div dangerouslySetInnerHTML={{ __html: article.body }} />

// Non plus : une URL javascript: est une exécution.
<a href={link.url}>{link.label}</a>

// Le href se valide avant d'être posé.
const safe = /^https?:\\/\\//.test(link.url) ? link.url : "#";`,
    },
  ],
};

export const NEXT: Stack = {
  id: "next",
  label: "Next.js, sites statiques",
  shortLabel: "Next.js",
  thesis:
    "La donnée est cuite au build. Si le rendu serveur ne fait pas économiser de JavaScript, le projet est une application et change de pile.",
  guideline: "next/next-guidelines.md",
  tracks: [featureFullstack, patterns, pieges],
};
