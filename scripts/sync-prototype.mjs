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
// Compute the basename at runtime from location.pathname so the same build
// works whether the deck is served at root (local `npm run preview`) or under
// a subpath (e.g. GitHub Pages at /Portfolio-presentation/). The build bakes
// in `VITE_PAGES_PREFIX` as a static basename, but that only matches one of
// those environments; the override below makes both work.
// Two URL-resolution problems get solved here, both rooted in the same
// underlying issue: history.replaceState below shifts document.baseURI
// from the prototype's directory to the deep route's directory, which
// turns every relative URL in the page into a 404.
//
// 1) <base href={base}/> pinned as the first <head> child fixes module
//    specifier resolution for the bundled <script type="module"> block
//    (e.g. ./assets/manifest-***.js). Modules instantiate against
//    document.baseURI, so the base tag must be live BEFORE replaceState.
//
// 2) The <base> tag is short-lived: React's hydration cleans it up
//    because it isn't in Remix's virtual DOM. Relative url(./assets/...)
//    references inside SSR'd <style data-emotion> blocks (notably the
//    @font-face declarations) are resolved lazily — by the time the
//    browser actually needs Greycliff/Avenir, <base> is gone and URLs
//    resolve against the deep route, 404, then get negative-cached.
//    To survive that, we rewrite ./assets/ to ${base}/assets/ inline,
//    in every <style> block, BEFORE React or Emotion touches them.
const redirectScript =
  `<script>(function(){var path=location.pathname;` +
  `var marker=${JSON.stringify(PREFIX)};` +
  `var idx=path.indexOf(marker);` +
  `var base=idx>=0?path.slice(0,idx+marker.length):marker;` +
  `window.__playgroundBase=base;` +
  `var b=document.createElement("base");b.href=base+"/";` +
  `var h=document.head||document.getElementsByTagName("head")[0]||document.documentElement;` +
  `h.insertBefore(b,h.firstChild);` +
  `var styles=document.querySelectorAll("style");` +
  `for(var i=0;i<styles.length;i++){var s=styles[i];` +
  `if(s.textContent&&s.textContent.indexOf("./assets/")!==-1){` +
  `s.textContent=s.textContent.replace(/url\\(\\s*(['"]?)\\.\\/assets\\//g,"url($1"+base+"/assets/");` +
  `}}` +
  `var deep=base+${JSON.stringify(ROUTE)};` +
  `if(path===base||path===base+"/"||path===base+"/index.html"){` +
  `history.replaceState(null,"",deep+location.search+location.hash);` +
  `}})();</script>`;
let patched = before.replace(remixContextMarker, redirectScript + remixContextMarker);

const remixContextEnd = `,"errors":null}};</script>`;
if (!patched.includes(remixContextEnd)) {
  fail(
    `couldn't find end of __remixContext assignment ("${remixContextEnd}") in built index.html — ` +
      `Remix output shape may have changed.`
  );
}
patched = patched.replace(
  remixContextEnd,
  `,"errors":null}};window.__remixContext.basename=window.__playgroundBase;</script>`
);

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
