import {
  type BundledLanguage,
  createHighlighter,
  type Highlighter,
} from "shiki";

/**
 * La coloration se fait au build, dans un Server Component : le navigateur reçoit
 * du HTML déjà coloré, et pas une ligne de Shiki.
 */
const LANGUAGES = [
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
    langs: [...LANGUAGES],
  });
  return instance;
}

export async function highlightCode(
  code: string,
  language: string,
  highlightedLines: number[] = [],
): Promise<string> {
  const shiki = await highlighter();
  const lang = (LANGUAGES as readonly string[]).includes(language)
    ? (language as BundledLanguage)
    : "ts";

  return shiki.codeToHtml(code, {
    lang,
    themes: { light: "vitesse-light" },
    defaultColor: false,
    transformers: [
      {
        line(node, line) {
          if (highlightedLines.includes(line))
            this.addClassToHast(node, "highlighted");
        },
      },
    ],
  });
}
