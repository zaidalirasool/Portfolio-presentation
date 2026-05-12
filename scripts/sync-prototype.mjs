#!/usr/bin/env node
/**
 * Re-snapshots the merchant-portal playground SPA into the deck so slide 17
 * has zero runtime server dependency.
 *
 * Pipeline:
 *   1. Build the Remix SPA in playground/ with VITE_PAGES_PREFIX baked in,
 *      so every asset URL and the React Router basename match where the
 *      build will live inside this repo.
 *   2. Replace assets/prototype-checkout-upsell/ with the fresh build.
 *   3. Re-inject the deep-link redirect into the built index.html — Remix's
 *      build overwrites it, and Python's http.server can't SPA-fallback the
 *      deep route on its own, so the iframe must always start at index.html
 *      and rewrite history client-side before mount.
 *   4. Bump the deck's app.js cache-buster query so the iframe wiring picks
 *      up the regenerated bundle on next reload (no stale-cache surprises).
 *
 * Default playground location:
 *   ../RC Frontend/packages/merchant-portal/playground
 *
 * Override via env:
 *   PLAYGROUND_ROOT=/abs/path npm run sync-prototype
 *   ROUTE=/some/other/route npm run sync-prototype
 */

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PLAYGROUND_ROOT =
  process.env.PLAYGROUND_ROOT ||
  join(ROOT, "..", "RC Frontend", "packages", "merchant-portal", "playground");

const PREFIX = "/assets/prototype-checkout-upsell";
const ROUTE = process.env.ROUTE || "/merchant/cross-sell-upsell/checkout-upsell-swap-setup";
const TARGET_DIR = join(ROOT, "assets", "prototype-checkout-upsell");
const DECK_INDEX = join(ROOT, "index.html");

function fail(msg) {
  console.error(`[sync-prototype] ${msg}`);
  process.exit(1);
}

function step(n, label) {
  console.log(`\n[sync-prototype] ${n}/4 ${label}`);
}

if (!existsSync(PLAYGROUND_ROOT)) {
  fail(`playground not found at ${PLAYGROUND_ROOT} — set PLAYGROUND_ROOT env var`);
}
if (!existsSync(join(PLAYGROUND_ROOT, "package.json"))) {
  fail(`no package.json in ${PLAYGROUND_ROOT} — wrong path?`);
}

step(1, `building playground SPA with VITE_PAGES_PREFIX=${PREFIX}`);
const buildResult = spawnSync("npm", ["run", "build"], {
  cwd: PLAYGROUND_ROOT,
  env: { ...process.env, VITE_PAGES_PREFIX: PREFIX },
  stdio: "inherit",
});
if (buildResult.status !== 0) fail(`playground build failed (exit ${buildResult.status})`);

const builtClient = join(PLAYGROUND_ROOT, "build", "client");
if (!existsSync(join(builtClient, "index.html"))) {
  fail(`build did not produce ${join(builtClient, "index.html")}`);
}

step(2, `replacing ${TARGET_DIR}`);
rmSync(TARGET_DIR, { recursive: true, force: true });
mkdirSync(TARGET_DIR, { recursive: true });
cpSync(builtClient, TARGET_DIR, { recursive: true });

step(3, `injecting deep-link redirect (route: ${ROUTE})`);
const indexPath = join(TARGET_DIR, "index.html");
const before = readFileSync(indexPath, "utf8");
const remixContextMarker = `<script>window.__remixContext = {"basename":"${PREFIX}"`;
if (!before.includes(remixContextMarker)) {
  fail(
    `couldn't find "${remixContextMarker}" in built index.html — ` +
      `did the build's basename change? VITE_PAGES_PREFIX may have been ignored.`
  );
}
const redirectScript =
  `<script>(function(){var base=${JSON.stringify(PREFIX)};` +
  `var deep=base+${JSON.stringify(ROUTE)};` +
  `var p=location.pathname;` +
  `if(p===base||p===base+"/"||p===base+"/index.html"){` +
  `history.replaceState(null,"",deep+location.search+location.hash);` +
  `}})();</script>`;
const patched = before.replace(remixContextMarker, redirectScript + remixContextMarker);
writeFileSync(indexPath, patched, "utf8");

step(4, `bumping cache-busters in deck (app.js + iframe src)`);
let deck = readFileSync(DECK_INDEX, "utf8");

// Bump app.js?v=slideshow-### so the slideshow JS reloads fresh.
const appJsRe = /(\.\/app\.js\?v=slideshow-)(\d+)/;
const appMatch = deck.match(appJsRe);
if (!appMatch) fail(`could not find ./app.js?v=slideshow-### in ${DECK_INDEX}`);
const nextApp = Number(appMatch[2]) + 1;
deck = deck.replace(appJsRe, `$1${nextApp}`);

// Bump the iframe's prototype index.html?v=### so the browser re-fetches the
// shell (which references hashed JS chunks). Without this, a cached old
// index.html keeps pointing at chunks the new build no longer ships.
const iframeRe = /(src="\.\/assets\/prototype-checkout-upsell\/index\.html\?v=)(\d+)(")/;
const iframeMatch = deck.match(iframeRe);
if (!iframeMatch) {
  fail(
    `could not find iframe src with ?v=### in ${DECK_INDEX}. ` +
      `Expected: src="./assets/prototype-checkout-upsell/index.html?v=N"`
  );
}
const nextIframe = Number(iframeMatch[2]) + 1;
deck = deck.replace(iframeRe, `$1${nextIframe}$3`);

writeFileSync(DECK_INDEX, deck, "utf8");

console.log(
  `\n[sync-prototype] done\n` +
    `  • playground built from: ${PLAYGROUND_ROOT}\n` +
    `  • snapshot copied to:    ${TARGET_DIR}\n` +
    `  • deep-link route:       ${ROUTE}\n` +
    `  • app.js cache-buster:   slideshow-${nextApp}\n` +
    `  • iframe cache-buster:   v=${nextIframe}\n` +
    `\nHard-reload the deck (Cmd+Shift+R), navigate to slide 17, and verify.\n`
);
