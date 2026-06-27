import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import type { Root, Element, Text } from "hast";
import type { Plugin } from "unified";

/** Strip AI preamble text before the first heading */
function stripPreamble(markdown: string): string {
  const firstHeading = markdown.search(/^#{1,3}\s/m);
  if (firstHeading > 0) {
    return markdown.slice(firstHeading);
  }
  return markdown;
}

/**
 * The AI-generated content frequently emits a bullet marker on its own line
 * ("- ") with the item's text on the *next* line. CommonMark renders that as an
 * empty bullet followed by a detached paragraph. Rejoin the marker with the
 * following content line so it becomes a proper list item.
 */
function normalizeBrokenLists(markdown: string): string {
  // A line that is only a list marker — "-", "*", "+", or an ordered marker like
  // "8." / "8)" — (+ optional spaces) immediately followed by a line whose first
  // non-space char is real content (not another marker/heading/table/quote).
  return markdown.replace(
    /^([ \t]*(?:[-*+]|\d+[.)]))[ \t]*\n(?=[ \t]*[^\s\-#|>])/gm,
    "$1 "
  );
}

/** Rehype plugin: rewrite image paths and fix broken URLs */
const rehypeImageRewrite: Plugin<[], Root> = () => {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "img" && node.properties?.src) {
        let src = String(node.properties.src);

        // Rewrite relative local paths
        if (src.includes("../assets/images/") || src.includes("assets/images/")) {
          src = src.replace(/\.\.\/assets\/images\//, "/images/");
          src = src.replace(/assets\/images\//, "/images/");
        }

        // Fix commons.wikimedia.org page URLs → direct upload URLs
        const commonsMatch = src.match(
          /commons\.wikimedia\.org\/wiki\/(?:File:|Category:.*#\/media\/File:)(.+)/
        );
        if (commonsMatch) {
          const filename = decodeURIComponent(commonsMatch[1]).replace(/ /g, "_");
          src = `https://upload.wikimedia.org/wikipedia/commons/thumb/${filename.charAt(0).toLowerCase()}/${filename.substring(0, 2).toLowerCase()}/${filename}/800px-${filename}`;
        }

        // Add lazy loading and styling
        node.properties.src = src;
        node.properties.loading = "lazy";
        node.properties.decoding = "async";

        // Add error handler as inline attribute
        node.properties.onerror =
          "this.style.display='none'";
      }
    });
  };
};

/** Simple tree visitor */
function visit(
  tree: Root | Element,
  type: string,
  fn: (node: Element) => void
) {
  if ("tagName" in tree && tree.type === type) {
    fn(tree as Element);
  }
  if ("children" in tree) {
    for (const child of tree.children) {
      if ("type" in child && ((child as unknown as { type: string }).type === "element" || (child as unknown as { type: string }).type === "root")) {
        visit(child as unknown as Element, type, fn);
      }
    }
  }
}

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

/** Extract headings from the HAST tree */
function extractHeadings(tree: Root): Heading[] {
  const headings: Heading[] = [];
  visit(tree, "element", (node: Element) => {
    if (/^h[2-3]$/.test(node.tagName)) {
      const depth = parseInt(node.tagName[1]);
      const text = getTextContent(node);
      const id = String(node.properties?.id || "");
      if (text) headings.push({ depth, text, id });
    }
  });
  return headings;
}

function getTextContent(node: Element | Text): string {
  if (node.type === "text") return (node as Text).value;
  if ("children" in node) {
    return (node.children as (Element | Text)[])
      .map((c) => getTextContent(c))
      .join("");
  }
  return "";
}

export interface ParsedMarkdown {
  html: string;
  headings: Heading[];
  title: string;
  excerpt: string;
}

export async function parseMarkdown(raw: string): Promise<ParsedMarkdown> {
  const cleaned = normalizeBrokenLists(stripPreamble(raw));

  // Extract title from first heading
  const titleMatch = cleaned.match(/^#{1,2}\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Extract first real prose line as excerpt — skip headings, images, blockquotes, tables
  const firstProse = cleaned
    .split("\n")
    .map((l) => l.trim())
    .find(
      (l) =>
        l.length > 0 &&
        !l.startsWith("#") &&
        !l.startsWith("!") &&
        !l.startsWith(">") &&
        !l.startsWith("|") &&
        !l.startsWith("---")
    );
  const excerpt = firstProse
    ? firstProse
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // strip any inline images
        .replace(/[*_\[\]()]/g, "")
        .trim()
        .slice(0, 200)
    : "";

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeImageRewrite)
    .use(rehypeStringify, { allowDangerousHtml: true });

  const file = await processor.process(cleaned);
  const html = String(file);

  // Parse again just for heading extraction
  const tree = processor.parse(cleaned);
  const hast = await processor.run(tree);
  const headings = extractHeadings(hast as Root);

  return { html, headings, title, excerpt };
}
