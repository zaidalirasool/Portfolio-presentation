const els = {
  stage: document.getElementById("stage"),
  viewport: document.getElementById("viewport"),
  edges: document.getElementById("edges"),
  nodes: document.getElementById("nodes"),
};

/** Set by render() when the map is ready; slide 2 uses this for a one-shot layout refresh. */
let slideshowSlide2LayoutHook = /** @type {null | (() => void)} */ (null);

/** Set by initSlideshow(); exposes the goTo function for any code that needs to drive the deck. */
let applySlideDeck = /** @type {null | ((index: number) => void)} */ (null);

/** After Post-purchase Recharge reveals on the map slide, next empty canvas click shows merchant-only view. */
let upsellMerchantSoloArmNextCanvas = false;

/** After merchant-solo, next canvas click slides in two merchant clones. */
let merchantClonesArmed = false;

/** Called when leaving the map slide to remove any spawned merchant clones. */
let merchantCloneCleanup = /** @type {null | (() => void)} */ (null);

/** Slide 4 enter: focus on Pre-purchase + Loyalty, mute everything else. */
let slideshowEnterSlide4Hook = /** @type {null | (() => void)} */ (null);

/** Slide 4 leave: clear the slide 4 selection so it doesn't bleed into other slides. */
let slideshowLeaveSlide4Hook = /** @type {null | (() => void)} */ (null);

// Defensive: remove any stale hint element if present (e.g., old cached HTML).
document.getElementById("stageHint")?.remove();

const MERCHANT_LOGO_KEY = "merchantLogoDataUrl";
const MERCHANT_DEFAULT_LOGO_SRC = "./assets/merchant-logo.svg";
const NODE_CARD_IMAGE_KEY = "nodeCardImageDataUrlById";
const NODE_CARD_IMAGE_CLEANED_KEY = "nodeCardImageCleanedById";
const NODE_POSITIONS_KEY = "nodePositionsById";
/** Bump when default coordinates in data.json change so saved drags don’t mask the new layout. */
const GRAPH_LAYOUT_VERSION_KEY = "graphLayoutBaselineVersion";
const GRAPH_LAYOUT_VERSION = "mindmap-v14";
// Legacy keys from earlier iterations (for backwards compatibility)
const LEGACY_PERSONALIZATION_IMAGE_KEY = "personalizationCardImageDataUrl";
const LEGACY_PERSONALIZATION_IMAGE_CLEANED_KEY = "personalizationCardImageCleaned";
const DEFAULT_CARD_IMAGE_BY_NODE_ID = {
  personalization: "./assets/cards/personalization.png?v=1",
  ab: "./assets/cards/ab-testing-default.png?v=3",
  loyalty: "./assets/cards/loyalty-default.png?v=5",
  referral: "./assets/cards/referral.png?v=1",
  mail: "./assets/cards/mailing-sms.png?v=1",
  chat: "./assets/cards/customer-chat.png?v=1",
  ads: "./assets/cards/advertising.png?v=1",
  affiliates: "./assets/cards/affiliates.png?v=1",
  data: "./assets/cards/customer-data.png?v=1",
  quant: "./assets/cards/quant-analytics.png?v=1",
  qual: "./assets/cards/qual-analytics.png?v=1",
  crm: "./assets/cards/crm.png",
  subscriptions: "./assets/cards/recharge.jpg?v=3",
  reorder: "./assets/cards/upsell-cross-sell-default.png?v=2",
  upsell: "./assets/cards/post-purchase-default.png?v=2"
};

