#!/usr/bin/env node
/**
 * Generates spark-tokens.generated.css from packages/merchant-portal
 * (@merchant-portal/design-system theme foundations — same source as playground).
 *
 * Pulls: colors, shadows, radii, typography (fonts + recharge text scale), transition durations.
 *
 * Default:
 *   MERCHANT_PORTAL_ROOT/../RC Frontend/packages/merchant-portal
 *
 * Override:
 *   MERCHANT_PORTAL_ROOT=/path/to/packages/merchant-portal npm run sync-spark
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MERCHANT_PORTAL_ROOT =
  process.env.MERCHANT_PORTAL_ROOT ||
  join(ROOT, "..", "RC Frontend", "packages", "merchant-portal");

const DS_THEME = join(MERCHANT_PORTAL_ROOT, "design-system", "theme", "foundations");
const COLORS_TS = join(DS_THEME, "colors.ts");
const SHADOWS_TS = join(DS_THEME, "shadows.ts");
const RADII_TS = join(DS_THEME, "radii.ts");
const TYPOGRAPHY_TS = join(DS_THEME, "typography.ts");
const FOUNDATIONS_INDEX_TS = join(DS_THEME, "index.ts");

function extractConstObject(source, constName, fileLabel = "") {
  const needle = `const ${constName} = {`;
  const idx = source.indexOf(needle);
  if (idx === -1) {
    throw new Error(`Could not find "${needle}"${fileLabel ? ` in ${fileLabel}` : ""}`);
  }
  let i = idx + needle.length;
  let depth = 1;
  const start = i;
  for (; i < source.length && depth > 0; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
  }
  if (depth !== 0) throw new Error(`Unbalanced braces for ${constName}`);
  return source.slice(start, i - 1);
}

function extractExportConstObject(source, exportName, fileLabel = "") {
  const needle = `export const ${exportName} = {`;
  const idx = source.indexOf(needle);
  if (idx === -1) {
    throw new Error(`Could not find "${needle}"${fileLabel ? ` in ${fileLabel}` : ""}`);
  }
  let i = idx + needle.length;
  let depth = 1;
  const start = i;
  for (; i < source.length && depth > 0; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
  }
  return source.slice(start, i - 1);
}

function parseHexMap(block) {
  const map = {};
  const re = /(\w+)\s*:\s*'#([0-9A-Fa-f]{3,8})'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    map[m[1]] = `#${m[2]}`;
  }
  return map;
}

/** Quoted string values: '2px', '0.875rem', '50ms' — keys may be quoted ('2xl') or bare (faster) */
function parseQuotedMap(block) {
  const map = {};
  const re = /(?:'([^']+)'|([\w.]+))\s*:\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const k = m[1] ?? m[2];
    map[k] = m[3];
  }
  return map;
}

function parseShadowMap(block) {
  const map = {};
  const re = /(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    map[m[1]] = m[2].replace(/\\(.)/g, "$1");
  }
  return map;
}

function hexPaletteVars(prefix, map) {
  return Object.entries(map)
    .map(([k, v]) => `  ${prefix}-${k}: ${v};`)
    .join("\n");
}

function parseTypographyFonts(src) {
  const heading = src.match(/heading:\s*`([^`]+)`/)?.[1]?.trim();
  const body = src.match(/body:\s*`([^`]+)`/)?.[1]?.trim();
  return { heading, body };
}

function extractTransitionDurations(indexSrc) {
  const needle = "duration: {";
  const idx = indexSrc.indexOf(needle);
  if (idx === -1) return {};
  const openBrace = idx + needle.length - 1;
  let depth = 1;
  const start = openBrace + 1;
  for (let i = start; i < indexSrc.length; i++) {
    const c = indexSrc[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return parseQuotedMap(indexSrc.slice(start, i));
    }
  }
  return {};
}

