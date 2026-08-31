import {
  type BundledLanguage,
  createHighlighter,
  type Highlighter,
} from "shiki";

/**
 * La coloration se fait au build, dans un Server Component : le navigateur reçoit
 * du HTML déjà coloré, et pas une ligne de Shiki.
 */
const LANGAGES = [
  "bash",
  "css",
  "js",
  "json",
  "makefile",
  "md",
  "php",
  "ts",
  "tsx",
  "twig",
] as const satisfies readonly BundledLanguage[];

let instance: Promise<Highlighter> | undefined;

function highlighter() {
  instance ??= createHighlighter({
    themes: ["vitesse-light"],
    langs: [...LANGAGES],
  });
  return instance;
}

export async function colorer(
  code: string,
  langage: string,
  surligne: number[] = [],
): Promise<string> {
  const shiki = await highlighter();
  const lang = (LANGAGES as readonly string[]).includes(langage)
    ? (langage as BundledLanguage)
    : "ts";

  return shiki.codeToHtml(code, {
    lang,
    themes: { light: "vitesse-light" },
    defaultColor: false,
    transformers: [
      {
        line(node, ligne) {
          if (surligne.includes(ligne))
            this.addClassToHast(node, "highlighted");
        },
      },
    ],
  });
}