function getSavedNodePositions() {
  try {
    const raw = localStorage.getItem(NODE_POSITIONS_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

/** Anchor nodes are always sourced from data.json; never persist them. */
const SAVE_SKIP_IDS = new Set(["merchant", "repeat", "measure", "pre"]);

function saveNodePositionsFromGraph(graph) {
  try {
    /** @type {Record<string, {x:number,y:number}>} */
    const out = {};
    for (const n of graph.nodes) {
      if (SAVE_SKIP_IDS.has(n.id)) continue;
      out[n.id] = { x: n.pos.x, y: n.pos.y };
    }
    localStorage.setItem(NODE_POSITIONS_KEY, JSON.stringify(out));
  } catch {
    // ignore
  }
}

function getMerchantLogoDataUrl() {
  try {
    return localStorage.getItem(MERCHANT_LOGO_KEY);
  } catch {
    return null;
  }
}

function setMerchantLogoDataUrl(v) {
  try {
    if (!v) localStorage.removeItem(MERCHANT_LOGO_KEY);
    else localStorage.setItem(MERCHANT_LOGO_KEY, v);
  } catch {
    // ignore
  }
}

function getNodeCardImageDataUrl(nodeId) {
  try {
    const raw = localStorage.getItem(NODE_CARD_IMAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const v = obj?.[nodeId];
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

function setNodeCardImageDataUrl(nodeId, v) {
  try {
    const raw = localStorage.getItem(NODE_CARD_IMAGE_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    if (!v) delete obj[nodeId];
    else obj[nodeId] = v;
    localStorage.setItem(NODE_CARD_IMAGE_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function getNodeCardImageCleaned(nodeId) {
  try {
    const raw = localStorage.getItem(NODE_CARD_IMAGE_CLEANED_KEY);
    if (!raw) return false;
    const obj = JSON.parse(raw);
    return Boolean(obj?.[nodeId]);
  } catch {
    return false;
  }
}

function setNodeCardImageCleaned(nodeId, v) {
  try {
    const raw = localStorage.getItem(NODE_CARD_IMAGE_CLEANED_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[nodeId] = Boolean(v);
    localStorage.setItem(NODE_CARD_IMAGE_CLEANED_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function migrateLegacyPersonalizationImageIfNeeded() {
  try {
    const existing = getNodeCardImageDataUrl("personalization");
    if (existing) return;
    const legacy = localStorage.getItem(LEGACY_PERSONALIZATION_IMAGE_KEY);
    if (!legacy) return;
    setNodeCardImageDataUrl("personalization", legacy);
    const legacyCleaned = localStorage.getItem(LEGACY_PERSONALIZATION_IMAGE_CLEANED_KEY) === "true";
    if (legacyCleaned) setNodeCardImageCleaned("personalization", true);
  } catch {
    // ignore
  }
}

/** Drop stale uploads so the bundled Recharge logo wins (stored card used to override defaults). */
function migrateSubscriptionsCardToBundledAsset() {
  try {
    const flag = "subscriptionsBundledRechargeV1";
    if (localStorage.getItem(flag) === "1") return;
    setNodeCardImageDataUrl("subscriptions", null);
    const raw = localStorage.getItem(NODE_CARD_IMAGE_CLEANED_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object" && "subscriptions" in obj) {
        delete obj.subscriptions;
        localStorage.setItem(NODE_CARD_IMAGE_CLEANED_KEY, JSON.stringify(obj));
      }
    }
    localStorage.setItem(flag, "1");
  } catch {
    // ignore
  }
}

/** @param {HTMLElement} anchorEl */
function burstRechargeConfetti(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = [
    "#2563eb",
    "#4f46e5",
    "#7c3aed",
    "#c026d3",
    "#db2777",
    "#ea580c",
    "#ca8a04",
    "#16a34a",
    "#0d9488",
    "#0891b2"
  ];
  const count = 52;
  for (let i = 0; i < count; i++) {
    const bit = document.createElement("span");
    bit.className = "confettiBit";
    bit.style.background = colors[Math.floor(Math.random() * colors.length)];
    const w = 3 + Math.random() * 6;
    const h = w * (0.35 + Math.random() * 0.55);
    const theta = Math.random() * Math.PI * 2;
    const spread = 160 + Math.random() * 200;
    const dx = Math.cos(theta) * spread;
    const dy = Math.sin(theta) * spread - (90 + Math.random() * 140);
    const rot = (Math.random() - 0.5) * 1080;
    const ms = 880 + Math.floor(Math.random() * 420);
    bit.style.width = `${w}px`;
    bit.style.height = `${h}px`;
    bit.style.left = `${cx - w / 2}px`;
    bit.style.top = `${cy - h / 2}px`;
    bit.style.setProperty("--cdx", `${dx.toFixed(1)}px`);
    bit.style.setProperty("--cdy", `${dy.toFixed(1)}px`);
    bit.style.setProperty("--crot", `${rot.toFixed(1)}deg`);
    bit.style.animationDuration = `${ms}ms`;
    document.body.appendChild(bit);
    window.setTimeout(() => bit.remove(), ms + 60);
  }
}

/** @typedef {{id:string,label:string,color:string}} Category */
/** @typedef {{x:number,y:number}} Vec2 */
/** @typedef {{name:string,src:string}} Logo */
/** @typedef {{id:string,title:string,category:string,description:string,pos:Vec2,emoji?:string,emojiOnly?:boolean,emojiLabel?:string,tagLabel?:string,logos?:Logo[]}} Node */
/** @typedef {{categories:Category[],nodes:Node[],edges:[string,string][],canvas:{width:number,height:number}}} Graph */

/** @returns {Promise<Graph>} */
async function loadGraph() {
  const res = await fetch("./data.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load data.json (${res.status})`);
  return /** @type {Graph} */ (await res.json());
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function normText(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function sentenceCaseSmart(input) {
  const s = (input ?? "").toString();
  if (!s.trim()) return s;

  const trimmed = s.trim();
  // Keep "testing" lowercase (sentenceCaseSmart would otherwise title-case it after "A/B").
  if (/^a\/b\s+testing$/i.test(trimmed)) return "A/B testing";

  // Lowercase words, but preserve short ALL-CAPS tokens like CRM/SMS/UGC.
  const tokens = s.split(/(\s+)/);
  const lowered = tokens
    .map((t) => {
      if (/^\s+$/.test(t)) return t;
      if (/^[A-Z](?:\/[A-Z])+$/.test(t)) return t; // keep A/B style tokens
      if (/^[A-Z0-9&]{2,4}$/.test(t)) return t; // keep acronyms
      return t.toLowerCase();
    })
    .join("");

  // Uppercase the first alphabetical character.
  const idx = lowered.search(/[a-z]/);
  if (idx === -1) return lowered;
  return lowered.slice(0, idx) + lowered[idx].toUpperCase() + lowered.slice(idx + 1);
}

function stripTrailingParenthetical(s) {
  // Removes a trailing " ( ... )" group, e.g. "Personalization (A / B)" -> "Personalization"
  return (s ?? "").toString().replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = text;
  return n;
}

function svgEl(tag) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function tagColorForCategory(catId) {
  // Maps to CSS tag[data-color]
  return catId;
}

function computeNeighbors(edges) {
  /** @type {Map<string, Set<string>>} */
  const map = new Map();
  const add = (a, b) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a).add(b);
  };
  for (const [a, b] of edges) {
    add(a, b);
    add(b, a);
  }
  return map;
}

function edgePath(a, b) {
  const dx = b.x - a.x;
  // Near-vertical edges produce a degenerate cubic Bezier (control points equal endpoints)
  // which Safari can fail to render across the SVG viewBox boundary at y=0. Fall back to
  // a straight line in that case.
  if (Math.abs(dx) < 1) {
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }
  const c1 = { x: a.x + dx * 0.45, y: a.y };
  const c2 = { x: b.x - dx * 0.45, y: b.y };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
}

function approxNodeSize(nodeId) {
  // Must stay in sync with CSS sizes.
  if (nodeId === "merchant") return { w: 96, h: 96 };
  if (nodeId === "pre" || nodeId === "repeat" || nodeId === "measure") return { w: 220, h: 56 };
  if (nodeId === "chat") return { w: 162, h: 146 };
  // Any node with a custom card image becomes an "image card" size.
  if (getNodeCardImageDataUrl(nodeId)) return { w: 146, h: 116 };
  // Built-in image cards (some have defaults).
  if (nodeId === "personalization") return { w: 146, h: 116 };
  if (nodeId === "ab") return { w: 146, h: 116 };
  if (nodeId === "loyalty") return { w: 146, h: 116 };
  if (nodeId === "referral") return { w: 146, h: 116 };
  if (nodeId === "mail") return { w: 146, h: 116 };
  if (nodeId === "ads") return { w: 146, h: 116 };
  if (nodeId === "affiliates") return { w: 146, h: 116 };
  if (nodeId === "data") return { w: 146, h: 116 };
  if (nodeId === "crm") return { w: 158, h: 142 };
  if (nodeId === "subscriptions") return { w: 146, h: 116 };
  if (nodeId === "reorder" || nodeId === "upsell") return { w: 146, h: 116 };
  return { w: 170, h: 72 };
}

function layoutNoOverlap(graph, opts = {}) {
  const padding = opts.padding ?? 34; // target spacing between cards
  const iterations = opts.iterations ?? 220;
  const stiffness = opts.stiffness ?? 0.012; // pull toward initial positions
  const boundsPad = 18;
  const locks = opts.locks ?? {};

  const initial = new Map(graph.nodes.map((n) => [n.id, { x: n.pos.x, y: n.pos.y }]));

  for (let iter = 0; iter < iterations; iter++) {
    // Pairwise push-apart using AABB overlap resolution.
    for (let i = 0; i < graph.nodes.length; i++) {
      const a = graph.nodes[i];
      const sa = approxNodeSize(a.id);
      for (let j = i + 1; j < graph.nodes.length; j++) {
        const b = graph.nodes[j];
        const sb = approxNodeSize(b.id);

        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;

        const minX = (sa.w + sb.w) / 2 + padding;
        const minY = (sa.h + sb.h) / 2 + padding;

        const ox = minX - Math.abs(dx);
        const oy = minY - Math.abs(dy);
        if (ox <= 0 || oy <= 0) continue;

        // Push along the axis of least penetration (more stable).
        const lockA = locks[a.id] ?? {};
        const lockB = locks[b.id] ?? {};

        if (ox < oy) {
          const sx = dx >= 0 ? 1 : -1;
          const push = ox / 2;
          if (!lockA.lockX) a.pos.x -= sx * push;
          if (!lockB.lockX) b.pos.x += sx * push;
        } else {
          const sy = dy >= 0 ? 1 : -1;
          const push = oy / 2;
          if (!lockA.lockY) a.pos.y -= sy * push;
          if (!lockB.lockY) b.pos.y += sy * push;
        }
      }
    }

    // Gentle pull toward initial positions to keep structure recognizable.
    for (const n of graph.nodes) {
      const p0 = initial.get(n.id);
      if (!p0) continue;
      const lock = locks[n.id] ?? {};
      if (!lock.lockX) n.pos.x += (p0.x - n.pos.x) * stiffness;
      if (!lock.lockY) n.pos.y += (p0.y - n.pos.y) * stiffness;

      // Clamp within canvas bounds considering node size.
      const s = approxNodeSize(n.id);
      const minX = boundsPad + s.w / 2;
      const maxX = graph.canvas.width - boundsPad - s.w / 2;
      const minY = boundsPad + s.h / 2;
      const maxY = graph.canvas.height - boundsPad - s.h / 2;
      if (!lock.lockX) n.pos.x = clamp(n.pos.x, minX, maxX);
      if (!lock.lockY) n.pos.y = clamp(n.pos.y, minY, maxY);
    }
  }
}

function centerToTransform({ canvas, stageRect, targetWorld, scale }) {
  const viewCx = stageRect.width / 2;
  const viewCy = stageRect.height / 2;
  // Translate so that targetWorld (in world coords) is at the view center.
  const tx = viewCx - targetWorld.x * scale;
  const ty = viewCy - targetWorld.y * scale;
  return { x: tx, y: ty, scale };
}

function applyTransform(viewportEl, t) {
  viewportEl.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.scale})`;
}

function worldFromClient(stageEl, t, clientX, clientY) {
  const r = stageEl.getBoundingClientRect();
  const sx = clientX - r.left;
  const sy = clientY - r.top;
  return {
    x: (sx - t.x) / t.scale,
    y: (sy - t.y) / t.scale
  };
}

function clientFromWorld(stageEl, t, w) {
  const r = stageEl.getBoundingClientRect();
  return {
    x: r.left + t.x + w.x * t.scale,
    y: r.top + t.y + w.y * t.scale
  };
}

function animateTo(transformRef, viewportEl, next, ms = 420) {
  const start = { ...transformRef.current };
  const t0 = performance.now();
  const tick = (now) => {
    const p = clamp((now - t0) / ms, 0, 1);
    const e = easeOutCubic(p);
    transformRef.current = {
      x: lerp(start.x, next.x, e),
      y: lerp(start.y, next.y, e),
      scale: lerp(start.scale, next.scale, e)
    };
    applyTransform(viewportEl, transformRef.current);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// (Controls removed) The experience is map + details only.

function render(graph) {
  els.stage = document.getElementById("stage");
  els.viewport = document.getElementById("viewport");
  els.edges = document.getElementById("edges");
  els.nodes = document.getElementById("nodes");
  if (!els.stage || !els.viewport || !els.edges || !els.nodes) {
    console.error("render: map DOM (#stage / #viewport / #edges / #nodes) not found");
    return;
  }

  const categoryById = new Map(graph.categories.map((c) => [c.id, c]));
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const neighbors = computeNeighbors(graph.edges);
  const HUB_IDS = new Set(["repeat", "pre", "measure"]);

  try {
    if (localStorage.getItem(GRAPH_LAYOUT_VERSION_KEY) !== GRAPH_LAYOUT_VERSION) {
      localStorage.removeItem(NODE_POSITIONS_KEY);
      localStorage.setItem(GRAPH_LAYOUT_VERSION_KEY, GRAPH_LAYOUT_VERSION);
    }
  } catch {
    /* ignore */
  }

  // Save data.json positions for structural anchors before localStorage can override them.
  const ANCHOR_IDS = new Set(["merchant", "repeat", "measure", "pre"]);
  /** @type {Map<string, {x:number,y:number}>} */
  const anchorPositions = new Map(
    graph.nodes
      .filter((n) => ANCHOR_IDS.has(n.id))
      .map((n) => [n.id, { x: n.pos.x, y: n.pos.y }])
  );

  const savedPositions = getSavedNodePositions();
  let hasCustomLayout = false;
  if (savedPositions) {
    for (const n of graph.nodes) {
      if (ANCHOR_IDS.has(n.id)) continue; // anchors are always from data.json
      const p = savedPositions[n.id];
      if (!p || typeof p.x !== "number" || typeof p.y !== "number") continue;
      n.pos.x = p.x;
      n.pos.y = p.y;
      hasCustomLayout = true;
    }
  }

  // Always reset anchors to data.json positions (localStorage must never move them).
  for (const n of graph.nodes) {
    const a = anchorPositions.get(n.id);
    if (a) { n.pos.x = a.x; n.pos.y = a.y; }
  }

  if (!hasCustomLayout) {
    // Resolve overlaps while keeping the hub spine fixed (matches designed mind-map layout).
      layoutNoOverlap(graph, {
        padding: 34,
      iterations: 220,
      stiffness: 0.012,
      locks: {
        merchant: { lockX: true, lockY: true },
        repeat: { lockX: true, lockY: true },
        measure: { lockX: true, lockY: true },
        pre: { lockX: true, lockY: true }
      }
    });
    // When Advertising is *below* Customer chat, keep vertical clearance (skip same-row layouts).
    {
      const chat = nodeById.get("chat");
      const ads = nodeById.get("ads");
      if (chat && ads) {
        const a = approxNodeSize("chat");
        const b = approxNodeSize("ads");
        const gap = 28;
        const minDy = (a.h + b.h) / 2 + gap;
        const dy = ads.pos.y - chat.pos.y;
        if (dy > 8 && dy < minDy) {
          ads.pos.y = chat.pos.y + minDy;
          ads.pos.y += 12;
      layoutNoOverlap(graph, {
        padding: 34,
        iterations: 140,
        stiffness: 0.01,
            locks: { ads: { lockY: true } }
      });
    }
  }
    }
  }

  // Saved layouts: still align Repeat ↔ Measure and drop Pre-purchase below Merchant.
  {
    const repeat = nodeById.get("repeat");
    const measure = nodeById.get("measure");
    if (repeat && measure) {
      measure.pos.y = repeat.pos.y;
      layoutNoOverlap(graph, {
        padding: 34,
        iterations: 100,
        stiffness: 0.01,
        locks: { repeat: { lockY: true }, measure: { lockY: true } }
      });
    }
  }
  {
    const merchant = nodeById.get("merchant");
    const pre = nodeById.get("pre");
    if (merchant && pre) {
      const merchantR = 48;
      const hubHalfH = 28;
      const gapBelowMerchant = 52;
      const minPreY = merchant.pos.y + merchantR + gapBelowMerchant + hubHalfH;
      if (pre.pos.y < minPreY) pre.pos.y = minPreY;
      layoutNoOverlap(graph, {
        padding: 34,
        iterations: 100,
        stiffness: 0.01,
        locks: {
          pre: { lockY: true },
          repeat: { lockY: true },
          measure: { lockY: true }
        }
      });
    }
  }

  // SVG canvas space matches "world" space.
  els.edges.setAttribute("viewBox", `0 0 ${graph.canvas.width} ${graph.canvas.height}`);
  els.edges.setAttribute("preserveAspectRatio", "xMinYMin meet");
  els.edges.innerHTML = "";
  els.nodes.innerHTML = "";

  /** @type {Map<string, SVGPathElement>} */
  const edgeEls = new Map();
  for (const [aId, bId] of graph.edges) {
    const a = nodeById.get(aId);
    const b = nodeById.get(bId);
    if (!a || !b) continue;
    const p = /** @type {SVGPathElement} */ (svgEl("path"));
    p.setAttribute("d", edgePath(a.pos, b.pos));
    p.setAttribute("class", "edge");
    p.dataset.a = aId;
    p.dataset.b = bId;
    els.edges.appendChild(p);
    edgeEls.set(`${aId}__${bId}`, p);
  }

  /** @type {Map<string, HTMLButtonElement>} */
  const nodeEls = new Map();

  // Loyalty / A/B / repeat leaf cards → Recharge swap is session-only; full page refresh restores bundled main artwork.
  let loyaltyMainStripped = false;
  let loyaltyRechargeRevealUnlocked = false;

  let abMainStripped = false;
  let abRechargeRevealUnlocked = false;

  let reorderMainStripped = false;
  let reorderRechargeRevealUnlocked = false;

  let upsellMainStripped = false;
  let upsellRechargeRevealUnlocked = false;

  // Slide 4 Loyalty reroute state
  let slide4SubscriptionsRevealed = false;
  let slide4LoyaltyRerouted = false;
  /** @type {null | (() => void)} */
  let slide4RetentionCleanup = null;
  // Snapshot of Loyalty's pos in nodeById before reroute, so we can restore on leave/reset.
  /** @type {null | {x: number, y: number}} */
  let slide4PriorLoyaltyPos = null;
  // When true, slide 4 owns the Loyalty card's Recharge display —
  // syncLoyaltyRechargeStack() must not touch it.
  let slide4RechargeSwapActive = false;
  /**
   * Shared state container for Loyalty's "fanout" sub-nodes — populated by spawnLoyaltyFanout().
   *  - challenges: 5 dotted nodes shown when clicking Loyalty in the pre-reroute state
   *  - benefits:   4 dotted nodes shown when clicking Loyalty in the post-reroute state
   * Each slot holds its own cleanup, collapse, and in-flight animation flag.
   * @typedef {{cleanup: null | (()=>void), collapse: null | (()=>void), collapsing: boolean}} FanoutState
   * @type {{challenges: FanoutState, benefits: FanoutState}}
   */
  const slide4Fanouts = {
    challenges: { cleanup: null, collapse: null, collapsing: false },
    benefits:   { cleanup: null, collapse: null, collapsing: false },
  };
  // Snapshots of shared graph state taken before slide 4 modifies it, so slide 2 is unaffected.
  /** @type {Set<string> | null} */
  let slide4VisibleIdsSnapshot = null;
  /** @type {string | null | undefined} */
  let slide4SelectedIdSnapshot = undefined;

  for (const n of graph.nodes) {
    const cat = categoryById.get(n.category);
    const btn = /** @type {HTMLButtonElement} */ (el("button", "node"));
    btn.type = "button";
    btn.style.left = `${n.pos.x}px`;
    btn.style.top = `${n.pos.y}px`;
    btn.dataset.id = n.id;
    btn.dataset.category = n.category;
    btn.setAttribute("aria-label", `${n.title} node`);

    const isMerchant = n.id === "merchant";
    if (isMerchant) btn.classList.add("node--merchant");

      // Remove all trailing parenthetical contents per design.
      const displayTitle = stripTrailingParenthetical(n.title);
      const title = el("div", "node__title", sentenceCaseSmart(displayTitle));
      btn.appendChild(title);

    // Treat these as section hubs (bigger, cleaner style; no chips).
    const isHubSection = n.id === "pre" || n.id === "repeat" || n.id === "measure";
    if (isHubSection) {
      btn.classList.add("node--hub");
      btn.dataset.hub = "true";

      // Replace hub content with AnimatedTraitsList-style row.
      btn.innerHTML = "";
      const row = el("div", "hubRow");
      if (n.emoji) {
        if (n.emojiOnly) {
          const emojiOnly = el("span", "hubEmojiOnly", n.emoji);
          emojiOnly.setAttribute("aria-hidden", "true");
          row.appendChild(emojiOnly);
        } else {
          const tile = el("div", "hubEmojiTile");
          tile.setAttribute("aria-hidden", "true");
          const emoji = el("span", "hubEmoji", n.emoji);
          tile.appendChild(emoji);
          row.appendChild(tile);
        }
      }
      const text = el("div", "hubText", sentenceCaseSmart(n.emojiLabel ?? n.title));
      row.appendChild(text);
      btn.appendChild(row);
    } else {
      const bundled = DEFAULT_CARD_IMAGE_BY_NODE_ID[n.id] || null;
      const stored = getNodeCardImageDataUrl(n.id);
      const cardImageSrc =
        n.id === "subscriptions"
          ? bundled
          : n.id === "ab" || n.id === "loyalty" || n.id === "reorder" || n.id === "upsell"
            ? bundled || stored
            : stored || bundled;
      const isBuiltInImageCard =
        n.id === "personalization" ||
        n.id === "ab" ||
        n.id === "loyalty" ||
        n.id === "reorder" ||
        n.id === "upsell" ||
        n.id === "referral" ||
        n.id === "mail" ||
        n.id === "chat" ||
        n.id === "ads" ||
        n.id === "affiliates" ||
        n.id === "data" ||
        n.id === "quant" ||
        n.id === "qual" ||
        n.id === "crm" ||
        n.id === "subscriptions";
      const isImageCard = Boolean(cardImageSrc) || isBuiltInImageCard;
      // Default chip (skip for image cards per design).
      if (!isImageCard) {
        const meta = el("div", "node__meta");
        const tagText = n.tagLabel ?? cat?.label ?? n.category;
        const tag = el("span", "tag", sentenceCaseSmart(tagText));
        tag.dataset.color = tagColorForCategory(cat?.color ?? n.category);
        meta.appendChild(tag);
        btn.appendChild(meta);
      }

      // Image cards: single combined image
      if (isImageCard) {
        btn.classList.add("node--imageCard");
        if (cardImageSrc) {
          if (n.id === "loyalty") {
            const stack = el("div", "node__imageStack");
            const rechargeBundled = DEFAULT_CARD_IMAGE_BY_NODE_ID.subscriptions;
            const rechargeImg = /** @type {HTMLImageElement} */ (document.createElement("img"));
            rechargeImg.className = "node__comboLogo node__comboLogo--recharge";
            rechargeImg.src = rechargeBundled ?? "";
            rechargeImg.alt = "Recharge";
            rechargeImg.loading = "lazy";
            rechargeImg.decoding = "async";
            rechargeImg.hidden = true;
            rechargeImg.setAttribute("aria-hidden", "true");
            const mainImg = /** @type {HTMLImageElement} */ (document.createElement("img"));
            mainImg.className = "node__comboLogo";
            mainImg.alt = "Yotpo, Smile.io, and LoyaltyLion";
            mainImg.loading = "lazy";
            mainImg.decoding = "async";
            mainImg.src = cardImageSrc;
            mainImg.classList.add("node__comboLogo--loyaltyMain");
            stack.appendChild(rechargeImg);
            if (!loyaltyMainStripped) {
              stack.appendChild(mainImg);
            }
            btn.appendChild(stack);

            // Slide 4 demo: card hanger footer attached to the Loyalty card.
            // Visibility is controlled via CSS (viewport--slide4).
            const hanger = el("div", "cardHanger");
            const hangerLabel = el("span", "cardHanger__label", "Current framework");
            hanger.appendChild(hangerLabel);
            btn.appendChild(hanger);
          } else if (n.id === "ab" || n.id === "reorder" || n.id === "upsell") {
            const mainClass =
              n.id === "ab"
                ? "node__comboLogo--abMain"
                : n.id === "reorder"
                  ? "node__comboLogo--reorderMain"
                  : "node__comboLogo--upsellMain";
            const stripped =
              n.id === "ab" ? abMainStripped : n.id === "reorder" ? reorderMainStripped : upsellMainStripped;
            const mainAlt =
              n.id === "ab"
                ? "A/B testing tools"
                : n.id === "reorder"
                  ? "Repeat and REBUY"
                  : "AfterSell and CartHook";
            const stack = el("div", "node__imageStack");
            const rechargeBundled = DEFAULT_CARD_IMAGE_BY_NODE_ID.subscriptions;
            const rechargeImg = /** @type {HTMLImageElement} */ (document.createElement("img"));
            rechargeImg.className = "node__comboLogo node__comboLogo--recharge";
            rechargeImg.src = rechargeBundled ?? "";
            rechargeImg.alt = "Recharge";
            rechargeImg.loading = "lazy";
            rechargeImg.decoding = "async";
            rechargeImg.hidden = true;
            rechargeImg.setAttribute("aria-hidden", "true");
            const mainImg = /** @type {HTMLImageElement} */ (document.createElement("img"));
            mainImg.className = "node__comboLogo";
            mainImg.alt = mainAlt;
            mainImg.loading = "lazy";
            mainImg.decoding = "async";
            mainImg.src = cardImageSrc;
            mainImg.classList.add(mainClass);
            stack.appendChild(rechargeImg);
            if (!stripped) {
              stack.appendChild(mainImg);
            }
            btn.appendChild(stack);
          } else {
          const img = /** @type {HTMLImageElement} */ (document.createElement("img"));
          img.className = "node__comboLogo";
          img.alt =
              n.id === "referral"
                  ? "Referral tools"
                  : n.id === "mail"
                    ? "Mailing & SMS tools"
                    : n.id === "chat"
                      ? "Customer chat tools"
                      : n.id === "ads"
                        ? "Advertising channels"
                        : n.id === "affiliates"
                          ? "Affiliates & influencers tools"
                          : n.id === "data"
                            ? "Customer data"
                            : n.id === "quant"
                              ? "Quantitative analytics tools"
                              : n.id === "qual"
                                ? "Qualitative analytics tools"
                                : n.id === "crm"
                                  ? "CRM"
                                  : n.id === "subscriptions"
                                    ? "Recharge"
                  : "Personalization tools";
          img.loading = "lazy";
          img.decoding = "async";
          img.src = cardImageSrc;
          btn.appendChild(img);
        }
      }
      }
    }

    els.nodes.appendChild(btn);
    nodeEls.set(n.id, btn);
  }

  // Pan / zoom (also used for drag calculations)
  const transformRef = { current: { x: 0, y: 0, scale: 1 } };
  const minScale = 0.55;
  const maxScale = 2.0;

  // Progressive reveal state
  const visibleIds = new Set(["merchant"]);
  let rainActive = false;
  let rainDismissed = false;
  /** After emoji rain fully tears down, user may unlock Recharge by clicking Loyalty. */
  let emojiRainEndedForLoyalty = false;
  /** Tracks visible state so we only run pop + confetti on false → true. */
  let loyaltyRechargeRevealWasVisible = false;
  let abRechargeRevealWasVisible = false;
  let reorderRechargeRevealWasVisible = false;
  let upsellRechargeRevealWasVisible = false;
  /** @type {number | null} */
  let rainTeardownTimerId = null;
  /** Container waiting for delayed removal (cleared if rain restarts). */
  /** @type {HTMLDivElement | null} */
  let rainPendingRemoveEl = null;
  /** @type {HTMLDivElement | null} */
  let rainEl = null;
  /** @type {number | null} */
  let rainTimer = null;

  const stageWrapEl = els.stage?.closest?.(".stageWrap");
  const ensureRainEl = () => {
    if (!stageWrapEl) return;
    if (rainEl && rainEl.isConnected) return;
    rainEl = document.createElement("div");
    rainEl.className = "emojiRain";
    stageWrapEl.appendChild(rainEl);
  };

  const spawnEmoji = () => {
    if (!stageWrapEl) return;
    ensureRainEl();
    if (!rainEl) return;
    const wrapRect = stageWrapEl.getBoundingClientRect();
      const s = document.createElement("span");
      s.textContent = Math.random() < 0.65 ? "😭" : "😢";
      const left = Math.random() * Math.max(0, wrapRect.width - 24);
      const delay = Math.random() * 250;
      const dx = (Math.random() - 0.5) * 120;
      const rot = (Math.random() - 0.5) * 220;
      const dur = 2400 + Math.random() * 1400; // slower fall
      s.style.left = `${left}px`;
      s.style.animationDelay = `${delay}ms`;
      s.style.setProperty("--dur", `${dur.toFixed(0)}ms`);
      s.style.setProperty("--dx", `${dx.toFixed(1)}px`);
      s.style.setProperty("--rot", `${rot.toFixed(1)}deg`);
      rainEl.appendChild(s);

      // Remove the node after animation completes to avoid DOM buildup.
      const cleanupAfter = delay + dur + 200;
      window.setTimeout(() => s.remove(), cleanupAfter);
  };

  const startEmojiRain = () => {
    if (rainDismissed) return;
    if (rainActive) return;
    if (rainTeardownTimerId != null) {
      window.clearTimeout(rainTeardownTimerId);
      rainTeardownTimerId = null;
    }
    if (rainPendingRemoveEl) {
      rainPendingRemoveEl.remove();
      rainPendingRemoveEl = null;
    }
    emojiRainEndedForLoyalty = false;
    rainActive = true;
    ensureRainEl();
    syncLoyaltyRechargeStack();
    // Spawn rate: steady drizzle
    rainTimer = window.setInterval(() => {
      // sprinkle a couple per tick for density
      spawnEmoji();
      if (Math.random() < 0.6) spawnEmoji();
    }, 220);
  };

  const stopEmojiRain = () => {
    const wasRaining = rainActive || Boolean(rainEl);
    rainActive = false;
    if (rainTimer != null) {
      window.clearInterval(rainTimer);
      rainTimer = null;
    }
    // Let existing emojis finish; remove the container after a short grace period.
    if (rainEl) {
      const el = rainEl;
      rainEl = null;
      if (rainTeardownTimerId != null) {
        window.clearTimeout(rainTeardownTimerId);
        rainTeardownTimerId = null;
      }
      rainPendingRemoveEl = el;
      rainTeardownTimerId = window.setTimeout(() => {
        rainTeardownTimerId = null;
        el.remove();
        rainPendingRemoveEl = null;
        syncLoyaltyRechargeStack();
      }, 3500);
    }
    // "Rain concluded" for Loyalty/Recharge as soon as falling stops — not after the DOM delay.
    if (wasRaining) {
      emojiRainEndedForLoyalty = true;
      syncLoyaltyRechargeStack();
    }
  };

  const isWholeMapOnScreen = () => {
    // Only trigger once the entire map is revealed.
    if (visibleIds.size !== graph.nodes.length) return false;

    const stageRect = els.stage.getBoundingClientRect();
    const pad = 18;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of graph.nodes) {
      if (!visibleIds.has(n.id)) continue;
      const s = approxNodeSize(n.id);
      minX = Math.min(minX, n.pos.x - s.w / 2);
      maxX = Math.max(maxX, n.pos.x + s.w / 2);
      minY = Math.min(minY, n.pos.y - s.h / 2);
      maxY = Math.max(maxY, n.pos.y + s.h / 2);
    }
    if (!isFinite(minX) || !isFinite(minY)) return false;

    // Convert world bounds to screen bounds using current transform.
    const t = transformRef.current;
    const left = stageRect.left + t.x + minX * t.scale;
    const right = stageRect.left + t.x + maxX * t.scale;
    const top = stageRect.top + t.y + minY * t.scale;
    const bottom = stageRect.top + t.y + maxY * t.scale;

    return (
      left >= stageRect.left + pad &&
      top >= stageRect.top + pad &&
      right <= stageRect.right - pad &&
      bottom <= stageRect.bottom - pad
    );
  };

  const maybeRain = () => {
    if (rainDismissed) return;
    const shouldRain = state.selectedId == null && isWholeMapOnScreen();
    if (shouldRain) startEmojiRain();
    else stopEmojiRain();
  };

  // Any click on the canvas stops the rain and prevents it from starting again.
  els.stage.addEventListener(
    "pointerdown",
    () => {
      if (!rainActive) return;
      rainDismissed = true;
      stopEmojiRain();
    },
    { capture: true }
  );

  const reveal = (ids) => {
    let changed = false;
    for (const id of ids) {
      if (!visibleIds.has(id)) {
        visibleIds.add(id);
        changed = true;
      }
    }
    if (changed) applyFiltering();
    maybeRain();
  };

  // Dragging nodes
  let draggingNodeId = /** @type {string | null} */ (null);
  let draggingPointerId = /** @type {number | null} */ (null);
  let dragOffset = /** @type {{x:number,y:number} | null} */ (null);
  let dragStartClient = /** @type {{x:number,y:number} | null} */ (null);
  let didDrag = false;
  let suppressNextClick = false;
  let pendingDragNodeId = /** @type {string | null} */ (null);
  let pendingDragPointerId = /** @type {number | null} */ (null);
  let pendingDragOffset = /** @type {{x:number,y:number} | null} */ (null);
  let pendingDragStartClient = /** @type {{x:number,y:number} | null} */ (null);

  const updateAllEdges = () => {
    for (const p of /** @type {NodeListOf<SVGPathElement>} */ (els.edges.querySelectorAll(".edge"))) {
      const aId = p.dataset.a;
      const bId = p.dataset.b;
      if (!aId || !bId) continue;
      const a = nodeById.get(aId);
      const b = nodeById.get(bId);
      if (!a || !b) continue;
      p.setAttribute("d", edgePath(a.pos, b.pos));
    }
  };

  const armNodeDrag = (nodeId, e) => {
    const n = nodeById.get(nodeId);
    if (!n) return;
    const world = worldFromClient(els.stage, transformRef.current, e.clientX, e.clientY);
    pendingDragNodeId = nodeId;
    pendingDragPointerId = e.pointerId;
    pendingDragStartClient = { x: e.clientX, y: e.clientY };
    pendingDragOffset = { x: world.x - n.pos.x, y: world.y - n.pos.y };
  };

  const beginNodeDragFromPending = () => {
    if (!pendingDragNodeId || pendingDragPointerId == null || !pendingDragOffset || !pendingDragStartClient) return;
    draggingNodeId = pendingDragNodeId;
    draggingPointerId = pendingDragPointerId;
    dragOffset = pendingDragOffset;
    dragStartClient = pendingDragStartClient;
    didDrag = false;
    // Only capture once we actually start dragging, so clicks remain reliable.
    try {
      els.stage.setPointerCapture(draggingPointerId);
    } catch {
      // ignore
    }
  };

  const clearPendingDrag = () => {
    pendingDragNodeId = null;
    pendingDragPointerId = null;
    pendingDragOffset = null;
    pendingDragStartClient = null;
  };

  const endNodeDrag = () => {
    if (!draggingNodeId) return;
    if (didDrag) {
      suppressNextClick = true;
      saveNodePositionsFromGraph(graph);
    }
    draggingNodeId = null;
    draggingPointerId = null;
    dragOffset = null;
    dragStartClient = null;
    didDrag = false;
    clearPendingDrag();
  };

  for (const [id, btn] of nodeEls.entries()) {
    btn.addEventListener("pointerdown", (e) => {
      if (!(e instanceof PointerEvent)) return;
      if (e.button !== 0) return;
      armNodeDrag(id, e);
    });
  }

  const state = {
    selectedId: /** @type {string | null} */ (null),
    activeCategory: "all",
    search: ""
  };

  function persistLoyaltyMainStripped() {
    loyaltyMainStripped = true;
  }

  function persistAbMainStripped() {
    abMainStripped = true;
  }

  function persistReorderMainStripped() {
    reorderMainStripped = true;
  }

  function persistUpsellMainStripped() {
    upsellMainStripped = true;
  }

  function exitLoyaltyMainArtwork(loyaltyBtn) {
    if (!(loyaltyBtn instanceof HTMLElement)) return;
    const main = loyaltyBtn.querySelector(".node__comboLogo--loyaltyMain");
    if (!(main instanceof HTMLElement)) return;
    if (main.dataset.loyaltyMainExiting === "1") return;
    main.dataset.loyaltyMainExiting = "1";
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      main.remove();
      persistLoyaltyMainStripped();
      return;
    }
    main.classList.add("node__comboLogo--loyaltyMainExit");
    main.addEventListener(
      "animationend",
      () => {
        main.remove();
        persistLoyaltyMainStripped();
      },
      { once: true }
    );
  }

  function exitAbMainArtwork(abBtn) {
    if (!(abBtn instanceof HTMLElement)) return;
    const main = abBtn.querySelector(".node__comboLogo--abMain");
    if (!(main instanceof HTMLElement)) return;
    if (main.dataset.abMainExiting === "1") return;
    main.dataset.abMainExiting = "1";
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      main.remove();
      persistAbMainStripped();
      return;
    }
    main.classList.add("node__comboLogo--loyaltyMainExit");
    main.addEventListener(
      "animationend",
      () => {
        main.remove();
        persistAbMainStripped();
      },
      { once: true }
    );
  }

  function exitReorderMainArtwork(reorderBtn) {
    if (!(reorderBtn instanceof HTMLElement)) return;
    const main = reorderBtn.querySelector(".node__comboLogo--reorderMain");
    if (!(main instanceof HTMLElement)) return;
    if (main.dataset.reorderMainExiting === "1") return;
    main.dataset.reorderMainExiting = "1";
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      main.remove();
      persistReorderMainStripped();
      return;
    }
    main.classList.add("node__comboLogo--loyaltyMainExit");
    main.addEventListener(
      "animationend",
      () => {
        main.remove();
        persistReorderMainStripped();
      },
      { once: true }
    );
  }

  function exitUpsellMainArtwork(upsellBtn) {
    if (!(upsellBtn instanceof HTMLElement)) return;
    const main = upsellBtn.querySelector(".node__comboLogo--upsellMain");
    if (!(main instanceof HTMLElement)) return;
    if (main.dataset.upsellMainExiting === "1") return;
    main.dataset.upsellMainExiting = "1";
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      main.remove();
      persistUpsellMainStripped();
      return;
    }
    main.classList.add("node__comboLogo--loyaltyMainExit");
    main.addEventListener(
      "animationend",
      () => {
        main.remove();
        persistUpsellMainStripped();
      },
      { once: true }
    );
  }

  function syncLoyaltyRechargeStack() {
    // Slide 4 manages the Loyalty card's Recharge display independently; don't interfere.
    if (slide4RechargeSwapActive) return;
    const btn = nodeEls.get("loyalty");
    if (!btn) return;
    const recharge = btn.querySelector(".node__comboLogo--recharge");
    if (!(recharge instanceof HTMLImageElement)) return;
    const show = loyaltyRechargeRevealUnlocked;

    if (!show) {
      recharge.hidden = true;
      recharge.setAttribute("aria-hidden", "true");
      recharge.classList.remove("node__comboLogo--recharge--pop");
      loyaltyRechargeRevealWasVisible = false;
      return;
    }

    recharge.hidden = false;
    recharge.setAttribute("aria-hidden", "false");

    if (!loyaltyRechargeRevealWasVisible) {
      recharge.classList.remove("node__comboLogo--recharge--pop");
      void recharge.offsetWidth;
      recharge.classList.add("node__comboLogo--recharge--pop");
      const reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
      if (!reducedMotion) {
        burstRechargeConfetti(recharge);
      }
      // After Recharge pops in, animate out the default brand stack so only Recharge remains.
      if (!loyaltyMainStripped) {
        const loyaltyBtn = btn;
        if (reducedMotion) {
          window.setTimeout(() => exitLoyaltyMainArtwork(loyaltyBtn), 200);
        } else {
          const mainExitFallbackId = window.setTimeout(() => exitLoyaltyMainArtwork(loyaltyBtn), 1400);
          recharge.addEventListener(
            "animationend",
            () => {
              window.clearTimeout(mainExitFallbackId);
              window.setTimeout(() => exitLoyaltyMainArtwork(loyaltyBtn), 200);
            },
            { once: true }
          );
        }
      }
    }
    loyaltyRechargeRevealWasVisible = true;
  }

  function syncAbRechargeStack() {
    const btn = nodeEls.get("ab");
    if (!btn) return;
    const recharge = btn.querySelector(".node__comboLogo--recharge");
    if (!(recharge instanceof HTMLImageElement)) return;
    const show = abRechargeRevealUnlocked;

    if (!show) {
      recharge.hidden = true;
      recharge.setAttribute("aria-hidden", "true");
      recharge.classList.remove("node__comboLogo--recharge--pop");
      abRechargeRevealWasVisible = false;
      return;
    }

    recharge.hidden = false;
    recharge.setAttribute("aria-hidden", "false");

    if (!abRechargeRevealWasVisible) {
      recharge.classList.remove("node__comboLogo--recharge--pop");
      void recharge.offsetWidth;
      recharge.classList.add("node__comboLogo--recharge--pop");
      const reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
      if (!reducedMotion) {
        burstRechargeConfetti(recharge);
      }
      if (!abMainStripped) {
        const abBtn = btn;
        if (reducedMotion) {
          window.setTimeout(() => exitAbMainArtwork(abBtn), 200);
        } else {
          const mainExitFallbackId = window.setTimeout(() => exitAbMainArtwork(abBtn), 1400);
          recharge.addEventListener(
            "animationend",
            () => {
              window.clearTimeout(mainExitFallbackId);
              window.setTimeout(() => exitAbMainArtwork(abBtn), 200);
            },
            { once: true }
          );
        }
      }
    }
    abRechargeRevealWasVisible = true;
  }

  function syncReorderRechargeStack() {
    const btn = nodeEls.get("reorder");
    if (!btn) return;
    const recharge = btn.querySelector(".node__comboLogo--recharge");
    if (!(recharge instanceof HTMLImageElement)) return;
    const show = reorderRechargeRevealUnlocked;

    if (!show) {
      recharge.hidden = true;
      recharge.setAttribute("aria-hidden", "true");
      recharge.classList.remove("node__comboLogo--recharge--pop");
      reorderRechargeRevealWasVisible = false;
      return;
    }

    recharge.hidden = false;
    recharge.setAttribute("aria-hidden", "false");

    if (!reorderRechargeRevealWasVisible) {
      recharge.classList.remove("node__comboLogo--recharge--pop");
      void recharge.offsetWidth;
      recharge.classList.add("node__comboLogo--recharge--pop");
      const reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
      if (!reducedMotion) {
        burstRechargeConfetti(recharge);
      }
      if (!reorderMainStripped) {
        const reorderBtn = btn;
        if (reducedMotion) {
          window.setTimeout(() => exitReorderMainArtwork(reorderBtn), 200);
        } else {
          const mainExitFallbackId = window.setTimeout(() => exitReorderMainArtwork(reorderBtn), 1400);
          recharge.addEventListener(
            "animationend",
            () => {
              window.clearTimeout(mainExitFallbackId);
              window.setTimeout(() => exitReorderMainArtwork(reorderBtn), 200);
            },
            { once: true }
          );
        }
      }
    }
    reorderRechargeRevealWasVisible = true;
  }

  function syncUpsellRechargeStack() {
    const btn = nodeEls.get("upsell");
    if (!btn) return;
    const recharge = btn.querySelector(".node__comboLogo--recharge");
    if (!(recharge instanceof HTMLImageElement)) return;
    const show = upsellRechargeRevealUnlocked;

    if (!show) {
      recharge.hidden = true;
      recharge.setAttribute("aria-hidden", "true");
      recharge.classList.remove("node__comboLogo--recharge--pop");
      upsellRechargeRevealWasVisible = false;
      return;
    }

    recharge.hidden = false;
    recharge.setAttribute("aria-hidden", "false");

    if (!upsellRechargeRevealWasVisible) {
      recharge.classList.remove("node__comboLogo--recharge--pop");
      void recharge.offsetWidth;
      recharge.classList.add("node__comboLogo--recharge--pop");
      const reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
      if (!reducedMotion) {
        burstRechargeConfetti(recharge);
      }
      if (!upsellMainStripped) {
        const upsellBtn = btn;
        if (reducedMotion) {
          window.setTimeout(() => exitUpsellMainArtwork(upsellBtn), 200);
        } else {
          const mainExitFallbackId = window.setTimeout(() => exitUpsellMainArtwork(upsellBtn), 1400);
          recharge.addEventListener(
            "animationend",
            () => {
              window.clearTimeout(mainExitFallbackId);
              window.setTimeout(() => exitUpsellMainArtwork(upsellBtn), 200);
            },
            { once: true }
          );
        }
      }
    }
    upsellRechargeRevealWasVisible = true;
  }

  function connectedSet(id) {
    const set = new Set([id]);
    for (const v of neighbors.get(id) ?? []) set.add(v);
    return set;
  }

  function setEdgeClasses(activeIds) {
    for (const p of /** @type {NodeListOf<SVGPathElement>} */ (els.edges.querySelectorAll(".edge"))) {
      const a = p.dataset.a;
      const b = p.dataset.b;
      const hidden = (a && !visibleIds.has(a)) || (b && !visibleIds.has(b));
      const active = activeIds && a && b && activeIds.has(a) && activeIds.has(b);
      p.classList.toggle("edge--active", Boolean(active));
      p.classList.toggle("edge--muted", Boolean(activeIds) && !active);
      p.classList.toggle("edge--hidden", Boolean(hidden));
    }
  }

  function applyFiltering() {
    const q = normText(state.search);
    const cat = state.activeCategory;
    const selected = state.selectedId;
    const activeIds = selected ? connectedSet(selected) : null;

    // On slide 4, Merchant is always the visible root — never let it be muted.
    if (activeIds && els.viewport.classList.contains("viewport--slide4")) {
      activeIds.add("merchant");
    }

    for (const n of graph.nodes) {
      const eln = nodeEls.get(n.id);
      if (!eln) continue;
      const hidden = !visibleIds.has(n.id);
      eln.dataset.hidden = String(hidden);
      const matchesCat = cat === "all" ? true : n.category === cat;
      const matchesSearch = !q ? true : normText(n.title).includes(q);
      const matchesSelection = activeIds ? activeIds.has(n.id) : true;
      const muted = hidden ? true : !(matchesCat && matchesSearch && matchesSelection);
      eln.dataset.muted = String(muted);
      eln.dataset.selected = String(n.id === selected);
    }

    // Edges only react to selection (keep search/category lightweight).
    setEdgeClasses(activeIds);
    syncLoyaltyRechargeStack();
    syncAbRechargeStack();
    syncReorderRechargeStack();
    syncUpsellRechargeStack();
  }

  function setSelected(id) {
    state.selectedId = id;
    applyFiltering();
    // Start raining only after you've unselected (no node selected).
    maybeRain();
  }

  els.nodes.addEventListener("click", (e) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    const t = /** @type {HTMLElement | null} */ (e.target instanceof HTMLElement ? e.target : null);
    // Hanger clicks open a modal — do not treat them as node selection,
    // which would call applyFiltering() → syncLoyaltyRechargeStack() and undo the slide-4 swap.
    if (t?.closest?.(".cardHanger")) return;
    const btn = t?.closest?.(".node");
    if (!(btn instanceof HTMLButtonElement)) return;
    const id = btn.dataset.id || null;
    // Synthetic slide-4 fanout nodes (challenges + benefits) are decorative —
    // clicks should not change selection.
    if (id?.startsWith("challenge-") || id?.startsWith("benefit-")) return;
    if (id === "merchant") {
      reveal(["repeat", "pre", "measure"]);
    } else if (id && HUB_IDS.has(id)) {
      const onSlide4 = window.slideshowPagination?.index === 3;
      if (id === "repeat" && onSlide4) {
        // Slide 4 demo: clicking Repeat purchase reveals only Subscriptions.
        reveal(["subscriptions"]);
        slide4SubscriptionsRevealed = true;
      } else if (id === "pre" && onSlide4) {
        // Slide 4 demo: Pre-purchase only ever shows Loyalty (already revealed on entry).
        reveal(["loyalty"]);
      } else if (id === "measure" && onSlide4) {
        // Slide 4 demo: Measure performance has no expanded children.
        // No-op reveal — keeps the slide's controlled state.
      } else {
        const kids = [...(neighbors.get(id) ?? [])].filter((x) => x !== "merchant");
        reveal(kids);
      }
    }
    setSelected(id);
    // Slide 4: clicking Subscriptions (after it has been revealed) triggers the Loyalty reroute.
    if (id === "subscriptions" && window.slideshowPagination?.index === 3 &&
        slide4SubscriptionsRevealed && !slide4LoyaltyRerouted) {
      rerouteLoyaltyToRetention();
    }
    // Slide 4 Loyalty toggle: pre-reroute fans out 5 "challenges", post-reroute fans
    // out 4 "benefits". A second click on Loyalty collapses whichever set is showing.
    if (id === "loyalty" && window.slideshowPagination?.index === 3) {
      const fan = slide4LoyaltyRerouted ? slide4Fanouts.benefits : slide4Fanouts.challenges;
      const spawn = slide4LoyaltyRerouted ? spawnLoyaltyBenefits : spawnLoyaltyChallenges;
      if (!fan.collapsing) {
        if (fan.cleanup) fan.collapse?.();
        else spawn();
      }
    }
    // Loyalty click after rain: Recharge pops + confetti; main artwork exits automatically after the pop.
    if (id === "loyalty" && emojiRainEndedForLoyalty && !loyaltyRechargeRevealUnlocked) {
      loyaltyRechargeRevealUnlocked = true;
      syncLoyaltyRechargeStack();
    }
    if (id === "ab" && !abRechargeRevealUnlocked) {
      abRechargeRevealUnlocked = true;
      syncAbRechargeStack();
    }
    if (id === "reorder" && !reorderRechargeRevealUnlocked) {
      reorderRechargeRevealUnlocked = true;
      syncReorderRechargeStack();
    }
    if (id === "upsell" && !upsellRechargeRevealUnlocked) {
      upsellRechargeRevealUnlocked = true;
      syncUpsellRechargeStack();
      upsellMerchantSoloArmNextCanvas = true;
    }
  });

  function resetView(animate = true) {
    let r = els.stage.getBoundingClientRect();
    // If stage has no layout yet (e.g. first render while slide is opacity:0),
    // fall back to viewport minus known padding so nodes are never off-screen.
    if (r.width === 0 || r.height === 0) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      r = { left: 18, top: 18, width: Math.max(vw - 36, 200), height: Math.max(vh - 70, 200) };
    }
    const next = centerToTransform({
      canvas: graph.canvas,
      stageRect: r,
      targetWorld: { x: graph.canvas.width / 2, y: graph.canvas.height / 2 },
      scale: 1
    });
    if (animate) animateTo(transformRef, els.viewport, next, 420);
    else {
      transformRef.current = next;
      applyTransform(els.viewport, next);
    }
  }

  // Initial sizing: make viewport match canvas world size.
  els.viewport.style.width = `${graph.canvas.width}px`;
  els.viewport.style.height = `${graph.canvas.height}px`;

  resetView(false);
  applyFiltering();
  maybeRain();

  // Map initializes while slide 2 may be hidden — rect is 0×0. Re-measure when that slide is shown.
  slideshowSlide2LayoutHook = () => {
    requestAnimationFrame(() => {
      resetView(false);
    });
  };


  // ── Slide 4: Loyalty reroute to Retention ────────────────────────────────
  // Vertical chain ABOVE Subscriptions: Loyalty (top) ↑ Retention ↑ Subscriptions (bottom).
  // Positions are computed at click-time from Subscriptions' live pos so the chain stays
  // vertically aligned even if the user has dragged Subscriptions to a custom position.
  const RETENTION_OFFSET_Y = -160;  // Retention sits this far above Subscriptions
  const LOYALTY_OFFSET_Y   = -320;  // Loyalty sits this far above Subscriptions
  // Original Loyalty world position (must match data.json pos).
  const LOYALTY_ORIGIN_POS   = { x: 180, y: 685 };

  /**
   * Slide 4: when Loyalty (still connected to Pre-purchase) is clicked, fan out 5 dashed
   * "challenge" nodes describing the current loyalty framework's shortcomings. The nodes
   * shoot from Loyalty's position outward and are cleaned up on reroute or slide leave.
   */
  /**
   * Generic Loyalty fanout spawner. Used by both Loyalty-click expansions:
   *   pre-reroute → "challenges" (downward fan, 5 nodes)
   *   post-reroute → "benefits"  (upward fan, 4 nodes)
   * Installs cleanup + collapse handlers onto the supplied state slot, and pans the
   * camera midway between Loyalty and the far edge of the fan.
   *
   * @param {object} cfg
   * @param {FanoutState} cfg.state - slot to populate with cleanup/collapse/collapsing
   * @param {Array<{id:string,title:string,angle:number}>} cfg.items - one entry per node (angles in degrees, 0°=right / 90°=down)
   * @param {number} cfg.radius
   */
  const spawnLoyaltyFanout = ({ state, items, radius }) => {
    if (state.cleanup) return;
    const loyaltyBtn = nodeEls.get("loyalty");
    const loyaltyNode = nodeById.get("loyalty");
    if (!loyaltyBtn || !loyaltyNode) return;
    const origin = { x: loyaltyNode.pos.x, y: loyaltyNode.pos.y };
    // Snapshot the camera transform so collapse can pan back to the same view.
    const transformBeforeSpawn = { ...transformRef.current };

    /** @type {HTMLButtonElement[]} */
    const createdNodes = [];
    /** @type {SVGPathElement[]} */
    const createdEdges = [];
    /** Track each node's target world pos so collapse + pan can compute geometry. */
    const targetPositions = items.map((it) => {
      const rad = (it.angle * Math.PI) / 180;
      return { x: origin.x + radius * Math.cos(rad), y: origin.y + radius * Math.sin(rad) };
    });

    items.forEach((c, i) => {
      const { x, y } = targetPositions[i];

      // Register synthetic node so updateAllEdges() can keep its connector tracking Loyalty.
      nodeById.set(c.id, /** @type {any} */ ({
        id: c.id, category: "pre", title: c.title, pos: { x, y },
      }));
      visibleIds.add(c.id);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "node node--challenge";
      btn.dataset.id = c.id;
      btn.dataset.muted = "false";
      btn.dataset.hidden = "false";
      btn.style.left = `${x}px`;
      btn.style.top  = `${y}px`;
      btn.setAttribute("aria-label", c.title);

      // Dotted outline rendered as an inline SVG so the dot rhythm matches the connectors.
      const ns = "http://www.w3.org/2000/svg";
      const outline = document.createElementNS(ns, "svg");
      outline.setAttribute("class", "node__dotOutline");
      outline.setAttribute("aria-hidden", "true");
      outline.setAttribute("preserveAspectRatio", "none");
      outline.appendChild(document.createElementNS(ns, "rect"));
      btn.appendChild(outline);

      // Title sits above the outline (z-index in CSS).
      const label = document.createElement("span");
      label.className = "node__challengeLabel";
      label.textContent = c.title;
      btn.appendChild(label);

      // Start visually anchored to Loyalty's center, scaled down + invisible.
      const dx = origin.x - x;
      const dy = origin.y - y;
      btn.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.4)`;
      btn.style.opacity = "0";

      els.nodes.appendChild(btn);
      createdNodes.push(btn);

      // Stagger reveal — fly to target.
      const delay = 80 + i * 90;
      window.setTimeout(() => {
        btn.style.transform = "translate(-50%, -50%) scale(1)";
        btn.style.opacity = "1";
      }, delay);

      // Dotted connector edge from Loyalty to this sub-node.
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("class", "edge edge--challenge");
      p.dataset.a = "loyalty";
      p.dataset.b = c.id;
      p.setAttribute("d", edgePath(origin, { x, y }));
      p.setAttribute("stroke", "rgba(0, 0, 0, 0.34)");
      p.setAttribute("stroke-width", "1");
      p.setAttribute("stroke-dasharray", "0.1 5");
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("fill", "none");
      p.style.opacity = "0";
      p.style.transition = "opacity 320ms ease";
      els.edges.appendChild(p);
      createdEdges.push(p);
      window.setTimeout(() => { p.style.opacity = "1"; }, delay + 200);
    });

    // Pan the canvas so the fan comes into view alongside Loyalty. We center on the
    // mean y of the fan's target positions — works for both downward and upward fans.
    const stageR = els.stage.getBoundingClientRect();
    if (stageR.width > 0 && stageR.height > 0) {
      const meanY = targetPositions.reduce((s, p) => s + p.y, 0) / targetPositions.length;
      const panTargetY = (origin.y + meanY) / 2;
      const panTarget = centerToTransform({
        canvas: graph.canvas,
        stageRect: stageR,
        targetWorld: { x: origin.x, y: panTargetY },
        scale: 1,
      });
      animateTo(transformRef, els.viewport, panTarget, 700);
    }

    state.cleanup = () => {
      for (const n of createdNodes) n.remove();
      for (const e of createdEdges) e.remove();
      for (const c of items) {
        nodeById.delete(c.id);
        visibleIds.delete(c.id);
      }
      state.cleanup = null;
      state.collapse = null;
      state.collapsing = false;
    };

    // Animated reverse: nodes shrink back to Loyalty, edges fade out, camera pans back.
    state.collapse = () => {
      if (state.collapsing || !state.cleanup) return;
      state.collapsing = true;

      items.forEach((_c, i) => {
        const node = createdNodes[i];
        if (!node) return;
        const dx = origin.x - parseFloat(node.style.left);
        const dy = origin.y - parseFloat(node.style.top);
        node.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.4)`;
        node.style.opacity = "0";
      });
      for (const p of createdEdges) p.style.opacity = "0";

      // Pan the camera back to the pre-spawn view.
      animateTo(transformRef, els.viewport, transformBeforeSpawn, 700);

      // Final teardown after the transition finishes (matches the 700ms node transition).
      window.setTimeout(() => state.cleanup?.(), 720);
    };
  };

  /**
   * Pre-reroute Loyalty click: 5 dotted "challenges" describing what's wrong with the
   * current loyalty framework. Fan opens downward (angles in the lower hemisphere).
   * Radius 380 gives ~197px adjacent center-to-center for the 30° spacing — no overlap.
   */
  const spawnLoyaltyChallenges = () => spawnLoyaltyFanout({
    state: slide4Fanouts.challenges,
    radius: 380,
    items: [
      { id: "challenge-1", title: "One-time purchase focus",     angle: 150 },
      { id: "challenge-2", title: "Lack of customization",       angle: 130 },
      { id: "challenge-3", title: "No milestone-based journeys", angle:  90 },
      { id: "challenge-4", title: "Point hoarding",              angle:  50 },
      { id: "challenge-5", title: "Subscribers don\u2019t feel engaged", angle: 30 },
    ],
  });

  /**
   * Post-reroute Loyalty click: 4 dotted "benefits" describing what merchants want
   * from the new framework. Fan opens upward (angles in the upper hemisphere, i.e. 180°–360°).
   * 4 nodes 45° apart spanning 135° — adjacent center-to-center with R=380 is ~291px.
   */
  const spawnLoyaltyBenefits = () => spawnLoyaltyFanout({
    state: slide4Fanouts.benefits,
    radius: 380,
    items: [
      { id: "benefit-1", title: "Subscription based milestones",      angle: 202.5 },
      { id: "benefit-2", title: "Customizable reward incentives",     angle: 247.5 },
      { id: "benefit-3", title: "Engagement tool",                    angle: 292.5 },
      { id: "benefit-4", title: "Relationship building",              angle: 337.5 },
    ],
  });

  const rerouteLoyaltyToRetention = () => {
    slide4LoyaltyRerouted = true;
    // Clean up the dotted challenge nodes (if shown) before Loyalty starts moving.
    slide4Fanouts.challenges.cleanup?.();
    const loyaltyBtn = nodeEls.get("loyalty");
    if (!loyaltyBtn) return;

    // Update hanger label and hide it — it reappears only after the Recharge animation.
    const hangerEl      = /** @type {HTMLElement|null} */ (loyaltyBtn.querySelector(".cardHanger"));
    const hangerLabelEl = loyaltyBtn.querySelector(".cardHanger__label");
    if (hangerLabelEl) hangerLabelEl.textContent = "New framework";
    if (hangerEl) hangerEl.style.setProperty("display", "none");

    // Anchor Retention + Loyalty directly above Subscriptions's current position.
    const subscriptionsNode = nodeById.get("subscriptions");
    const subX = subscriptionsNode?.pos.x ?? 425;
    const subY = subscriptionsNode?.pos.y ?? 95;
    const RETENTION_POS        = { x: subX, y: subY + RETENTION_OFFSET_Y };
    const LOYALTY_REROUTED_POS = { x: subX, y: subY + LOYALTY_OFFSET_Y };

    // 1. Fade out the pre→loyalty edge inline (overrides the CSS force-visible rule)
    const preLoyaltyEdge = /** @type {SVGPathElement | null} */ (
      els.edges.querySelector('.edge[data-a="pre"][data-b="loyalty"]') ??
      els.edges.querySelector('.edge[data-a="loyalty"][data-b="pre"]')
    );
    if (preLoyaltyEdge) {
      preLoyaltyEdge.style.setProperty("transition", "opacity 350ms ease");
      requestAnimationFrame(() => preLoyaltyEdge.style.setProperty("opacity", "0", "important"));
    }
    els.viewport.classList.add("viewport--slide4-rerouted");

    // 2. Slide Loyalty card to its new position. Hanger stays visible.
    //    Also update Loyalty's pos in nodeById so updateAllEdges (called during drag)
    //    tracks the new location for any edges connected to Loyalty.
    loyaltyBtn.classList.add("node--slide4-moving");
    requestAnimationFrame(() => {
      loyaltyBtn.style.left = `${LOYALTY_REROUTED_POS.x}px`;
      loyaltyBtn.style.top  = `${LOYALTY_REROUTED_POS.y}px`;
    });
    const loyaltyNode = nodeById.get("loyalty");
    if (loyaltyNode && slide4PriorLoyaltyPos === null) {
      slide4PriorLoyaltyPos = { x: loyaltyNode.pos.x, y: loyaltyNode.pos.y };
      loyaltyNode.pos.x = LOYALTY_REROUTED_POS.x;
      loyaltyNode.pos.y = LOYALTY_REROUTED_POS.y;
    }
    // Pan viewport up immediately so Loyalty's destination is in view as it slides.
    // Center on the chain's x and roughly the middle of the vertical span.
    const stageR0 = els.stage.getBoundingClientRect();
    if (stageR0.width > 0 && stageR0.height > 0) {
      const panTarget = centerToTransform({
        canvas: graph.canvas,
        stageRect: stageR0,
        targetWorld: { x: subX, y: subY + RETENTION_OFFSET_Y },
        scale: 1,
      });
      animateTo(transformRef, els.viewport, panTarget, 700);
    }

    // 3. Recharge swap using the existing pop animation.
    //    Show Recharge with .recharge--pop, then animate main artwork out via .loyaltyMainExit.
    //    We do this in slide-4-isolated fashion (no global flag mutation) so leaving the slide
    //    can fully revert, and slide 2's emoji-rain Loyalty trigger remains intact.
    //    Guard FIRST so any stray syncLoyaltyRechargeStack() call can't undo the swap.
    slide4RechargeSwapActive = true;
    const recharge = loyaltyBtn.querySelector(".node__comboLogo--recharge");
    const main     = loyaltyBtn.querySelector(".node__comboLogo--loyaltyMain");
    const reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    if (recharge instanceof HTMLImageElement) {
      recharge.hidden = false;
      recharge.setAttribute("aria-hidden", "false");
      recharge.classList.remove("node__comboLogo--recharge--pop");
      void recharge.offsetWidth; // restart the keyframe animation
      recharge.classList.add("node__comboLogo--recharge--pop");
      if (!reducedMotion) burstRechargeConfetti(recharge);
    }
    if (main instanceof HTMLElement) {
      const triggerMainExit = () => {
        main.classList.add("node__comboLogo--loyaltyMainExit");
        const finishHide = () => {
          main.style.display = "none";
          // Reveal the hanger now that the default image has fully exited.
          if (hangerEl) hangerEl.style.removeProperty("display");
        };
        if (reducedMotion) {
          finishHide();
        } else {
          main.addEventListener("animationend", finishHide, { once: true });
        }
      };
      if (recharge instanceof HTMLImageElement && !reducedMotion) {
        const fallback = window.setTimeout(triggerMainExit, 1400);
        recharge.addEventListener(
          "animationend",
          () => {
            window.clearTimeout(fallback);
            window.setTimeout(triggerMainExit, 200);
          },
          { once: true }
        );
      } else {
        window.setTimeout(triggerMainExit, 200);
      }
    }

    // 4. After Loyalty's slide animation completes (~900ms), spawn Retention hub + edges.
    els.edges.setAttribute("overflow", "visible");
    setTimeout(() => {
      // Register retention-hub as a synthetic node so updateAllEdges() tracks its pos
      // when the user drags neighbouring nodes.
      nodeById.set("retention-hub", /** @type {any} */ ({
        id: "retention-hub",
        category: "repeat",
        title: "Retention",
        pos: { x: RETENTION_POS.x, y: RETENTION_POS.y },
      }));

      const retBtn = document.createElement("button");
      retBtn.type = "button";
      retBtn.className = "node node--hub node--retentionHub";
      retBtn.dataset.id = "retention-hub";
      retBtn.dataset.hub = "true";
      retBtn.dataset.muted = "false";
      retBtn.dataset.hidden = "false";
      retBtn.style.left = `${RETENTION_POS.x}px`;
      retBtn.style.top  = `${RETENTION_POS.y}px`;
      retBtn.setAttribute("aria-label", "Retention hub");
      const row = document.createElement("div");
      row.className = "hubRow";
      const emoji = document.createElement("span");
      emoji.className = "hubEmojiOnly";
      emoji.textContent = "🤑";
      emoji.setAttribute("aria-hidden", "true");
      row.appendChild(emoji);
      const txt = document.createElement("div");
      txt.className = "hubText";
      txt.textContent = "Retention";
      row.appendChild(txt);
      retBtn.appendChild(row);
      els.nodes.appendChild(retBtn);

      // Edges: subscriptions → retention → loyalty.
      // Setting data-a/data-b lets updateAllEdges() (which fires during node drag)
      // re-render the path from the live nodeById positions, keeping it connected.
      const edgeDefs = [
        { aId: "subscriptions",  bId: "retention-hub" },
        { aId: "retention-hub",  bId: "loyalty" },
      ];
      const tempPaths = [];
      for (const { aId, bId } of edgeDefs) {
        const a = nodeById.get(aId);
        const b = nodeById.get(bId);
        if (!a || !b) continue;
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
        p.setAttribute("class", "edge edge--reroute");
        p.dataset.a = aId;
        p.dataset.b = bId;
        p.setAttribute("d", edgePath(a.pos, b.pos));
        p.setAttribute("stroke", "rgba(0, 0, 0, 0.34)");
        p.setAttribute("stroke-width", "0.5");
        p.setAttribute("fill", "none");
        els.edges.appendChild(p);
        const len = p.getTotalLength ? p.getTotalLength() : 500;
        p.style.setProperty("--edge-len", `${Math.ceil(len) || 500}`);
        tempPaths.push(p);
      }

      slide4RetentionCleanup = () => {
        retBtn.remove();
        for (const p of tempPaths) p.remove();
        nodeById.delete("retention-hub");
        slide4RetentionCleanup = null;
      };
    }, 950);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Slide 4 starts with Pre-purchase clicked + Loyalty active.
  // connectedSet("loyalty") is {loyalty, pre} per data.json edges, so applyFiltering
  // automatically mutes every other node and edge.
  /** Reset slide 4 reroute state: Loyalty position/artwork, pre→loyalty edge, Retention node + edges. */
  const resetLoyaltyReroute = () => {
    const loyaltyBtn = nodeEls.get("loyalty");
    if (loyaltyBtn) {
      // Snap Loyalty back to origin without an animated transition.
      loyaltyBtn.classList.remove("node--slide4-moving");
      void loyaltyBtn.offsetHeight; // flush layout
      loyaltyBtn.style.left = `${LOYALTY_ORIGIN_POS.x}px`;
      loyaltyBtn.style.top  = `${LOYALTY_ORIGIN_POS.y}px`;
      // Revert recharge pop animation and re-show the loyalty main artwork stack.
      const rechargeImg = loyaltyBtn.querySelector(".node__comboLogo--recharge");
      const mainImg     = loyaltyBtn.querySelector(".node__comboLogo--loyaltyMain");
      if (rechargeImg instanceof HTMLImageElement) {
        rechargeImg.classList.remove("node__comboLogo--recharge--pop");
        rechargeImg.hidden = true;
        rechargeImg.setAttribute("aria-hidden", "true");
      }
      if (mainImg instanceof HTMLElement) {
        mainImg.classList.remove("node__comboLogo--loyaltyMainExit");
        mainImg.style.removeProperty("display");
      }
    }
    // Restore the pre→loyalty edge that was faded out inline.
    const preLoyaltyEdge = /** @type {SVGPathElement | null} */ (
      els.edges?.querySelector('.edge[data-a="pre"][data-b="loyalty"]') ??
      els.edges?.querySelector('.edge[data-a="loyalty"][data-b="pre"]')
    );
    if (preLoyaltyEdge) {
      preLoyaltyEdge.style.removeProperty("transition");
      preLoyaltyEdge.style.removeProperty("opacity");
    }
    // Restore Loyalty's pos in nodeById so subsequent edge updates use the original
    // data.json position (in case slide 4 is revisited or slide 2 is reopened).
    if (slide4PriorLoyaltyPos !== null) {
      const loyaltyNode = nodeById.get("loyalty");
      if (loyaltyNode) {
        loyaltyNode.pos.x = slide4PriorLoyaltyPos.x;
        loyaltyNode.pos.y = slide4PriorLoyaltyPos.y;
      }
      slide4PriorLoyaltyPos = null;
    }
    els.viewport.classList.remove("viewport--slide4-rerouted");
    slide4RetentionCleanup?.();
    slide4Fanouts.challenges.cleanup?.();
    slide4Fanouts.benefits.cleanup?.();
    slide4RechargeSwapActive = false;
    slide4SubscriptionsRevealed = false;
    slide4LoyaltyRerouted = false;
    // Restore hanger label and ensure it's visible for the pre-reroute state.
    const hangerLabelEl  = loyaltyBtn?.querySelector(".cardHanger__label");
    const hangerElReset  = /** @type {HTMLElement|null} */ (loyaltyBtn?.querySelector(".cardHanger"));
    if (hangerLabelEl) hangerLabelEl.textContent = "Current framework";
    if (hangerElReset) hangerElReset.style.removeProperty("display");
  };

  slideshowEnterSlide4Hook = () => {
    // Reset any reroute leftovers from a previous visit
    resetLoyaltyReroute();

    // Snapshot shared graph state before slide 4 modifies it — restored on leave so slide 2 is unaffected.
    slide4VisibleIdsSnapshot = new Set(visibleIds);
    slide4SelectedIdSnapshot = state.selectedId;

    els.viewport.classList.add("viewport--slide4");
    reveal(["pre", "loyalty", "repeat", "measure"]);
    setSelected("loyalty");
  };
  slideshowLeaveSlide4Hook = () => {
    els.viewport.classList.remove("viewport--slide4");
    resetLoyaltyReroute();

    // Restore the graph's reveal + selection state to what it was before slide 4
    if (slide4VisibleIdsSnapshot !== null) {
      visibleIds.clear();
      for (const id of slide4VisibleIdsSnapshot) visibleIds.add(id);
      slide4VisibleIdsSnapshot = null;
    }
    state.selectedId = slide4SelectedIdSnapshot ?? null;
    slide4SelectedIdSnapshot = undefined;
    applyFiltering();
  };

  // If a map slide is already active when the graph finishes loading, trigger the layout hook now.
  if (window.slideshowPagination && window.slideshowPagination.index >= 1) {
    slideshowSlide2LayoutHook();
    if (window.slideshowPagination.index === 3) slideshowEnterSlide4Hook?.();
  }

  let isPanning = false;
  /** @type {{x:number,y:number} | null} */
  let panStartClient = null;
  /** @type {{x:number,y:number} | null} */
  let panStartTransform = null;

  els.stage.addEventListener("pointerdown", (e) => {
    if (!(e.target instanceof Element)) return;
    // If clicking a node, let selection happen.
    if (e.target.closest(".node")) return;
    isPanning = true;
    panStartClient = { x: e.clientX, y: e.clientY };
    panStartTransform = { x: transformRef.current.x, y: transformRef.current.y };
    els.stage.setPointerCapture(e.pointerId);
  });

  els.stage.addEventListener("pointermove", (e) => {
    // Turn a simple click into a drag only after a small movement threshold.
    if (
      !draggingNodeId &&
      pendingDragNodeId &&
      pendingDragPointerId === e.pointerId &&
      pendingDragStartClient
    ) {
      const dx = e.clientX - pendingDragStartClient.x;
      const dy = e.clientY - pendingDragStartClient.y;
      if (Math.hypot(dx, dy) > 4) beginNodeDragFromPending();
    }

    if (draggingNodeId && draggingPointerId === e.pointerId && dragOffset) {
      const n = nodeById.get(draggingNodeId);
      const btn = nodeEls.get(draggingNodeId);
      if (!n || !btn) return;

      const world = worldFromClient(els.stage, transformRef.current, e.clientX, e.clientY);
      n.pos.x = world.x - dragOffset.x;
      n.pos.y = world.y - dragOffset.y;
      btn.style.left = `${n.pos.x}px`;
      btn.style.top = `${n.pos.y}px`;
      updateAllEdges();

      if (dragStartClient) {
        const dx = e.clientX - dragStartClient.x;
        const dy = e.clientY - dragStartClient.y;
        if (Math.hypot(dx, dy) > 3) didDrag = true;
      }
      return;
    }
    if (!isPanning || !panStartClient || !panStartTransform) return;
    const dx = e.clientX - panStartClient.x;
    const dy = e.clientY - panStartClient.y;
    transformRef.current = {
      ...transformRef.current,
      x: panStartTransform.x + dx,
      y: panStartTransform.y + dy
    };
    applyTransform(els.viewport, transformRef.current);
    maybeRain();
  });

  const endPan = () => {
    isPanning = false;
    panStartClient = null;
    panStartTransform = null;
  };

  els.stage.addEventListener("pointerup", endPan);
  els.stage.addEventListener("pointercancel", endPan);
  els.stage.addEventListener("lostpointercapture", endPan);

  els.stage.addEventListener("pointerup", (e) => {
    if (draggingNodeId && draggingPointerId === e.pointerId) endNodeDrag();
    if (pendingDragNodeId && pendingDragPointerId === e.pointerId) clearPendingDrag();
  });
  els.stage.addEventListener("pointercancel", (e) => {
    if (draggingNodeId && draggingPointerId === e.pointerId) endNodeDrag();
    if (pendingDragNodeId && pendingDragPointerId === e.pointerId) clearPendingDrag();
  });
  els.stage.addEventListener("lostpointercapture", (e) => {
    if (draggingNodeId && draggingPointerId === e.pointerId) endNodeDrag();
    if (pendingDragNodeId && pendingDragPointerId === e.pointerId) clearPendingDrag();
  });

  els.stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      const zoomIntensity = 0.11;
      const factor = 1 + zoomIntensity * dir;

      const prev = transformRef.current;
      const nextScale = clamp(prev.scale * factor, minScale, maxScale);
      if (Math.abs(nextScale - prev.scale) < 1e-6) return;

      // Zoom about the pointer: keep the world point under cursor fixed.
      const world = worldFromClient(els.stage, prev, e.clientX, e.clientY);
      const r = els.stage.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      const nextX = sx - world.x * nextScale;
      const nextY = sy - world.y * nextScale;

      transformRef.current = { x: nextX, y: nextY, scale: nextScale };
      applyTransform(els.viewport, transformRef.current);
      maybeRain();
    },
    { passive: false }
  );

  // Keyboard support (stage focus)
  els.stage.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setSelected(null);
      return;
    }
    if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      resetView(true);
    }
  });

  // Empty-canvas click flow:
  //   Click 1 (selection active) → clear selection so the full map is visible at full opacity.
  //   Click 2 (selection already null, arm set) → fade everything except Merchant.
  //   Click 3 (merchantClonesArmed) → slide two merchant clone nodes in from the right.
  // This matches the rest of the storyboard where the user gets to see the full map before it collapses.

  /**
   * Three merchant brand logos that fan upward from the Merchant node on click 3.
   * Each entry: [imgSrc, finalWorldX, finalWorldY, animDelay]
   * The animation starts from the merchant node's world position so each card
   * slides up and outward to its resting spot.
   */
  const MERCHANT_LOGO_CARDS = [
    { src: "./assets/logos/tiege.png",  label: "Tiège Hanley", logo: "tiege", wx: -215, wy: -195, delay: 0   },
    { src: "./assets/logos/arrae.png",  label: "Arrae",         logo: "arrae", wx:    0, wy: -230, delay: 75  },
    { src: "./assets/logos/kollo.png?v=3",  label: "Kollo Health",  logo: "kollo", wx:  215, wy: -195, delay: 150 },
  ];

  function spawnMerchantClones() {
    const merchantNode = graph.nodes.find((n) => n.id === "merchant");
    if (!merchantNode) return;

    merchantCloneCleanup?.();

    /** @type {HTMLElement[]} */
    const cards = [];

    for (const card of MERCHANT_LOGO_CARDS) {
      const btn = /** @type {HTMLButtonElement} */ (document.createElement("button"));
      btn.type = "button";
      btn.classList.add("node", "node--merchantLogoCard");
      btn.dataset.merchantClone = "true";
      btn.dataset.logo = card.logo;
      btn.dataset.hidden = "false";
      btn.dataset.muted = "false";
      btn.dataset.selected = "false";
      btn.setAttribute("aria-label", card.label);
      btn.style.left = `${merchantNode.pos.x + card.wx}px`;
      btn.style.top  = `${merchantNode.pos.y + card.wy}px`;
      // Offset from this card's final position back to merchant position for the slide origin
      btn.style.setProperty("--from-x", `${-card.wx}px`);
      btn.style.setProperty("--from-y", `${-card.wy}px`);
      btn.style.animationDelay = `${card.delay}ms`;

      const img = document.createElement("img");
      img.src = card.src;
      img.alt = card.label;
      img.draggable = false;
      btn.appendChild(img);

      els.nodes.appendChild(btn);
      cards.push(btn);
    }

    merchantCloneCleanup = () => { for (const c of cards) c.remove(); };
    merchantClonesArmed = false;
  }

  els.stage.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest(".node")) return;

    // Slide 4 is a controlled demo state — empty-canvas clicks are no-ops there.
    if (window.slideshowPagination?.index === 3) return;

    const hadSelection = state.selectedId != null;
    if (hadSelection) {
      setSelected(null);
      return;
    }

    if (
      merchantClonesArmed &&
      window.slideshowPagination?.index === 1
    ) {
      spawnMerchantClones();
      return;
    }

    if (
      upsellMerchantSoloArmNextCanvas &&
      window.slideshowPagination?.index === 1 &&
      els.viewport instanceof HTMLElement
    ) {
      els.viewport.classList.add("viewport--merchantSolo");
      upsellMerchantSoloArmNextCanvas = false;
      resetView(false);
      merchantClonesArmed = true;
      return;
    }

    setSelected(null);
  });
}

async function fileToDataUrlScaled(file, maxSizePx, quality) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Failed to read file"));
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(file);
  });

  // If it's already small-ish (or not an image we can draw), just return it.
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load image"));
    i.src = dataUrl;
  });

  const w = img.width || 1;
  const h = img.height || 1;
  const scale = Math.min(1, maxSizePx / Math.max(w, h));
  if (scale >= 0.999) return dataUrl;

  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, cw, ch);

  // Prefer jpeg for photos; png for logos with transparency if possible.
  const isPng = (file.type || "").toLowerCase().includes("png");
  if (isPng) return canvas.toDataURL("image/png");
  return canvas.toDataURL("image/jpeg", quality);
}

async function normalizeBackgroundToWhite(dataUrl, opts = {}) {
  const threshold = opts.threshold ?? 42; // larger = more aggressive removal
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load image"));
    i.src = dataUrl;
  });

  const w = img.width || 1;
  const h = img.height || 1;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, w, h);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;

  // Estimate background color by averaging corners (small sample squares).
  const sample = (sx, sy) => {
    const size = Math.max(4, Math.min(20, Math.floor(Math.min(w, h) * 0.06)));
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = sy; y < sy + size; y++) {
      for (let x = sx; x < sx + size; x++) {
        const idx = (y * w + x) * 4;
        r += d[idx];
        g += d[idx + 1];
        b += d[idx + 2];
        n++;
      }
    }
    return { r: r / n, g: g / n, b: b / n };
  };

  const c1 = sample(0, 0);
  const c2 = sample(w - Math.max(4, Math.min(20, Math.floor(Math.min(w, h) * 0.06))), 0);
  const c3 = sample(0, h - Math.max(4, Math.min(20, Math.floor(Math.min(w, h) * 0.06))));
  const c4 = sample(w - Math.max(4, Math.min(20, Math.floor(Math.min(w, h) * 0.06))), h - Math.max(4, Math.min(20, Math.floor(Math.min(w, h) * 0.06))));
  const bg = {
    r: (c1.r + c2.r + c3.r + c4.r) / 4,
    g: (c1.g + c2.g + c3.g + c4.g) / 4,
    b: (c1.b + c2.b + c3.b + c4.b) / 4
  };

  const dist = (r, g, b) => Math.sqrt((r - bg.r) ** 2 + (g - bg.g) ** 2 + (b - bg.b) ** 2);

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    // If close to background, set to white.
    if (dist(r, g, b) < threshold) {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(im, 0, 0);
  return canvas.toDataURL("image/png");
}

function convolveRGBA(data, width, height, kernel, kSize, strength = 1) {
  const half = Math.floor(kSize / 2);
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const ix = clamp(x + kx, 0, width - 1);
          const iy = clamp(y + ky, 0, height - 1);
          const idx = (iy * width + ix) * 4;
          const w = kernel[(ky + half) * kSize + (kx + half)];
          r += data[idx] * w;
          g += data[idx + 1] * w;
          b += data[idx + 2] * w;
        }
      }
      const o = (y * width + x) * 4;
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = data[o + 3];
    }
  }

  // Blend with original to keep it natural.
  if (strength !== 1) {
    for (let i = 0; i < out.length; i += 4) {
      out[i] = data[i] + (out[i] - data[i]) * strength;
      out[i + 1] = data[i + 1] + (out[i + 1] - data[i + 1]) * strength;
      out[i + 2] = data[i + 2] + (out[i + 2] - data[i + 2]) * strength;
    }
  }
  return out;
}

async function enhanceForCrispDisplay(dataUrl, opts = {}) {
  // A lightweight “unsharp-ish” crisping pass so text/logos don’t look soft.
  const sharpenStrength = opts.sharpenStrength ?? 0.55;
  const maxLongEdge = opts.maxLongEdge ?? 1200;

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Failed to load image"));
    i.src = dataUrl;
  });

  const w0 = img.width || 1;
  const h0 = img.height || 1;
  const scale = Math.min(1, maxLongEdge / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;

  // Simple 3x3 sharpen kernel (classic).
  const kernel = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0
  ];
  const out = convolveRGBA(d, w, h, kernel, 3, sharpenStrength);
  im.data.set(out);
  ctx.putImageData(im, 0, 0);
  return canvas.toDataURL("image/png");
}

/** Move the shared `.stageWrap` between full-map and merchant-focus slide mounts. */
function mountMapStage(mountEl) {
  const stage = document.getElementById("stage");
  const wrap = stage?.closest(".stageWrap");
  if (!(wrap instanceof HTMLElement) || !mountEl) return;
  mountEl.appendChild(wrap);
}

/**
 * Wire up the slideshow. Called once at module parse time — the script is
 * type="module" deferred, so the full DOM is already available.
 *
 * Visibility is controlled by a single CSS class (`.slide.is-active`).
 * No `hidden` attribute juggling, no async scheduling, no teardown logic.
 */
function initSlideshow() {
  const list = document.getElementById("slideshowDots");
  const nav = list ? list.closest("nav") : null;
  if (!list || !nav) {
    console.error("[slideshow] #slideshowDots or parent <nav> missing");
    return;
  }

  const slides = /** @type {HTMLElement[]} */ (
    [...document.querySelectorAll(".slidesDeck section[data-slide-index]")]
      .sort((a, b) => Number(a.dataset.slideIndex) - Number(b.dataset.slideIndex))
  );

  if (slides.length < 5) {
    console.error(`[slideshow] expected 5 slide sections, found ${slides.length}`);
    return;
  }

  const count = slides.length;
  let current = 0;

  function goTo(index) {
    if (index < 0 || index >= count || index === current) return;

    const leavingSlide4 = current === 3 && index !== 3;

    if (index !== 1) {
      upsellMerchantSoloArmNextCanvas = false;
      merchantClonesArmed = false;
      merchantCloneCleanup?.();
      merchantCloneCleanup = null;
    }

    const mount1 = document.getElementById("mapSlideMount1");
    const mount3 = document.getElementById("mapSlideMount3");
    const viewport = document.getElementById("viewport");

    // Park the shared map under slide 2’s mount whenever we’re not on the recap (slide 4).
    if (index === 0 || index === 1 || index === 2 || index === 4) {
      viewport?.classList.remove("viewport--merchantSolo");
      if (mount1) mountMapStage(mount1);
    } else if (index === 3) {
      viewport?.classList.remove("viewport--merchantSolo");
      if (mount3) mountMapStage(mount3);
    }

    if (leavingSlide4) slideshowLeaveSlide4Hook?.();
    if (index === 3) slideshowEnterSlide4Hook?.();

    current = index;

    for (let i = 0; i < slides.length; i++) {
      const on = i === index;
      slides[i].classList.toggle("is-active", on);
      slides[i].setAttribute("aria-hidden", on ? "false" : "true");
    }

    const dots = list.querySelectorAll("button.slideshowPagination__dot");
    dots.forEach((btn, i) => {
      const on = i === index;
      btn.classList.toggle("is-active", on);
      if (on) btn.setAttribute("aria-current", "true");
      else btn.removeAttribute("aria-current");
    });

    if (index === 1 || index === 3) {
      slideshowSlide2LayoutHook?.();
      requestAnimationFrame(() => {
        slideshowSlide2LayoutHook?.();
        window.setTimeout(() => slideshowSlide2LayoutHook?.(), 560);
      });
      const stage = document.getElementById("stage");
      if (stage instanceof HTMLElement) stage.focus({ preventScroll: true });
    }

    document.dispatchEvent(
      new CustomEvent("slideshow:change", {
        bubbles: true,
        composed: true,
        detail: { index, count }
      })
    );
  }

  list.replaceChildren();
  for (let i = 0; i < count; i++) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slideshowPagination__dot" + (i === 0 ? " is-active" : "");
    btn.setAttribute("aria-label", `Slide ${i + 1} of ${count}`);
    if (i === 0) btn.setAttribute("aria-current", "true");
    btn.addEventListener("click", () => goTo(i));
    li.appendChild(btn);
    list.appendChild(li);
  }

  // Capture phase so the slideshow gets the event before the stage (which has focus on slide 2).
  window.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const t = e.target;
    if (t instanceof HTMLElement) {
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable) return;
    }
    e.preventDefault();
    e.stopPropagation();
    goTo(e.key === "ArrowRight" ? (current + 1) % count : (current - 1 + count) % count);
  }, true);

  applySlideDeck = goTo;
  window.slideshowPagination = {
    goTo,
    next: () => goTo((current + 1) % count),
    prev: () => goTo((current - 1 + count) % count),
    get index() { return current; },
    get count() { return count; }
  };

  // Sync the initial state (slide 0 already has is-active in HTML; this re-asserts)
  for (let i = 0; i < slides.length; i++) {
    slides[i].classList.toggle("is-active", i === 0);
    slides[i].setAttribute("aria-hidden", i === 0 ? "false" : "true");
  }

  console.info(`[slideshow] ready — ${count} slides`);
}

migrateSubscriptionsCardToBundledAsset();

initSlideshow();

// ── Loyalty hanger modal ─────────────────────────────────────────────────────
(function initLoyaltyModal() {
  const modal1 = document.getElementById("loyaltyModal");
  const modal2 = document.getElementById("loyaltyModalRerouted");
  if (!modal1 || !modal2) return;

  function wireModal(modal) {
    const backdrop = modal.querySelector(".modal__backdrop");
    const closeBtn = modal.querySelector(".modal__close");
    const close = () => { modal.hidden = true; };
    backdrop?.addEventListener("click", close);
    closeBtn?.addEventListener("click", close);
    return close;
  }

  wireModal(modal1);
  wireModal(modal2);

  // Open when any .cardHanger inside the map is clicked —
  // choose modal based on whether the slide-4 reroute has happened.
  document.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    if (!e.target.closest(".cardHanger")) return;
    e.stopPropagation();
    const rerouted = document.getElementById("viewport")
      ?.classList.contains("viewport--slide4-rerouted");
    const modal = rerouted ? modal2 : modal1;
    modal.hidden = false;
    modal.querySelector(".modal__close")?.focus();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!modal1.hidden) modal1.hidden = true;
    if (!modal2.hidden) modal2.hidden = true;
  });
})();

// ── Slide 5: flow trigger + conditional branch panels ──────────────────────────
(function initSlide5FlowPanels() {
  const triggerRoot = document.getElementById("flowTriggerPanelRoot");
  const triggerPanel = document.getElementById("flowTriggerPanel");
  const triggerBtn = document.getElementById("flowTriggerNode");
  const branchRoot = document.getElementById("flowBranchPanelRoot");
  const branchPanel = document.getElementById("flowBranchPanel");
  const branchBtn = document.getElementById("flowConditionalBranchNode");

  if (
    !triggerRoot ||
    !triggerPanel ||
    !triggerBtn ||
    !branchRoot ||
    !branchPanel ||
    !branchBtn
  ) {
    return;
  }

  const TRIGGER_OPEN = "flowTriggerPanelRoot--open";
  const BRANCH_OPEN = "flowBranchPanelRoot--open";
  const FLOW_LAYOUT_OPEN = "slide5FlowLayout--panelOpen";

  const flowLayout = triggerBtn.closest(".slide5FlowLayout");

  const branchNodeWrap = document.getElementById("flowBranchNodeWrap");
  const slide5Canvas = document.getElementById("slide5Canvas");
  let slide5BranchSpawnEligible = false;

  function resetSlide5BranchSpawnState() {
    slide5BranchSpawnEligible = false;
    if (branchNodeWrap) {
      branchNodeWrap.hidden = true;
      branchNodeWrap.setAttribute("aria-hidden", "true");
      branchNodeWrap.classList.remove("flowBranchNodeWrap--enter", "flowBranchNodeWrap--enter-active");
    }
  }

  function revealConditionalBranchNode() {
    if (!branchNodeWrap?.hasAttribute("hidden")) return;
    branchNodeWrap.classList.remove("flowBranchNodeWrap--enter", "flowBranchNodeWrap--enter-active");
    void branchNodeWrap.offsetWidth;
    branchNodeWrap.classList.add("flowBranchNodeWrap--enter");
    branchNodeWrap.removeAttribute("hidden");
    branchNodeWrap.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(() => {
      branchNodeWrap.classList.add("flowBranchNodeWrap--enter-active");
    });
    window.setTimeout(() => {
      branchNodeWrap.classList.remove("flowBranchNodeWrap--enter", "flowBranchNodeWrap--enter-active");
    }, 900);
  }

  const branchStack = branchPanel.querySelector(".flowBranchPanel__branchStack");
  const editorCol = document.getElementById("flowBranchEditorCol");
  const branchApplyWrap = document.getElementById("flowBranchApplyWrap");
  const branchApplyBtn = document.getElementById("flowBranchApplyBtn");
  const branchCompoundInput = branchPanel.querySelector(".flowBranchPanel__compoundCurrencyInput");

  function countNonElseBranches() {
    if (!branchStack) return 0;
    return branchStack.querySelectorAll(".flowBranchPanel__branchCard:not([data-flow-branch-else])").length;
  }

  function syncConditionalBranchNodeSubtitle() {
    const subtitle = branchBtn.querySelector(".triggerNode__subtitle");
    const n = countNonElseBranches();
    const phrase = n === 1 ? "1 branch" : `${n} branches`;
    if (subtitle) subtitle.textContent = phrase;
    branchBtn.setAttribute("aria-label", `Conditional branch. ${phrase}.`);
  }

  /** @type {HTMLElement | null} */
  let draggedBranchCard = null;
  /** @type {HTMLElement | null} */
  let branchDragGhostEl = null;
  /** @type {HTMLElement | null} */
  let branchDropSlotEl = null;
  let draggedBranchCardHeight = 48;

  function isBranchCompoundFieldVisible() {
    const wrap = branchPanel.querySelector(".flowBranchPanel__compoundCurrencyField--secondColumn");
    if (!(wrap instanceof HTMLElement)) return false;
    return window.getComputedStyle(wrap).display !== "none";
  }

  function isBranchApplyDisabledByCurrencyRule() {
    if (!(branchCompoundInput instanceof HTMLInputElement)) return false;
    if (!isBranchCompoundFieldVisible()) return false;
    const raw = branchCompoundInput.value.trim().replace(/[$,\s]/g, "");
    if (raw === "") return true;
    const n = parseFloat(raw);
    if (Number.isNaN(n)) return true;
    return n === 0;
  }

  function syncBranchApplyDisabledState() {
    if (!(branchApplyBtn instanceof HTMLButtonElement) || !(branchApplyWrap instanceof HTMLElement) || !editorCol)
      return;
    if (editorCol.hidden) {
      branchApplyWrap.classList.remove("flowBranchPanel__applyWrap--invalid");
      branchApplyBtn.disabled = false;
      branchApplyBtn.removeAttribute("aria-describedby");
      return;
    }
    const invalid = isBranchApplyDisabledByCurrencyRule();
    branchApplyWrap.classList.toggle("flowBranchPanel__applyWrap--invalid", invalid);
    branchApplyBtn.disabled = invalid;
    if (invalid) branchApplyBtn.setAttribute("aria-describedby", "flowBranchApplyTooltip");
    else branchApplyBtn.removeAttribute("aria-describedby");
  }

  function removeBranchDropSlot() {
    branchDropSlotEl?.remove();
    branchDropSlotEl = null;
  }

  function clearEditingBranchCard() {
    branchStack?.querySelectorAll(".flowBranchPanel__branchCard--editing").forEach((el) => {
      el.classList.remove("flowBranchPanel__branchCard--editing");
    });
  }

  function exitBranchEditor() {
    removeBranchDropSlot();
    clearEditingBranchCard();
    if (editorCol) {
      editorCol.hidden = true;
      editorCol.setAttribute("aria-hidden", "true");
    }
    branchRoot.classList.remove("flowBranchPanelRoot--editorWide");
    branchPanel.classList.remove("flowBranchPanel--editorWide");
    branchPanel.classList.remove("flowBranchPanel--editingBranch3");
    branchPanel.classList.remove("flowBranchPanel--hideEditorCardConditionAdd");
    resetBranchEditorConditionUi();
    syncBranchApplyDisabledState();
  }

  function enterBranchEditor(options = {}) {
    if (!editorCol) return;
    const wide = options.wide === true;
    const card = options.card instanceof HTMLElement ? options.card : null;
    const branchLabel = card?.querySelector(".flowBranchPanel__branchLabel")?.textContent?.trim() ?? "";
    const isBranch3 = branchLabel === "Branch 3";
    const hideEditorCardConditionAdd =
      branchLabel === "Prospective subscribers" ||
      branchLabel === "Existing subscribers" ||
      branchLabel === "Branch 3";
    clearEditingBranchCard();
    if (card && !card.hasAttribute("data-flow-branch-else")) {
      card.classList.add("flowBranchPanel__branchCard--editing");
    }
    const branchNameInput = document.getElementById("flowBranchEditorBranchNameInput");
    if (branchNameInput && card) {
      const labelEl = card.querySelector(".flowBranchPanel__branchLabel");
      branchNameInput.value = labelEl?.textContent?.trim() ?? "";
    }
    editorCol.hidden = false;
    editorCol.setAttribute("aria-hidden", "false");
    branchRoot.classList.toggle("flowBranchPanelRoot--editorWide", wide);
    branchPanel.classList.toggle("flowBranchPanel--editorWide", wide);
    branchPanel.classList.toggle("flowBranchPanel--editingBranch3", isBranch3);
    branchPanel.classList.toggle("flowBranchPanel--hideEditorCardConditionAdd", hideEditorCardConditionAdd);
    resetBranchEditorConditionUi();
    if (!card?.hasAttribute("data-flow-branch-else") && !isBranch3) {
      applyBranchEditorCustomerSubscriptionEqualsPreset("1");
    }
    syncBranchApplyDisabledState();
  }

  function normalizeElseBranchLast() {
    const elseEl = branchStack?.querySelector("[data-flow-branch-else]");
    if (elseEl && branchStack) branchStack.appendChild(elseEl);
  }

  function nextBranchNumberLabel() {
    let maxNum = 2;
    branchStack?.querySelectorAll(".flowBranchPanel__branchCard:not([data-flow-branch-else])").forEach((card) => {
      const labelEl = card.querySelector(".flowBranchPanel__branchLabel");
      const text = labelEl?.textContent?.trim() ?? "";
      const m = /^Branch (\d+)$/.exec(text);
      if (m) maxNum = Math.max(maxNum, Number(m[1]));
    });
    return `Branch ${maxNum + 1}`;
  }

  function addBranchRowFromTemplate() {
    if (!branchStack) return;
    const elseEl = branchStack.querySelector("[data-flow-branch-else]");
    const template = branchStack.querySelector(".flowBranchPanel__branchCard:not([data-flow-branch-else])");
    if (!(elseEl instanceof HTMLElement) || !(template instanceof HTMLElement)) return;
    const card = /** @type {HTMLElement} */ (template.cloneNode(true));
    card.classList.remove("flowBranchPanel__branchCard--dragging", "flowBranchPanel__branchCard--editing");
    const label = card.querySelector(".flowBranchPanel__branchLabel");
    if (label) label.textContent = nextBranchNumberLabel();
    elseEl.before(card);
    normalizeElseBranchLast();
    syncConditionalBranchNodeSubtitle();
  }

  /**
   * @param {HTMLElement} reference
   */
  function moveBranchDropSlotBefore(reference) {
    if (!branchStack || !draggedBranchCard) return;
    if (reference.parentNode !== branchStack) return;
    if (!branchDropSlotEl) {
      branchDropSlotEl = document.createElement("div");
      branchDropSlotEl.className = "flowBranchPanel__branchDropSlot";
      branchDropSlotEl.setAttribute("aria-hidden", "true");
    }
    branchDropSlotEl.style.height = `${draggedBranchCardHeight}px`;
    branchStack.insertBefore(branchDropSlotEl, reference);
  }

  /**
   * @param {HTMLElement} reference
   */
  function moveBranchDropSlotAfter(reference) {
    if (!branchStack || !draggedBranchCard) return;
    if (reference.parentNode !== branchStack) return;
    if (!branchDropSlotEl) {
      branchDropSlotEl = document.createElement("div");
      branchDropSlotEl.className = "flowBranchPanel__branchDropSlot";
      branchDropSlotEl.setAttribute("aria-hidden", "true");
    }
    branchDropSlotEl.style.height = `${draggedBranchCardHeight}px`;
    reference.after(branchDropSlotEl);
  }

  const customerDetails = document.getElementById("flowTriggerCustomerDetails");
  const conditionAndPill = document.getElementById("flowTriggerConditionAndPill");
  const triggerNodeConditions = document.getElementById("flowTriggerNodeConditions");

  /** @type {{ trigger: HTMLElement; list: HTMLElement; field: HTMLElement; position: () => void; setExpanded: (v: boolean) => void; isExpanded: () => boolean }[]} */
  const flowSelects = [];

  function syncFlowLayout() {
    const anyOpen =
      triggerRoot.classList.contains(TRIGGER_OPEN) || branchRoot.classList.contains(BRANCH_OPEN);
    flowLayout?.classList.toggle(FLOW_LAYOUT_OPEN, anyOpen);
  }

  function syncCustomerConditionUi(selectedLabel) {
    const isCustomer = selectedLabel === "Customer";
    if (customerDetails) {
      customerDetails.hidden = !isCustomer;
    }
    if (conditionAndPill) conditionAndPill.hidden = isCustomer;
    triggerBtn.classList.toggle("triggerNode--hasConditions", isCustomer);
    if (triggerNodeConditions) {
      triggerNodeConditions.hidden = !isCustomer;
    }
  }

  function closeAllSelects() {
    for (const s of flowSelects) {
      if (s.isExpanded()) s.setExpanded(false);
    }
  }

  function syncBranchEditorBranch3Affordances() {
    const details = document.getElementById("flowBranchEditorConditionDetails");
    const branch3AndRow = document.getElementById("flowBranchEditorBranch3AndRow");
    const isB3 = branchPanel.classList.contains("flowBranchPanel--editingBranch3");
    const rowAddLabel = branchPanel.querySelector(".flowBranchPanel__conditionRowAdd .flowTriggerPanel__pillLabel");
    if (rowAddLabel) rowAddLabel.textContent = isB3 ? "And" : "Add";
    const rowAddBtn = branchPanel.querySelector("[data-flow-branch-editor-add-condition]");
    if (rowAddBtn instanceof HTMLButtonElement) {
      rowAddBtn.setAttribute("aria-label", isB3 ? "And condition" : "Add condition");
    }
    if (!(branch3AndRow instanceof HTMLElement) || !details) return;
    branch3AndRow.hidden = !isB3 || !details.hidden;
  }

  function resetBranchEditorSecondConditionCard() {
    const c2 = document.getElementById("flowBranchEditorConditionCard2");
    const addRow = document.getElementById("flowBranchEditorConditionCardAddRow");
    if (c2 instanceof HTMLElement) c2.hidden = true;
    if (addRow instanceof HTMLElement) addRow.hidden = false;
    const o2Btn = document.getElementById("flowBranchEditor2ObjectBtn");
    const o2Span = o2Btn?.querySelector(".flowTriggerPanel__selectText");
    if (o2Span) {
      o2Span.textContent = "Object";
      o2Span.classList.remove("flowTriggerPanel__selectText--hasValue");
    }
  }

  function collapseBranchEditorConditionExtension() {
    const extended = document.getElementById("flowBranchEditorConditionExtended");
    const addBtn = branchPanel.querySelector("[data-flow-branch-editor-add-condition]");
    if (extended instanceof HTMLElement) extended.hidden = true;
    if (addBtn instanceof HTMLButtonElement) addBtn.hidden = false;
    const object2Btn = document.getElementById("flowBranchEditorObject2Btn");
    const object2Span = object2Btn?.querySelector(".flowTriggerPanel__selectText");
    if (object2Span) {
      object2Span.textContent = "Object";
      object2Span.classList.remove("flowTriggerPanel__selectText--hasValue");
    }
  }

  function expandBranchEditorConditionExtension() {
    const details = document.getElementById("flowBranchEditorConditionDetails");
    if (!details || details.hidden) return;
    const extended = document.getElementById("flowBranchEditorConditionExtended");
    const addBtn = branchPanel.querySelector("[data-flow-branch-editor-add-condition]");
    if (!(extended instanceof HTMLElement)) return;
    const operatorBtn = document.getElementById("flowBranchEditorOperatorBtn");
    const operatorSpan = operatorBtn?.querySelector(".flowTriggerPanel__selectText");
    if (operatorSpan) {
      operatorSpan.textContent = branchPanel.classList.contains("flowBranchPanel--editingBranch3")
        ? "Is equal to"
        : "Is greater than or equal to";
      operatorSpan.classList.add("flowTriggerPanel__selectText--hasValue");
    }
    const valueInput = document.getElementById("flowBranchEditorValueInput");
    if (valueInput instanceof HTMLInputElement) valueInput.value = "1";
    extended.hidden = false;
    if (addBtn instanceof HTMLButtonElement) addBtn.hidden = true;
  }

  function resetBranchEditorConditionUi() {
    closeAllSelects();
    const details = document.getElementById("flowBranchEditorConditionDetails");
    if (details) {
      details.hidden = true;
    }
    const objectBtn = document.getElementById("flowBranchEditorObjectBtn");
    if (objectBtn) {
      const span = objectBtn.querySelector(".flowTriggerPanel__selectText");
      if (span) {
        span.textContent = "Object";
        span.classList.remove("flowTriggerPanel__selectText--hasValue");
      }
    }
    const metricBtn = document.getElementById("flowBranchEditorMetricBtn");
    if (metricBtn) {
      const span = metricBtn.querySelector(".flowTriggerPanel__selectText");
      if (span) {
        span.textContent = "Metric";
        span.classList.remove("flowTriggerPanel__selectText--hasValue");
      }
    }
    const operatorBtn = document.getElementById("flowBranchEditorOperatorBtn");
    if (operatorBtn) {
      const span = operatorBtn.querySelector(".flowTriggerPanel__selectText");
      if (span) {
        span.textContent = "Operator";
        span.classList.remove("flowTriggerPanel__selectText--hasValue");
      }
    }
    const valueInput = document.getElementById("flowBranchEditorValueInput");
    if (valueInput instanceof HTMLInputElement) {
      valueInput.value = "";
    }
    if (branchCompoundInput instanceof HTMLInputElement) {
      branchCompoundInput.value = "";
    }
    collapseBranchEditorConditionExtension();
    resetBranchEditorSecondConditionCard();
    syncBranchEditorBranch3Affordances();
  }

  /**
   * @param {string} selectedLabel
   */
  function syncBranchEditorConditionDetailsFromObject(selectedLabel) {
    const details = document.getElementById("flowBranchEditorConditionDetails");
    const objectBtn = document.getElementById("flowBranchEditorObjectBtn");
    if (!details || !objectBtn) {
      collapseBranchEditorConditionExtension();
      syncBranchEditorBranch3Affordances();
      return;
    }
    const textEl = objectBtn.querySelector(".flowTriggerPanel__selectText");
    const trimmed = selectedLabel.trim();
    details.hidden = false;
    details.removeAttribute("hidden");
    if (textEl) {
      textEl.textContent = trimmed;
      textEl.classList.add("flowTriggerPanel__selectText--hasValue");
    }
    collapseBranchEditorConditionExtension();
    syncBranchEditorBranch3Affordances();
  }

  /**
   * Portfolio demo: Customer / active subscriptions / ≥ / comparison value (matches condition card reference).
   * @param {string} comparisonValue
   */
  function applyBranchEditorCustomerSubscriptionEqualsPreset(comparisonValue) {
    syncBranchEditorConditionDetailsFromObject("Customer");
    const metricBtn = document.getElementById("flowBranchEditorMetricBtn");
    const metricSpan = metricBtn?.querySelector(".flowTriggerPanel__selectText");
    if (metricSpan) {
      metricSpan.textContent = "Number of active subscriptions";
      metricSpan.classList.add("flowTriggerPanel__selectText--hasValue");
    }
    const operatorBtn = document.getElementById("flowBranchEditorOperatorBtn");
    const operatorSpan = operatorBtn?.querySelector(".flowTriggerPanel__selectText");
    if (operatorSpan) {
      operatorSpan.textContent = "Is greater than or equal to";
      operatorSpan.classList.add("flowTriggerPanel__selectText--hasValue");
    }
    const valueInput = document.getElementById("flowBranchEditorValueInput");
    if (valueInput instanceof HTMLInputElement) {
      valueInput.value = comparisonValue;
    }
  }

  /** Branch 3 editor: Customer → subscriptions, Is equal to, 1 (Figma branch card). */
  function applyBranchEditorCustomerBranch3EqualsOnePreset() {
    syncBranchEditorConditionDetailsFromObject("Customer");
    const metricBtn = document.getElementById("flowBranchEditorMetricBtn");
    const metricSpan = metricBtn?.querySelector(".flowTriggerPanel__selectText");
    if (metricSpan) {
      metricSpan.textContent = "Number of active subscriptions";
      metricSpan.classList.add("flowTriggerPanel__selectText--hasValue");
    }
    const operatorBtn = document.getElementById("flowBranchEditorOperatorBtn");
    const operatorSpan = operatorBtn?.querySelector(".flowTriggerPanel__selectText");
    if (operatorSpan) {
      operatorSpan.textContent = "Is equal to";
      operatorSpan.classList.add("flowTriggerPanel__selectText--hasValue");
    }
    const valueInput = document.getElementById("flowBranchEditorValueInput");
    if (valueInput instanceof HTMLInputElement) {
      valueInput.value = "1";
    }
    syncBranchEditorBranch3Affordances();
  }

  /**
   * @param {HTMLElement | null} elTrigger
   * @param {HTMLElement | null} elList
   * @param {{ onPick?: (value: string) => void }} [options]
   */
  function attachFlowSelect(elTrigger, elList, options = {}) {
    if (!(elTrigger instanceof HTMLElement) || !(elList instanceof HTMLElement)) return;
    const field = elTrigger.closest(".flowTriggerPanel__selectField");
    if (!field) return;

    function isExpanded() {
      return elTrigger.getAttribute("aria-expanded") === "true";
    }

    function position() {
      if (elList.getAttribute("aria-hidden") === "true") return;
      const r = elTrigger.getBoundingClientRect();
      const viewportPad = 12;
      const maxW = Math.max(1, Math.round(window.innerWidth - r.left - viewportPad));
      const w = Math.min(Math.round(r.width), maxW);
      elList.style.top = `${Math.round(r.bottom + 4)}px`;
      elList.style.left = `${Math.round(r.left)}px`;
      elList.style.width = `${w}px`;
    }

    function setExpanded(expanded) {
      if (expanded) {
        for (const s of flowSelects) {
          if (s.trigger !== elTrigger && s.isExpanded()) s.setExpanded(false);
        }
      }
      elTrigger.setAttribute("aria-expanded", String(expanded));
      elList.setAttribute("aria-hidden", String(!expanded));
      field.classList.toggle("flowTriggerPanel__selectField--open", expanded);
      if (expanded) {
        document.body.appendChild(elList);
        window.requestAnimationFrame(() => position());
      } else {
        elList.style.top = "";
        elList.style.left = "";
        elList.style.width = "";
        if (elList.parentNode !== field) field.appendChild(elList);
      }
    }

    const api = { trigger: elTrigger, list: elList, field, position, setExpanded, isExpanded };
    flowSelects.push(api);

    elTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      setExpanded(!isExpanded());
    });

    elList.querySelectorAll('.flowTriggerPanel__selectOption[role="option"]').forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        const label = elTrigger.querySelector(".flowTriggerPanel__selectText");
        const value = opt.textContent?.trim() ?? "";
        if (label) {
          label.textContent = value;
          label.classList.add("flowTriggerPanel__selectText--hasValue");
        }
        if (options.onPick) options.onPick(value);
        setExpanded(false);
      });
    });
  }

  function isTriggerOpen() {
    return triggerRoot.classList.contains(TRIGGER_OPEN);
  }

  function isBranchOpen() {
    return branchRoot.classList.contains(BRANCH_OPEN);
  }

  function closeBranch(options = {}) {
    const refocusBranch = options.refocusBranch !== false;
    exitBranchEditor();
    branchRoot.classList.remove(BRANCH_OPEN);
    branchRoot.setAttribute("aria-hidden", "true");
    branchBtn.setAttribute("aria-expanded", "false");
    syncFlowLayout();
    if (!refocusBranch) branchBtn.blur();
    else branchBtn.focus({ preventScroll: true });
  }

  function openBranch() {
    if (branchNodeWrap?.hidden) return;
    exitBranchEditor();
    closeTrigger({ refocusTrigger: false });
    closeAllSelects();
    branchRoot.classList.add(BRANCH_OPEN);
    branchRoot.setAttribute("aria-hidden", "false");
    branchBtn.setAttribute("aria-expanded", "true");
    syncFlowLayout();
    window.requestAnimationFrame(() => branchPanel.focus({ preventScroll: true }));
  }

  function closeTrigger(options = {}) {
    const wasOpen = triggerRoot.classList.contains(TRIGGER_OPEN);
    const refocusTrigger = options.refocusTrigger !== false;
    closeAllSelects();
    triggerRoot.classList.remove(TRIGGER_OPEN);
    triggerRoot.setAttribute("aria-hidden", "true");
    triggerBtn.setAttribute("aria-expanded", "false");
    syncFlowLayout();
    if (!refocusTrigger) triggerBtn.blur();
    else triggerBtn.focus({ preventScroll: true });
    if (wasOpen) slide5BranchSpawnEligible = true;
  }

  function openTrigger() {
    closeBranch({ refocusBranch: false });
    closeAllSelects();
    triggerRoot.classList.add(TRIGGER_OPEN);
    triggerRoot.setAttribute("aria-hidden", "false");
    triggerBtn.setAttribute("aria-expanded", "true");
    syncFlowLayout();
    window.requestAnimationFrame(() => triggerPanel.focus({ preventScroll: true }));
  }

  triggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isTriggerOpen()) closeTrigger();
    else openTrigger();
  });

  branchBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isBranchOpen()) closeBranch();
    else openBranch();
  });

  slide5Canvas?.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (
      t.closest(
        "#flowTriggerNode, #flowConditionalBranchNode, #flowTriggerPanelRoot, #flowBranchPanelRoot",
      )
    ) {
      return;
    }
    if (!slide5BranchSpawnEligible) return;
    if (branchNodeWrap && !branchNodeWrap.hidden) return;
    revealConditionalBranchNode();
  });

  triggerRoot.querySelectorAll("[data-flow-trigger-dismiss]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTrigger();
    });
  });

  branchRoot.querySelectorAll("[data-flow-branch-dismiss]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (el instanceof HTMLButtonElement && el.disabled) return;
      closeBranch();
    });
  });

  branchCompoundInput?.addEventListener("input", syncBranchApplyDisabledState);
  branchCompoundInput?.addEventListener("change", syncBranchApplyDisabledState);

  branchPanel.addEventListener("click", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el) return;
    if (el.closest("[data-flow-branch-editor-branch3-and]")) {
      e.stopPropagation();
      const d = document.getElementById("flowBranchEditorConditionDetails");
      if (!d || d.hidden) return;
      expandBranchEditorConditionExtension();
      syncBranchApplyDisabledState();
      return;
    }
    if (el.closest("[data-flow-branch-editor-add-condition-card]")) {
      e.stopPropagation();
      const c2 = document.getElementById("flowBranchEditorConditionCard2");
      const addRow = document.getElementById("flowBranchEditorConditionCardAddRow");
      if (c2 instanceof HTMLElement) c2.hidden = false;
      if (addRow instanceof HTMLElement) addRow.hidden = true;
      syncBranchApplyDisabledState();
      return;
    }
    if (el.closest("[data-flow-branch-editor-remove-condition-2]")) {
      e.stopPropagation();
      resetBranchEditorSecondConditionCard();
      syncBranchApplyDisabledState();
      return;
    }
    if (el.closest("[data-flow-branch-editor-add-condition]")) {
      e.stopPropagation();
      expandBranchEditorConditionExtension();
      syncBranchApplyDisabledState();
      return;
    }
    if (el.closest("[data-flow-branch-editor-condition-delete]")) {
      e.stopPropagation();
      if (branchPanel.classList.contains("flowBranchPanel--editingBranch3")) {
        applyBranchEditorCustomerBranch3EqualsOnePreset();
      } else {
        applyBranchEditorCustomerSubscriptionEqualsPreset("1");
      }
      syncBranchApplyDisabledState();
      return;
    }
    if (el.closest("[data-flow-branch-add]")) {
      e.stopPropagation();
      addBranchRowFromTemplate();
      return;
    }
    if (el.closest("[data-flow-branch-delete]")) {
      e.stopPropagation();
      const card = el.closest(".flowBranchPanel__branchCard");
      if (!(card instanceof HTMLElement)) return;
      if (card.hasAttribute("data-flow-branch-else")) return;
      const userBranches = branchStack?.querySelectorAll(
        ".flowBranchPanel__branchCard:not([data-flow-branch-else])",
      );
      if (!userBranches || userBranches.length <= 1) return;
      const wasEditing = card.classList.contains("flowBranchPanel__branchCard--editing");
      card.remove();
      normalizeElseBranchLast();
      syncConditionalBranchNodeSubtitle();
      if (wasEditing) exitBranchEditor();
      return;
    }
    if (el.closest("[data-flow-branch-edit]")) {
      e.stopPropagation();
      const card = el.closest(".flowBranchPanel__branchCard");
      enterBranchEditor({
        wide: true,
        card: card instanceof HTMLElement ? card : null,
      });
      return;
    }
  });

  branchStack?.addEventListener("dragstart", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const handle = t.closest("[data-flow-branch-drag-handle]");
    if (!handle) return;
    const card = handle.closest(".flowBranchPanel__branchCard");
    if (!(card instanceof HTMLElement)) return;
    if (card.hasAttribute("data-flow-branch-else")) return;
    draggedBranchCard = card;
    draggedBranchCardHeight = Math.max(32, Math.round(card.getBoundingClientRect().height));
    card.classList.add("flowBranchPanel__branchCard--dragging");
    const dt = e.dataTransfer;
    if (dt) {
      dt.effectAllowed = "move";
      dt.setData("text/plain", "flow-branch");

      branchDragGhostEl?.remove();
      branchDragGhostEl = null;

      const rect = card.getBoundingClientRect();
      const ghost = /** @type {HTMLElement} */ (card.cloneNode(true));
      ghost.classList.remove(
        "flowBranchPanel__branchCard--dragging",
      );
      ghost.querySelectorAll("[data-flow-branch-drag-handle]").forEach((h) => {
        if (h instanceof HTMLElement) {
          h.removeAttribute("draggable");
          h.draggable = false;
        }
      });
      ghost.style.position = "fixed";
      ghost.style.left = "-10000px";
      ghost.style.top = "0";
      ghost.style.width = `${Math.round(rect.width)}px`;
      ghost.style.boxSizing = "border-box";
      ghost.style.margin = "0";
      ghost.style.pointerEvents = "none";
      ghost.style.opacity = "1";
      ghost.style.zIndex = "100000";
      document.body.appendChild(ghost);
      branchDragGhostEl = ghost;

      dt.setDragImage(
        ghost,
        Math.round(e.clientX - rect.left),
        Math.round(e.clientY - rect.top),
      );
    }
  });

  branchStack?.addEventListener("dragend", () => {
    branchDragGhostEl?.remove();
    branchDragGhostEl = null;
    removeBranchDropSlot();
    if (draggedBranchCard) {
      draggedBranchCard.classList.remove("flowBranchPanel__branchCard--dragging");
    }
    draggedBranchCard = null;
  });

  branchStack?.addEventListener("dragenter", (e) => {
    if (!draggedBranchCard) return;
    e.preventDefault();
  });

  branchStack?.addEventListener("dragover", (e) => {
    if (!draggedBranchCard || !branchStack) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

    const under = document.elementFromPoint(e.clientX, e.clientY);
    const targetCard =
      under instanceof Element ? under.closest(".flowBranchPanel__branchCard") : null;
    const elseEl = branchStack.querySelector("[data-flow-branch-else]");

    if (!(targetCard instanceof HTMLElement)) {
      if (elseEl instanceof HTMLElement) moveBranchDropSlotBefore(elseEl);
      else removeBranchDropSlot();
      return;
    }

    if (targetCard === draggedBranchCard) {
      removeBranchDropSlot();
      return;
    }

    if (targetCard.hasAttribute("data-flow-branch-else") && elseEl instanceof HTMLElement) {
      moveBranchDropSlotBefore(elseEl);
      return;
    }

    const rect = targetCard.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      moveBranchDropSlotBefore(targetCard);
    } else {
      moveBranchDropSlotAfter(targetCard);
    }
  });

  branchStack?.addEventListener("drop", (e) => {
    if (!draggedBranchCard || !branchStack) return;
    e.preventDefault();

    if (branchDropSlotEl && branchDropSlotEl.parentNode === branchStack) {
      branchDropSlotEl.before(draggedBranchCard);
      removeBranchDropSlot();
    } else {
      removeBranchDropSlot();
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const targetCard =
        under instanceof Element ? under.closest(".flowBranchPanel__branchCard") : null;
      if (!(targetCard instanceof HTMLElement) || targetCard === draggedBranchCard) return;

      const elseEl = branchStack.querySelector("[data-flow-branch-else]");

      if (targetCard.hasAttribute("data-flow-branch-else") && elseEl) {
        elseEl.before(draggedBranchCard);
      } else {
        const rect = targetCard.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (e.clientY < mid) {
          targetCard.before(draggedBranchCard);
        } else {
          targetCard.after(draggedBranchCard);
        }
      }
    }

    normalizeElseBranchLast();
  });

  attachFlowSelect(document.getElementById("flowTriggerSelectObj"), document.getElementById("flowTriggerSelectList"), {
    onPick: (v) => syncCustomerConditionUi(v),
  });

  attachFlowSelect(
    document.getElementById("flowTriggerCustomerMetricBtn"),
    document.getElementById("flowTriggerCustomerMetricList"),
  );

  attachFlowSelect(
    document.getElementById("flowTriggerOperatorBtn"),
    document.getElementById("flowTriggerOperatorList"),
  );

  attachFlowSelect(
    document.getElementById("flowBranchEditorObjectBtn"),
    document.getElementById("flowBranchEditorObjectList"),
    {
      onPick: (v) => {
        const label = v.trim();
        if (label === "Customer") {
          if (branchPanel.classList.contains("flowBranchPanel--editingBranch3")) {
            applyBranchEditorCustomerBranch3EqualsOnePreset();
          } else {
            applyBranchEditorCustomerSubscriptionEqualsPreset("1");
          }
        } else {
          syncBranchEditorConditionDetailsFromObject(v);
        }
      },
    },
  );

  attachFlowSelect(
    document.getElementById("flowBranchEditorMetricBtn"),
    document.getElementById("flowBranchEditorMetricList"),
  );

  attachFlowSelect(
    document.getElementById("flowBranchEditorOperatorBtn"),
    document.getElementById("flowBranchEditorOperatorList"),
  );

  attachFlowSelect(
    document.getElementById("flowBranchEditorObject2Btn"),
    document.getElementById("flowBranchEditorObject2List"),
  );

  attachFlowSelect(
    document.getElementById("flowBranchEditor2ObjectBtn"),
    document.getElementById("flowBranchEditor2ObjectList"),
  );

  const scrollArea = triggerPanel.querySelector(".flowTriggerPanel__scroll");
  scrollArea?.addEventListener(
    "scroll",
    () => {
      for (const s of flowSelects) {
        if (s.isExpanded()) s.position();
      }
    },
    { passive: true }
  );

  const branchScroll = branchPanel.querySelector(".flowTriggerPanel__scroll");
  branchScroll?.addEventListener(
    "scroll",
    () => {
      for (const s of flowSelects) {
        if (s.isExpanded()) s.position();
      }
    },
    { passive: true }
 );

  window.addEventListener("resize", () => {
    for (const s of flowSelects) {
      if (s.isExpanded()) s.position();
    }
  });

  document.addEventListener(
    "mousedown",
    (e) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      let hitOpen = false;
      for (const s of flowSelects) {
        if (!s.isExpanded()) continue;
        if (s.field.contains(t) || s.list.contains(t)) {
          hitOpen = true;
          break;
        }
      }
      if (hitOpen) return;
      closeAllSelects();
    },
    true
  );

  const objectSelectTrigger = document.getElementById("flowTriggerSelectObj");
  if (customerDetails && objectSelectTrigger) {
    syncCustomerConditionUi(
      objectSelectTrigger.querySelector(".flowTriggerPanel__selectText")?.textContent?.trim() ?? ""
    );
  }

  /** Slide 5 is data-slide-index="4" — leaving it closes panels */
  const FLOW_SLIDE_INDEX = 4;

  document.addEventListener("slideshow:change", (e) => {
    if (!(e instanceof CustomEvent) || typeof e.detail?.index !== "number") return;
    if (e.detail.index === FLOW_SLIDE_INDEX) {
      closeTrigger({ refocusTrigger: false });
      closeBranch({ refocusBranch: false });
      resetSlide5BranchSpawnState();
      return;
    }
    closeTrigger({ refocusTrigger: false });
    closeBranch({ refocusBranch: false });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const openSelect = flowSelects.find((s) => s.isExpanded());
    if (openSelect) {
      openSelect.setExpanded(false);
      e.preventDefault();
      return;
    }
    if (isBranchOpen() && editorCol && !editorCol.hidden) {
      exitBranchEditor();
      e.preventDefault();
      return;
    }
    if (isBranchOpen()) {
      closeBranch();
      e.preventDefault();
      return;
    }
    if (isTriggerOpen()) closeTrigger();
  });

  syncBranchApplyDisabledState();
  syncConditionalBranchNodeSubtitle();
})();

loadGraph()
  .then((g) => render(g))
  .catch((err) => {
    alert(`Failed to load the interactive map: ${String(err?.message ?? err)}`);
    console.error(err);
  });

// One-time migration: clean existing saved card images.
(() => {
  const run = async () => {
  migrateLegacyPersonalizationImageIfNeeded();

    // If there are no user-uploaded card images, skip entirely.
    let raw;
    try {
      raw = localStorage.getItem(NODE_CARD_IMAGE_KEY);
    } catch {
      raw = null;
    }
    if (!raw) return;

  try {
    for (const nodeId of ["personalization", "ab", "loyalty", "referral", "mail", "chat", "ads", "affiliates"]) {
      const img = getNodeCardImageDataUrl(nodeId);
      if (!img) continue;
      if (getNodeCardImageCleaned(nodeId)) continue;
      const cleaned = await normalizeBackgroundToWhite(img, { threshold: 42 });
      const enhanced = await enhanceForCrispDisplay(cleaned, { sharpenStrength: 0.55, maxLongEdge: 1200 });
      setNodeCardImageDataUrl(nodeId, enhanced);
      setNodeCardImageCleaned(nodeId, true);
    }
  } catch {
    // If it fails, don't block anything.
    }
  };

  // Defer heavy work until after initial render.
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => run(), { timeout: 1500 });
  } else {
    setTimeout(() => run(), 0);
  }
})();