function main() {
  if (!existsSync(COLORS_TS)) {
    console.error(`Missing merchant-portal foundations. Expected:\n  ${COLORS_TS}\n`);
    console.error("Set MERCHANT_PORTAL_ROOT to packages/merchant-portal (contains design-system/).");
    process.exit(1);
  }

  const colorsSrc = readFileSync(COLORS_TS, "utf8");
  const midnight = parseHexMap(extractConstObject(colorsSrc, "midnight", COLORS_TS));
  const jade = parseHexMap(extractConstObject(colorsSrc, "jade", COLORS_TS));
  const cobalt = parseHexMap(extractConstObject(colorsSrc, "cobalt", COLORS_TS));
  const structure = parseHexMap(extractConstObject(colorsSrc, "structure", COLORS_TS));

  const paperM = colorsSrc.match(/\bpaper:\s*'#([0-9A-Fa-f]{3,8})'/);
  const paper = paperM ? `#${paperM[1]}` : "#FFFBF6";
  const whiteM = colorsSrc.match(/\bwhite:\s*'#([0-9A-Fa-f]{3,8})'/);
  const white = whiteM ? `#${whiteM[1]}` : "#fff";

  let shadows = {};
  if (existsSync(SHADOWS_TS)) {
    const shadowsSrc = readFileSync(SHADOWS_TS, "utf8");
    shadows = parseShadowMap(extractExportConstObject(shadowsSrc, "shadows", SHADOWS_TS));
  }

  let radii = {};
  if (existsSync(RADII_TS)) {
    const radiiSrc = readFileSync(RADII_TS, "utf8");
    radii = parseQuotedMap(extractExportConstObject(radiiSrc, "radii", RADII_TS));
  }

  let rechargeSizes = {};
  let rechargeLineHeights = {};
  let fontHeading = `"Greycliff", sans-serif`;
  let fontBody = `"Avenir", sans-serif`;
  if (existsSync(TYPOGRAPHY_TS)) {
    const typoSrc = readFileSync(TYPOGRAPHY_TS, "utf8");
    const fonts = parseTypographyFonts(typoSrc);
    if (fonts.heading) fontHeading = fonts.heading;
    if (fonts.body) fontBody = fonts.body;
    try {
      rechargeSizes = parseQuotedMap(extractConstObject(typoSrc, "rechargeFontSizes", TYPOGRAPHY_TS));
      rechargeLineHeights = parseQuotedMap(
        extractConstObject(typoSrc, "rechargeLineHeights", TYPOGRAPHY_TS)
      );
    } catch {
      // optional
    }
  }

  let transitionDurations = {};
  if (existsSync(FOUNDATIONS_INDEX_TS)) {
    const indexSrc = readFileSync(FOUNDATIONS_INDEX_TS, "utf8");
    transitionDurations = extractTransitionDurations(indexSrc);
  }

  const outPath = join(ROOT, "spark-tokens.generated.css");
  const portalRel = relative(ROOT, MERCHANT_PORTAL_ROOT) || ".";

  const lines = [];
  lines.push("/*");
  lines.push(" * AUTO-GENERATED — do not edit by hand.");
  lines.push(` * Source package: ${portalRel} (MERCHANT_PORTAL_ROOT)`);
  lines.push(" *   design-system/theme/foundations/colors.ts");
  if (existsSync(SHADOWS_TS)) lines.push(" *   design-system/theme/foundations/shadows.ts");
  if (existsSync(RADII_TS)) lines.push(" *   design-system/theme/foundations/radii.ts");
  if (existsSync(TYPOGRAPHY_TS)) lines.push(" *   design-system/theme/foundations/typography.ts");
  if (existsSync(FOUNDATIONS_INDEX_TS)) {
    lines.push(" *   design-system/theme/foundations/index.ts (transition.duration)");
  }
  lines.push(" * Regenerate: npm run sync-spark");
  lines.push(" */");
  lines.push("");
  lines.push(":root {");
  lines.push("  /* foundations/colors — primitives */");
  lines.push(hexPaletteVars("--spark-palette-midnight", midnight));
  lines.push(hexPaletteVars("--spark-palette-jade", jade));
  lines.push(hexPaletteVars("--spark-palette-cobalt", cobalt));
  lines.push(hexPaletteVars("--spark-palette-structure", structure));
  lines.push(`  --spark-palette-paper: ${paper};`);
  lines.push(`  --spark-palette-white: ${white};`);

  if (Object.keys(shadows).length) {
    lines.push("");
    lines.push("  /* foundations/shadows */");
    for (const [k, v] of Object.entries(shadows)) {
      lines.push(`  --spark-palette-shadow-${k}: ${v};`);
    }
  }

  if (Object.keys(radii).length) {
    lines.push("");
    lines.push("  /* foundations/radii */");
    for (const [k, v] of Object.entries(radii)) {
      const key = String(k).replace(/['"]/g, "");
      lines.push(`  --spark-palette-radii-${key}: ${v};`);
    }
  }

  lines.push("");
  lines.push("  /* foundations/typography (font stacks from DS; Connary “Greycliff CF” added in spark.css) */");
  lines.push(`  --spark-palette-font-heading: ${fontHeading};`);
  lines.push(`  --spark-palette-font-body: ${fontBody};`);

  for (const [k, v] of Object.entries(rechargeSizes)) {
    lines.push(`  --spark-palette-type-${k}-font-size: ${v};`);
  }
  for (const [k, v] of Object.entries(rechargeLineHeights)) {
    lines.push(`  --spark-palette-type-${k}-line-height: ${v};`);
  }

  if (Object.keys(transitionDurations).length) {
    lines.push("");
    lines.push("  /* foundations/index transition.duration */");
    for (const [k, v] of Object.entries(transitionDurations)) {
      const key = String(k).replace(/['"]/g, "");
      lines.push(`  --spark-transition-${key}: ${v};`);
    }
  }

  lines.push("");
  lines.push("  /* Semantic — portfolio slide / flow UI */");
  lines.push("  --spark-color-ink: var(--spark-palette-midnight-100);");
  lines.push("  --spark-color-ink-muted: color-mix(in srgb, var(--spark-palette-midnight-100) 68%, transparent);");
  lines.push("  --spark-color-ink-subtle: color-mix(in srgb, var(--spark-palette-midnight-100) 58%, transparent);");
  lines.push("  --spark-color-ink-faint: color-mix(in srgb, var(--spark-palette-midnight-100) 45%, transparent);");
  lines.push("  --spark-color-white: var(--spark-palette-white);");
  lines.push("  --spark-color-teal: var(--spark-palette-jade-100);");
  lines.push("  --spark-color-active-ring: var(--spark-palette-cobalt-100);");
  lines.push("  --spark-color-cream: var(--spark-palette-paper);");
  lines.push("  --spark-color-kebab: var(--spark-palette-midnight-10);");
  lines.push("  --spark-color-purple: var(--spark-palette-cobalt-100);");
  lines.push("  --spark-color-link: var(--spark-palette-cobalt-80);");
  lines.push("  --spark-color-link-hover: var(--spark-palette-cobalt-120);");
  lines.push("  --spark-color-canvas-dot: color-mix(in srgb, var(--spark-palette-midnight-100) 7%, transparent);");
  lines.push("  --spark-color-stroke: color-mix(in srgb, var(--spark-palette-midnight-100) 12%, transparent);");
  lines.push("  --spark-color-stroke-strong: color-mix(in srgb, var(--spark-palette-midnight-100) 14%, transparent);");
  lines.push("  --spark-color-stroke-bold: color-mix(in srgb, var(--spark-palette-midnight-100) 28%, transparent);");
  lines.push("  --spark-color-field-bg: color-mix(in srgb, var(--spark-palette-midnight-100) 4%, transparent);");
  lines.push("  --spark-color-surface-hover: color-mix(in srgb, var(--spark-palette-midnight-100) 3%, transparent);");
  lines.push("  --spark-color-backdrop: color-mix(in srgb, var(--spark-palette-midnight-100) 22%, transparent);");
  lines.push("  --spark-color-control-bg: color-mix(in srgb, var(--spark-palette-midnight-100) 6%, transparent);");
  lines.push("  --spark-color-control-bg-hover: color-mix(in srgb, var(--spark-palette-midnight-100) 10%, transparent);");
  lines.push("  --spark-color-panel-border: var(--spark-palette-structure-20);");
  lines.push("  --spark-color-panel-outline: var(--spark-palette-structure-50);");
  lines.push("  --spark-color-panel-muted-text: var(--spark-palette-structure-80);");
  lines.push("  --spark-color-panel-hint: var(--spark-palette-structure-100);");
  lines.push("  --spark-color-panel-footer: var(--spark-palette-structure-10);");
  lines.push("  --spark-color-apply: var(--spark-palette-cobalt-100);");

  if (Object.keys(radii).length) {
    lines.push("");
    lines.push("  /* radii — map deck components to DS radii */");
    lines.push("  --spark-radius-xs: var(--spark-palette-radii-md);");
    lines.push("  --spark-radius-sm: var(--spark-palette-radii-lg);");
    lines.push("  --spark-radius-md: 10px;");
    lines.push("  --spark-radius-lg: var(--spark-palette-radii-xl);");
    lines.push("  --spark-radius-pill: var(--spark-palette-radii-full);");
  }

  if (shadows[2]) {
    lines.push("  --spark-shadow-sm: var(--spark-palette-shadow-2);");
    lines.push("  --spark-shadow-sm-hover: var(--spark-palette-shadow-3);");
  }
  if (shadows[4]) {
    lines.push("  --spark-shadow-panel: var(--spark-palette-shadow-4);");
    lines.push("  --spark-shadow-panel-inline: var(--spark-palette-shadow-4);");
  }
  lines.push("  --spark-shadow-panel-footer: 0 -1px 8px rgba(0, 0, 0, 0.1);");
  lines.push("  --spark-shadow-focus-ring: 0 0 0 2px var(--spark-color-white),");
  lines.push("    0 0 0 4px color-mix(in srgb, var(--spark-palette-midnight-100) 35%, transparent);");
  lines.push("}");
  lines.push("");

  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`Wrote ${outPath}`);
}

main();
