#!/usr/bin/env node
/**
 * Fails the build when a page links somewhere that does not exist.
 *
 * Why this exists
 * ---------------
 * The landing page shipped with its "Browse Mind Maps" button pointing at
 * `#mindmaps` and its Amazon strip pointing at `#books` after an edit had removed
 * both of those sections — along with two thirds of the file, ending it on the
 * comment `<!-- rest of file unchanged -->`. Nothing failed. The HTML was still
 * valid, the deploy was still green, and the buttons simply did nothing for
 * anyone who clicked them.
 *
 * That is the failure mode this catches: not malformed markup, which a browser
 * complains about, but markup that is well-formed and wrong. Three checks, each
 * one because it would have caught that:
 *
 *   1. Every same-page `#anchor` has an element with that id on the page.
 *   2. Every local file a page links to, or loads an image from, is on disk.
 *   3. No page ends early or carries a placeholder comment where content should be.
 *
 * A hash on *another* page is deliberately only checked as far as the file: the
 * store and the mind map gallery build their sections from `/api/catalog` after
 * load, so `store.html#study-guides` has no matching id in the file on disk and
 * never will.
 *
 * Usage
 * -----
 *   node scripts/check-links.mjs
 *
 * It runs before the preview watermarking in the Netlify build, so a page that
 * links into nothing stops the deploy while the previous one keeps serving.
 */

import { readFile, readdir, access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");

/**
 * Text that means an edit was left unfinished. Each of these has shipped at
 * least once as the last line of a page.
 */
const TRUNCATION_MARKERS = [
  "rest of file unchanged",
  "rest of the file unchanged",
  "unchanged from here",
  "... (truncated)",
];

/**
 * Paths that exist at request time but not on disk: rewrites and API routes.
 * Everything else linked with a leading slash has to be a real file.
 */
const SERVED_NOT_STORED = [
  // netlify.toml rewrites this to assets/previews/, which is checked instead.
  { prefix: "/assets/mind-maps/", as: (href) => href.replace("/assets/mind-maps/", "/assets/previews/") },
  { prefix: "/api/", as: () => null },
  { prefix: "/.netlify/", as: () => null },
];

async function main() {
  const pages = (await readdir(ROOT)).filter((name) => name.endsWith(".html")).sort();

  if (pages.length === 0) {
    fail(["No HTML pages found to check — is this running from the repository root?"]);
  }

  const problems = [];

  for (const page of pages) {
    const html = await readFile(path.join(ROOT, page), "utf8");
    problems.push(...checkTruncation(page, html));
    problems.push(...checkAnchors(page, html));
    problems.push(...(await checkLocalTargets(page, html)));
  }

  if (problems.length > 0) fail(problems);

  console.log(`Checked ${pages.length} page${pages.length === 1 ? "" : "s"}: every link and image resolves.`);
}

/** A page that stops early, or admits in a comment that it is incomplete. */
function checkTruncation(page, html) {
  const problems = [];
  const lowered = html.toLowerCase();

  for (const marker of TRUNCATION_MARKERS) {
    if (lowered.includes(marker)) {
      problems.push(`${page}: contains "${marker}" — the file looks like an unfinished edit.`);
    }
  }

  if (!lowered.trimEnd().endsWith("</html>")) {
    problems.push(`${page}: does not end with </html> — the file looks truncated.`);
  }

  for (const tag of ["body", "html"]) {
    if (!lowered.includes(`</${tag}>`)) {
      problems.push(`${page}: has no closing </${tag}> tag.`);
    }
  }

  return problems;
}

/** Same-page `#anchor` links, against the ids the page actually declares. */
function checkAnchors(page, html) {
  const ids = new Set(matchAll(html, /\sid\s*=\s*["']([^"']+)["']/g));
  const problems = [];

  for (const href of hrefs(html)) {
    if (!href.startsWith("#") || href === "#") continue;
    const target = decodeURIComponent(href.slice(1));
    if (!ids.has(target)) {
      problems.push(`${page}: links to #${target}, but no element on the page has that id.`);
    }
  }

  return problems;
}

/** Local files linked with href, or loaded with src, have to be on disk. */
async function checkLocalTargets(page, html) {
  const problems = [];
  const targets = new Set([...hrefs(html), ...matchAll(html, /\ssrc\s*=\s*["']([^"']+)["']/g)]);

  for (const target of targets) {
    const file = resolveLocal(target);
    if (file === null) continue;

    try {
      await access(path.join(ROOT, file));
    } catch {
      problems.push(`${page}: links to ${target}, but ${file} does not exist.`);
    }
  }

  return problems;
}

/**
 * The repo-relative file a link points at, or null when there is nothing on disk
 * to check — an external URL, a data: URI, an API route, a bare fragment.
 */
function resolveLocal(target) {
  if (!target || /^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(target)) return null;

  const [pathPart] = target.split("#");
  if (!pathPart) return null;

  for (const rule of SERVED_NOT_STORED) {
    if (pathPart.startsWith(rule.prefix)) {
      const rewritten = rule.as(pathPart);
      return rewritten === null ? null : rewritten.replace(/^\//, "");
    }
  }

  return pathPart.replace(/^\//, "");
}

function hrefs(html) {
  return matchAll(html, /\shref\s*=\s*["']([^"']+)["']/g);
}

function matchAll(text, pattern) {
  return [...text.matchAll(pattern)].map((match) => match[1]);
}

function fail(problems) {
  console.error(
    `\nLink check failed — ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n\n` +
      problems.map((problem) => `  ${problem}`).join("\n") +
      "\n\nA link that goes nowhere is invisible to a browser and obvious to a customer.\n",
  );
  process.exit(1);
}

await main();
