import type { Pile } from "./types";

const featureFullstack = {
  id: "feature",
  label: "Feature full-stack",
  resume:
    "Une page, ses données cuites au build, sa part interactive, et la sécurité du jour où le site gagne un backend.",
  ecrans: [
    {
      id: "route",
      rang: "1",
      titre: "La route",
      intention:
        "Un dossier sous app/, un Server Component, sa metadata. Une route dynamique qui n'énumère pas ses valeurs n'est pas statique.",
      fichier: "app/tools/[slug]/page.tsx",
      langage: "tsx",
      source: "next-guidelines.md, Playbook et §4",
      surligne: [7, 8, 9],
      piege:
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
      rang: "2",
      titre: "Le pipeline de données",
      intention:
        "Une source externe entre par un script, pas par un fetch au runtime. Les logs de contrôle sont le seul filet d'un site sans suite de tests.",
      fichier: "scripts/build-tools.mjs",
      langage: "js",
      source: "next-guidelines.md §5",
      surligne: [27, 28, 29, 30],
      piege:
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
      rang: "3",
      titre: "Le fichier généré",
      intention:
        "Il porte son en-tête, sa source et sa date. Une édition à la main y survit jusqu'au prochain pnpm data, et pas au-delà.",
      fichier: "lib/emissions.ts",
      langage: "ts",
      source: "next-guidelines.md §5",
      surligne: [1, 2, 3],
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
      rang: "4",
      titre: "La part interactive",
      intention:
        "Le composant client descend le plus bas possible dans l'arbre. Sa page reste un Server Component et lui passe la donnée cuite en props.",
      fichier: "components/simulator.tsx",
      langage: "tsx",
      source: "next-guidelines.md, Playbook · react-guidelines.md §2",
      surligne: [1, 12],
      piege:
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
      rang: "5",
      titre: "Un onglet qui garde son état",
      intention:
        "Démonter un panneau caché lui fait perdre son état, son DOM et sa position de scroll. Activity le garde, et nettoie quand même les Effects.",
      fichier: "components/simulator-tabs.tsx",
      langage: "tsx",
      source: "next-guidelines.md, Patterns · react-guidelines.md §1",
      surligne: [10, 13],
      piege:
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
      rang: "6",
      titre: "La server action, si le site a un backend",
      intention:
        "Elle compile en route POST publique. Session, puis autorisation sur l'objet visé, puis validation de l'entrée, dans cet ordre.",
      fichier: "app/actions.ts",
      langage: "ts",
      source: "next-guidelines.md §6 bis",
      surligne: [9, 12, 17],
      piege:
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
      rang: "7",
      titre: "Les en-têtes",
      intention:
        "CSP, X-Content-Type-Options, Referrer-Policy, Strict-Transport-Security. Leur absence est silencieuse, donc c'est un constat de /gap-code à lui seul.",
      fichier: "next.config.ts",
      langage: "ts",
      source: "next-guidelines.md §6 bis · §1",
      surligne: [7, 24],
      piege:
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
      rang: "8",
      titre: "L'image OG générée",
      intention:
        "Une image statique périme en silence. Celle-ci est rendue au build depuis les mêmes constantes que la page.",
      fichier: "app/opengraph-image.tsx",
      langage: "tsx",
      source: "next-guidelines.md §4",
      surligne: [4, 5],
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
      rang: "9",
      titre: "Definition of Done",
      intention:
        "La feature est finie quand ces lignes sont vertes, pas quand le build passe.",
      langage: "md",
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
  resume:
    "Ce qui a bougé et qui se montre en un bloc de code, sans avoir besoin d'une feature autour.",
  ecrans: [
    {
      id: "compilateur",
      rang: "Compilateur",
      titre: "Le compilateur React, activé",
      intention:
        "Stable depuis la 1.0, sortie d'expérimental depuis Next 16. Une clé dans la config et une devDependency.",
      fichier: "next.config.ts",
      langage: "ts",
      source: "next-guidelines.md, Patterns · react-guidelines.md §2",
      piege:
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
      rang: "React 19.2",
      titre: "useEffectEvent",
      intention:
        "Sortir d'un Effect la logique qui lit des props ou du state sans les déclarer en dépendances. Stable depuis 19.2.",
      langage: "tsx",
      source: "next-guidelines.md, Patterns · react-guidelines.md §1",
      surligne: [6, 12],
      piege:
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
      rang: "Next 16",
      titre: "proxy.ts remplace middleware.ts",
      intention:
        "Le fichier middleware est déprécié et renommé. Même signature, même config, même emplacement racine.",
      fichier: "proxy.ts",
      langage: "ts",
      source: "next-guidelines.md, tableau des versions · docs Next 16.3",
      piege:
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
      rang: "Next 16",
      titre: "catchError, la frontière d'erreur programmatique",
      intention:
        "L'alternative à error.js, posable n'importe où dans l'arbre. retry() rejoue le rendu dans une Transition, l'état des Client Components hors de la frontière survit.",
      fichier: "app/error-boundary.tsx",
      langage: "tsx",
      source: "docs Next 16.3, next/error",
      surligne: [3, 12],
      piege:
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
      rang: "Kit",
      titre: "Le kit se déclare, il ne se copie pas",
      intention:
        "Un site de l'écosystème prend le registry @alexandremace. Tout passe par le CLI, jamais par un copier-coller entre projets.",
      fichier: "components.json",
      langage: "json",
      source: "next-guidelines.md §2",
      piege:
        "shadcn add theme ne réécrit pas un globals.css déjà configuré : chaque nouveau token se pose à la main, la valeur dans :root et la correspondance --color-x dans @theme inline.",
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
      rang: "Kit",
      titre: "Un lien reste un lien",
      intention:
        "Le bon élément se choisit par ce que fait l'affordance, pas par ce à quoi elle ressemble. asChild est un idiome Radix : il n'existe pas sur Base UI.",
      langage: "tsx",
      source: "react-guidelines.md §3",
      surligne: [4, 7],
      code: `// Action : un vrai bouton.
<Button variant="default" onClick={save}>Enregistrer</Button>

// Lien : la composition passe par render, et un vrai <a> survit.
<Button render={<a href="/guides" />} variant="secondary">Les guides</Button>

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
  resume:
    "Ce qui ne casse pas le build, ne fait pas rougir le linter, et se paye plus tard.",
  ecrans: [
    {
      id: "next-public",
      rang: "Sécurité",
      titre: "NEXT_PUBLIC_ est le modèle de sécurité entier",
      intention:
        "Une variable préfixée est dans le bundle, lisible par qui ouvre les sources, et rien ne prévient.",
      langage: "ts",
      source: "next-guidelines.md §6 bis · react-guidelines.md §4",
      surligne: [2, 8],
      piege:
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
      rang: "Données",
      titre: "useEffect + fetch pour du contenu",
      intention:
        "Ce qui pouvait être cuit au build ne se va pas chercher au runtime : c'est un écran vide, une requête de plus, et rien à indexer.",
      langage: "tsx",
      source: "next-guidelines.md §5",
      surligne: [2, 3, 4, 5, 6],
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
      rang: "Kit",
      titre: "Modifier components/ui dans un consommateur",
      intention:
        "Le kit est la source. Un besoin local est soit un vrai manque à corriger dans le kit, soit un cas à habiller par className.",
      langage: "bash",
      source: "next-guidelines.md §2 · react-guidelines.md §3",
      piege:
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
      rang: "Sécurité",
      titre: "dangerouslySetInnerHTML sur ce qu'un tiers influence",
      intention:
        "L'échappatoire est pour du markup produit par le projet, et assaini quand même. Le href d'un lien construit depuis de la donnée mérite la même suspicion.",
      langage: "tsx",
      source: "next-guidelines.md §6 bis · react-guidelines.md §4",
      surligne: [2, 5],
      code: `// Non : le contenu vient du CMS.
<div dangerouslySetInnerHTML={{ __html: article.body }} />

// Non plus : une URL javascript: est une exécution.
<a href={link.url}>{link.label}</a>

// Le href se valide avant d'être posé.
const safe = /^https?:\\/\\//.test(link.url) ? link.url : "#";`,
    },
  ],
};

export const NEXT: Pile = {
  id: "next",
  label: "Next.js, sites statiques",
  labelCourt: "Next.js",
  these:
    "La donnée est cuite au build. Si le rendu serveur ne fait pas économiser de JavaScript, le projet est une application et change de pile.",
  guideline: "next/next-guidelines.md",
  pistes: [featureFullstack, patterns, pieges],
};
