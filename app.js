const els = {
  stage: document.getElementById("stage"),
  viewport: document.getElementById("viewport"),
  edges: document.getElementById("edges"),
  nodes: document.getElementById("nodes"),
};

// Defensive: remove any stale hint element if present (e.g., old cached HTML).
document.getElementById("stageHint")?.remove();

const MERCHANT_LOGO_KEY = "merchantLogoDataUrl";
const MERCHANT_DEFAULT_LOGO_SRC = "./assets/merchant-logo.svg";
const NODE_CARD_IMAGE_KEY = "nodeCardImageDataUrlById";
const NODE_CARD_IMAGE_CLEANED_KEY = "nodeCardImageCleanedById";
const NODE_POSITIONS_KEY = "nodePositionsById";
// Legacy keys from earlier iterations (for backwards compatibility)
const LEGACY_PERSONALIZATION_IMAGE_KEY = "personalizationCardImageDataUrl";
const LEGACY_PERSONALIZATION_IMAGE_CLEANED_KEY = "personalizationCardImageCleaned";
const DEFAULT_CARD_IMAGE_BY_NODE_ID = {
  personalization: "./assets/cards/personalization.svg",
  ab: "./assets/cards/ab-testing.svg",
  loyalty: "./assets/cards/loyalty.svg",
  referral: "./assets/cards/referral.svg",
  mail: "./assets/cards/mailing-sms.svg",
  chat: "./assets/cards/customer-chat.svg",
  ads: "./assets/cards/advertising.svg",
  affiliates: "./assets/cards/affiliates.svg",
  data: "./assets/cards/customer-data.svg",
  crm: "./assets/cards/crm.png"
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

function saveNodePositionsFromGraph(graph) {
  try {
    /** @type {Record<string, {x:number,y:number}>} */
    const out = {};
    for (const n of graph.nodes) out[n.id] = { x: n.pos.x, y: n.pos.y };
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
  const c1 = { x: a.x + dx * 0.45, y: a.y };
  const c2 = { x: b.x - dx * 0.45, y: b.y };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
}

function approxNodeSize(nodeId) {
  // Must stay in sync with CSS sizes.
  if (nodeId === "merchant") return { w: 170, h: 72 };
  if (nodeId === "pre" || nodeId === "repeat" || nodeId === "measure") return { w: 220, h: 56 };
  // Any node with a custom card image becomes an "image card" size.
  if (getNodeCardImageDataUrl(nodeId)) return { w: 170, h: 140 };
  // Built-in image cards (some have defaults).
  if (nodeId === "personalization") return { w: 170, h: 140 };
  if (nodeId === "ab") return { w: 170, h: 140 };
  if (nodeId === "loyalty") return { w: 170, h: 140 };
  if (nodeId === "referral") return { w: 170, h: 140 };
  if (nodeId === "mail") return { w: 170, h: 140 };
  if (nodeId === "chat") return { w: 170, h: 140 };
  if (nodeId === "ads") return { w: 170, h: 140 };
  if (nodeId === "affiliates") return { w: 170, h: 140 };
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
  const categoryById = new Map(graph.categories.map((c) => [c.id, c]));
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const neighbors = computeNeighbors(graph.edges);
  const HUB_IDS = new Set(["repeat", "pre", "measure"]);

  const savedPositions = getSavedNodePositions();
  let hasCustomLayout = false;
  if (savedPositions) {
    for (const n of graph.nodes) {
      const p = savedPositions[n.id];
      if (!p || typeof p.x !== "number" || typeof p.y !== "number") continue;
      n.pos.x = p.x;
      n.pos.y = p.y;
      hasCustomLayout = true;
    }
  }

  if (!hasCustomLayout) {
    // Normalize the layout so cards are evenly spaced with no overlaps.
    layoutNoOverlap(graph, { padding: 34, iterations: 220, stiffness: 0.012 });
    // Constraint: align Repeat Purchase and Measure Performance horizontally.
    {
      const repeat = nodeById.get("repeat");
      const measure = nodeById.get("measure");
      if (repeat && measure) {
        const targetY = (repeat.pos.y + measure.pos.y) / 2;
        repeat.pos.y = targetY;
        measure.pos.y = targetY;
        layoutNoOverlap(graph, {
          padding: 34,
          iterations: 140,
          stiffness: 0.01,
          locks: { repeat: { lockY: true }, measure: { lockY: true } }
        });
      }
    }
    // Constraint: align Re-order & Cross-sell with CRM horizontally.
    {
      const reorder = nodeById.get("reorder");
      const crm = nodeById.get("crm");
      const repeat = nodeById.get("repeat");
      if (reorder && crm) {
        // Prefer: left of and slightly above Repeat Purchase, while staying visually near CRM.
        const baseY = repeat ? repeat.pos.y : crm.pos.y;
        reorder.pos.x = repeat ? repeat.pos.x - 260 : reorder.pos.x - 120;
        reorder.pos.y = Math.min(crm.pos.y - 60, baseY - 80) + (156 - 88);
        layoutNoOverlap(graph, {
          padding: 34,
          iterations: 140,
          stiffness: 0.01,
          locks: { reorder: { lockY: true, lockX: true } }
        });
      }
    }
    // Constraint: nudge Post‑Purchase Upsell to the left.
    {
      const upsell = nodeById.get("upsell");
      if (upsell) {
        upsell.pos.x -= 140;
        upsell.pos.y -= 24;
        layoutNoOverlap(graph, {
          padding: 34,
          iterations: 120,
          stiffness: 0.01,
          locks: { upsell: { lockX: true, lockY: true } }
        });
      }
    }
    // Constraint: move Subscriptions left by 64px.
    {
      const subscriptions = nodeById.get("subscriptions");
      if (subscriptions) {
        subscriptions.pos.x -= 64;
        layoutNoOverlap(graph, {
          padding: 34,
          iterations: 120,
          stiffness: 0.01,
          locks: { subscriptions: { lockX: true } }
        });
      }
    }
    // Constraint: keep Advertising spaced below Customer chat.
    {
      const chat = nodeById.get("chat");
      const ads = nodeById.get("ads");
      if (chat && ads) {
        const a = approxNodeSize("chat");
        const b = approxNodeSize("ads");
        const gap = 28; // desired padding between cards
        const minDy = (a.h + b.h) / 2 + gap;
        if (ads.pos.y - chat.pos.y < minDy) {
          ads.pos.y = chat.pos.y + minDy;
        }
        // Nudge a bit further down for visual breathing room.
        ads.pos.y += 12;
        layoutNoOverlap(graph, {
          padding: 34,
          iterations: 140,
          stiffness: 0.01,
          locks: { ads: { lockY: true } }
        });
      }
    }

    // Constraint: move Subscriptions section down by 88px (and keep its connected
    // Repeat Purchase cluster together).
    {
      const ids = ["repeat", "subscriptions", "reorder", "upsell"];
      let changed = false;
      for (const id of ids) {
        const n = nodeById.get(id);
        if (!n) continue;
        n.pos.y += 88;
        changed = true;
      }
      if (changed) {
        layoutNoOverlap(graph, {
          padding: 34,
          iterations: 120,
          stiffness: 0.01,
          locks: {
            repeat: { lockY: true },
            subscriptions: { lockY: true },
            reorder: { lockY: true },
            upsell: { lockY: true }
          }
        });
      }
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
      const cardImageSrc =
        getNodeCardImageDataUrl(n.id) || DEFAULT_CARD_IMAGE_BY_NODE_ID[n.id] || null;
      const isBuiltInImageCard =
        n.id === "personalization" ||
        n.id === "ab" ||
        n.id === "loyalty" ||
        n.id === "referral" ||
        n.id === "mail" ||
        n.id === "chat" ||
        n.id === "ads" ||
        n.id === "affiliates" ||
        n.id === "data" ||
        n.id === "crm";
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
          const img = /** @type {HTMLImageElement} */ (document.createElement("img"));
          img.className = "node__comboLogo";
          img.alt =
            n.id === "ab"
              ? "A/B testing tools"
              : n.id === "loyalty"
                ? "Loyalty tools"
                : n.id === "referral"
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
                            : n.id === "crm"
                              ? "CRM"
                  : "Personalization tools";
          img.loading = "lazy";
          img.decoding = "async";
          img.src = cardImageSrc;
          btn.appendChild(img);
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
    rainActive = true;
    ensureRainEl();
    // Spawn rate: steady drizzle
    rainTimer = window.setInterval(() => {
      // sprinkle a couple per tick for density
      spawnEmoji();
      if (Math.random() < 0.6) spawnEmoji();
    }, 220);
  };

  const stopEmojiRain = () => {
    rainActive = false;
    if (rainTimer != null) {
      window.clearInterval(rainTimer);
      rainTimer = null;
    }
    // Let existing emojis finish; remove the container after a short grace period.
    if (rainEl) {
      const el = rainEl;
      rainEl = null;
      window.setTimeout(() => el.remove(), 3500);
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
    const btn = t?.closest?.(".node");
    if (!(btn instanceof HTMLButtonElement)) return;
    const id = btn.dataset.id || null;
    if (id === "merchant") {
      reveal(["repeat", "pre", "measure"]);
    } else if (id && HUB_IDS.has(id)) {
      const kids = [...(neighbors.get(id) ?? [])].filter((x) => x !== "merchant");
      reveal(kids);
    }
    setSelected(id);
  });

  function resetView(animate = true) {
    const r = els.stage.getBoundingClientRect();
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

  // Tiny UX: click empty space clears selection.
  els.stage.addEventListener("click", (e) => {
    if (!(e.target instanceof Element)) return;
    if (e.target.closest(".node")) return;
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

function initSlideshowPagination() {
  const nav = document.querySelector(".slideshowPagination");
  const list = document.getElementById("slideshowDots");
  if (!nav || !list) return;

  const count = Math.max(1, Number.parseInt(nav.dataset.slideCount || "1", 10) || 1);
  list.replaceChildren();

  let current = 0;

  const setActive = (index) => {
    if (index < 0 || index >= count) return;
    current = index;
    const buttons = list.querySelectorAll(".slideshowPagination__dot");
    buttons.forEach((b, j) => {
      const on = j === index;
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
    document.dispatchEvent(
      new CustomEvent("slideshow:change", { detail: { index, count } })
    );
  };

  for (let i = 0; i < count; i++) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `slideshowPagination__dot${i === 0 ? " is-active" : ""}`;
    btn.setAttribute("aria-label", `Slide ${i + 1} of ${count}`);
    if (i === 0) btn.setAttribute("aria-current", "true");
    btn.addEventListener("click", () => setActive(i));
    li.appendChild(btn);
    list.appendChild(li);
  }

  const isTypingTarget = (el) => {
    if (!(el instanceof HTMLElement)) return false;
    const tag = el.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    return el.isContentEditable;
  };

  const onSlideshowArrowKey = (e) => {
    const key = e.key;
    if (key !== "ArrowRight" && key !== "ArrowLeft" && key !== "ArrowUp" && key !== "ArrowDown") return;
    const t = e.target;
    if (t instanceof HTMLElement && isTypingTarget(t)) return;
    e.preventDefault();
    if (key === "ArrowRight" || key === "ArrowDown") setActive((current + 1) % count);
    else setActive((current - 1 + count) % count);
  };

  // Capture on window so arrows work even when focus is on role="application" (stage)
  // or when bubbling would otherwise miss document.
  window.addEventListener("keydown", onSlideshowArrowKey, true);

  window.slideshowPagination = {
    goTo: setActive,
    next: () => setActive((current + 1) % count),
    prev: () => setActive((current - 1 + count) % count),
    get index() {
      return current;
    },
    get count() {
      return count;
    }
  };
}

initSlideshowPagination();

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

