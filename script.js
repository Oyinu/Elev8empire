/* ═══════════════════════════════════════════════════════════════
   ELEV8 EMPIRE — Vanilla JS SPA (website)
   Idle tycoon: businesses, tap income, stocks & crypto, real estate,
   luxury assets, net-worth leaderboard.
   Backend: Supabase RPCs from schema.sql (all writes are server-side).
   Auth: Supabase Auth (email + password).
═══════════════════════════════════════════════════════════════ */

// ─── CONFIG ────────────────────────────────────────────────────
const SUPABASE_URL = "https://cyzrzxskhnqgrlnhyvvg.supabase.co"; // e.g. https://abcd1234.supabase.co
const SUPABASE_ANON = "sb_publishable_bYUxe24icacm8VbI-8_s2g_mbmsqD8d"; // Project Settings > API > anon public
const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

async function authHeaders() {
  const { data } = await sbClient.auth.getSession();
  const token = data.session?.access_token || SUPABASE_ANON;
  return { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

const SYNC_EVERY_MS = 20000; // full state resync with the server
const TAP_FLUSH_MS = 1500; // taps are batched and sent together
const MAX_TAPS_PER_CALL = 120;
const MILESTONES = [
  { at: 25, mult: 2 },
  { at: 50, mult: 4 },
  { at: 100, mult: 8 },
];

// ─── ICONS ─────────────────────────────────────────────────────
function svgIcon(inner, viewBox = "0 0 24 24") {
  return `<svg class="icon" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

const ICONS = {
  lock: svgIcon(
    `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>`,
  ),
  arrowRight: svgIcon(`<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>`),
  user: svgIcon(
    `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  ),
  zap: svgIcon(
    `<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>`,
  ),
  home: svgIcon(
    `<path d="m3 9 9-7 9 7"/><path d="M9 22V12h6v10"/><path d="M21 9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9"/>`,
  ),
  building: svgIcon(
    `<path d="M6 22V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v18"/><path d="M15 22V11a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11"/><path d="M3 22h18"/><path d="M9 8h1M9 12h1M9 16h1"/>`,
  ),
  landmark: svgIcon(
    `<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>`,
  ),
  crown: svgIcon(
    `<path d="M4 18 2 7l5 4 5-7 5 7 5-4-2 11Z"/><path d="M4 18h16v3H4z"/>`,
  ),
  pointer: svgIcon(`<path d="M4 4l16 7.5-7 1.5-1.5 7z"/>`),
  gift: svgIcon(
    `<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8"/><path d="M16.5 8a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8"/>`,
  ),
  sparkles: svgIcon(
    `<path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z"/>`,
  ),
  award: svgIcon(
    `<circle cx="12" cy="8" r="6"/><path d="m15.5 12.9 1.5 8.1-5-3-5 3 1.5-8.1"/>`,
  ),
  wrench: svgIcon(
    `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>`,
  ),
  trophy: svgIcon(
    `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`,
  ),
  alertTriangle: svgIcon(
    `<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>`,
  ),
  checkCircle: svgIcon(
    `<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.3 2.3L16 10"/>`,
  ),
  shoppingBag: svgIcon(
    `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>`,
  ),
  store: svgIcon(
    `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>`,
  ),
  restaurant: svgIcon(
    `<path d="M7 2v9"/><path d="M4 2v5a3 3 0 0 0 6 0V2"/><path d="M7 11v11"/><path d="M17 2c-2 2-3 4-3 7 0 2 1 3 3 3v10"/>`,
  ),
  taxi: svgIcon(
    `<path d="M5 17h14v-5l-2-5H7l-2 5z"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/><path d="M10 4h4"/>`,
  ),
  construction: svgIcon(
    `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>`,
  ),
  sports: svgIcon(
    `<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>`,
  ),
  bank: svgIcon(
    `<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>`,
  ),
  realestate: svgIcon(
    `<path d="m3 10 9-7 9 7"/><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 21v-6h4v6"/>`,
  ),
  car: svgIcon(
    `<path d="M5 17h14v-5l-2-5H7l-2 5z"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/>`,
  ),
  jet: svgIcon(
    `<path d="M2 16 10 12V5a2 2 0 0 1 4 0v7l8 4v2l-8-2v4l2 1.5V22l-4-1-4 1v-1.5L10 19v-4l-8 2z"/>`,
  ),
  yacht: svgIcon(
    `<path d="M12 3v13"/><path d="M12 4 5 14h7"/><path d="M12 7l6 7h-6"/><path d="M3 18h18l-2 3H5z"/>`,
  ),
  trending: svgIcon(`<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>`),
  dollar: svgIcon(
    `<path d="M12 2v20"/><path d="M17 6.5C16 5 14.5 4.5 12 4.5c-3 0-4.5 1.3-4.5 3s1.5 2.7 4.5 3.2 4.5 1.5 4.5 3.3-1.5 3-4.5 3c-2.5 0-4.2-.7-5.2-2.2"/>`,
  ),
  rocket: svgIcon(
    `<path d="M5 15c-1.5 1.3-2 5-2 5s3.7-.5 5-2"/><path d="M12 15 9 12a22 22 0 0 1 2-4 12.9 12.9 0 0 1 11-6c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z"/><path d="M9 12H4s.5-3 2-4c1.6-1.1 5 0 5 0"/><path d="M12 15v5s3-.5 4-2c1.1-1.6 0-5 0-5"/>`,
  ),
};

function rankIcon(i) {
  const cls = ["rank-gold", "rank-silver", "rank-bronze"][i];
  return cls ? `<span class="${cls}">${ICONS.award}</span>` : null;
}

// ─── STATE ─────────────────────────────────────────────────────
let profile = null; // row from `profiles` (shared with Elev8)
let S = null; // game state from empire_get_state
let currentScreen = "empire";
let marketTab = "stock";
let assetTab = "realestate";
let tradeSym = null;
let busy = false;
let pendingTaps = 0;
let tapTimer = null;
let tapInFlight = false;
let welcomed = false;

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// ─── NUMBER FORMATTING ─────────────────────────────────────────
const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
function fmt(n) {
  n = Number(n);
  if (!isFinite(n)) return "0";
  const neg = n < 0;
  n = Math.abs(n);
  let i = 0;
  while (n >= 1000 && i < SUFFIXES.length - 1) {
    n /= 1000;
    i++;
  }
  const digits = n < 10 ? 2 : n < 100 ? 1 : 0;
  // below 1,000 drop pointless trailing zeros ("$16" not "$16.0")
  const body = i === 0 ? String(parseFloat(n.toFixed(digits))) : n.toFixed(digits);
  return (neg ? "-" : "") + body + SUFFIXES[i];
}
const money = (n) => "$" + fmt(n);
function priceFmt(p) {
  p = Number(p);
  if (p >= 1000) return "$" + p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return "$" + p.toFixed(2);
  return "$" + p.toFixed(4);
}
function qtyFmt(q) {
  q = Number(q);
  if (q >= 100) return q.toFixed(1);
  if (q >= 1) return q.toFixed(3);
  return q.toFixed(6);
}

// ─── SUPABASE HELPERS ──────────────────────────────────────────
async function sb(path, method = "GET", body = null, extra = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${extra}`, {
    method,
    headers: {
      ...(await authHeaders()),
      Prefer:
        method === "POST"
          ? "resolution=merge-duplicates,return=representation"
          : method === "PATCH"
            ? "return=representation"
            : "",
    },
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : [];
}

async function sbRpc(fn, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(params),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return text ? JSON.parse(text) : null;
}

// ─── TOAST ─────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, icon = ICONS.sparkles) {
  const el = $("toast");
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2400);
}

// ─── CLICK FEEDBACK (sound + haptics) ──────────────────────────
let feedbackAudioCtx = null;
function playClickSound() {
  try {
    feedbackAudioCtx =
      feedbackAudioCtx ||
      new (window.AudioContext || window.webkitAudioContext)();
    if (feedbackAudioCtx.state === "suspended") feedbackAudioCtx.resume();
    const osc = feedbackAudioCtx.createOscillator();
    const gain = feedbackAudioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(680, feedbackAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, feedbackAudioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.1, feedbackAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, feedbackAudioCtx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(feedbackAudioCtx.destination);
    osc.start();
    osc.stop(feedbackAudioCtx.currentTime + 0.1);
  } catch (_) {}
}
function clickFeedback(style = "light") {
  playClickSound();
  try {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  } catch (_) {}
}
document.addEventListener(
  "click",
  (e) => {
    const target = e.target.closest(
      ".btn, .nav-item, .tab-btn, .buy-btn, .mkt-row, .trade-btn",
    );
    if (target && !target.disabled && !target.classList.contains("cant"))
      clickFeedback();
  },
  true,
);

// ─── NAVIGATION ────────────────────────────────────────────────
function navigate(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  const el = $(`screen-${screen}`);
  if (el) {
    el.classList.remove("hidden");
    el.classList.add("fade-in");
  }
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.screen === screen);
  });
  currentScreen = screen;
  window.scrollTo(0, 0);
  renderCurrent();
}

function renderCurrent() {
  if (!S) return;
  updateCashUI();
  if (currentScreen === "empire") renderEmpire();
  if (currentScreen === "tap") renderTap();
  if (currentScreen === "market") renderMarket();
  if (currentScreen === "assets") renderAssets();
  if (currentScreen === "ranks") renderRanks();
  if (currentScreen === "profile") renderProfile();
  if (tradeSym) renderTrade();
}

// ─── BOOT / AUTH ───────────────────────────────────────────────
async function boot() {
  if (SUPABASE_URL.startsWith("YOUR_") || SUPABASE_ANON.startsWith("YOUR_")) {
    setSplashMsg("Set SUPABASE_URL and SUPABASE_ANON at the top of script.js", ICONS.alertTriangle);
    return;
  }
  const { data } = await sbClient.auth.getSession();
  if (!data.session) {
    $("splash").classList.add("hidden");
    $("authScreen").classList.remove("hidden");
    return;
  }
  await startGame(data.session.user);
}

const EMAIL_DOMAIN = "elev8empire.vercel.app"; // hidden login emails, never used for real mail

async function doAuth(mode) {
  const username = $("authUsername").value.trim().toLowerCase();
  const password = $("authPass").value;
  const msg = $("authMsg");
  msg.textContent = "";
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    msg.textContent = "Username: 3–20 letters, numbers or _ only.";
    return;
  }
  if (password.length < 6) {
    msg.textContent = "Password must be at least 6 characters.";
    return;
  }
  const email = `${username}@${EMAIL_DOMAIN}`;
  const res = mode === "signup"
    ? await sbClient.auth.signUp({ email, password, options: { data: { username } } })
    : await sbClient.auth.signInWithPassword({ email, password });
  if (res.error) {
    const m = res.error.message || "";
    msg.textContent = /already registered/i.test(m) ? "That username is taken."
      : /invalid login/i.test(m) ? "Wrong username or password."
      : m;
    return;
  }
  if (!res.data.session) {
    msg.textContent = "Signup needs 'Confirm email' turned OFF in Supabase.";
    return;
  }
  await startGame(res.data.session.user);
}

async function logout() {
  await sbClient.auth.signOut();
  location.reload();
}

async function startGame(user) {
  $("authScreen").classList.add("hidden");
  $("splash").classList.remove("hidden");
  setSplashMsg("Loading your empire...");
  try {
    const rows = await sb("profiles", "GET", null, `?id=eq.${user.id}`);
    if (!rows.length) throw new Error("Profile not found");
    profile = rows[0];
    await refreshState();
  } catch (err) {
    setSplashMsg("Connection error. Please try again.", ICONS.alertTriangle);
    console.error(err);
    return;
  }

  $("splash").classList.add("hidden");
  $("app").classList.remove("hidden");
  navigate("empire");
  startLoops();

  if (!welcomed && S.collected_secs >= 120 && S.collected > 0) {
    welcomed = true;
    setTimeout(
      () => showToast(`Welcome back! +${money(S.collected)} while you were away`, ICONS.gift),
      600,
    );
  }
}

function setSplashMsg(msg, icon = null) {
  $("splashMsg").innerHTML = icon ? `<span class="toast-icon">${icon}</span>${msg}` : msg;
}

// ─── GAME STATE SYNC ───────────────────────────────────────────
async function refreshState() {
  await flushTaps();
  S = await sbRpc("empire_get_state", { p_user_id: profile.id });
  S._cashAtSync = S.cash; // lets net worth tick up with cash between syncs
  return S;
}

function startLoops() {
  // Smooth local income ticking (display only; server is the source of truth)
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 5);
    last = now;
    if (!S) return;
    S.cash += S.income_per_sec * dt;
    updateCashUI();
  }, 100);

  // Grey out anything you can't afford yet
  setInterval(updateAffordability, 400);

  // Resync with the server (also picks up market moves, boost expiry)
  setInterval(async () => {
    if (document.hidden || busy) return;
    try {
      await refreshState();
      renderCurrent();
    } catch (_) {}
  }, SYNC_EVERY_MS);

  document.addEventListener("visibilitychange", async () => {
    if (document.hidden || busy) return;
    try {
      await refreshState();
      renderCurrent();
    } catch (_) {}
  });
}

function updateCashUI() {
  if (!S) return;
  const c = $("cashBarVal");
  if (c) c.textContent = money(S.cash);
  const i = $("cashBarInc");
  if (i) i.textContent = `+${money(S.income_per_sec)}/s`;
  const nw = $("netWorthVal");
  if (nw) nw.textContent = money(S.net_worth + (S.cash - (S._cashAtSync ?? S.cash)));
  updateBoostButton();
}

function updateAffordability() {
  if (!S) return;
  document.querySelectorAll("[data-cost]").forEach((el) => {
    el.classList.toggle("cant", S.cash < Number(el.dataset.cost));
  });
}

function boostSecondsLeft() {
  if (!S?.boost_until) return 0;
  return Math.max(0, Math.floor((new Date(S.boost_until).getTime() - Date.now()) / 1000));
}

function updateBoostButton() {
  const btn = $("boostBtn");
  if (!btn || !S) return;
  const left = boostSecondsLeft();
  const cost = S.income_per_sec * 900;
  const sub = $("boostSub");
  if (left > 0) {
    const m = Math.floor(left / 60);
    const s = String(left % 60).padStart(2, "0");
    sub.textContent = `x2 active · ${m}:${s} left`;
  } else {
    sub.textContent = `${money(cost)} · 30 min of x2`;
  }
  btn.dataset.cost = String(cost);
  const d = $("dailyBtn");
  if (d) {
    d.disabled = !S.daily_available;
    $("dailySub").textContent = S.daily_available ? "Ready to claim" : "Come back tomorrow";
  }
}

// ─── ACTION WRAPPER ────────────────────────────────────────────
const ERRORS = {
  insufficient_funds: "Not enough cash",
  locked: "Not unlocked yet",
  invalid_amount: "Invalid amount",
  no_income: "Build a business first",
  already_claimed: "Already claimed today",
  nothing_to_sell: "Nothing to sell",
  not_found: "Item not found",
};

async function act(fn, okMsg, icon = ICONS.checkCircle) {
  if (busy) return null;
  busy = true;
  try {
    await flushTaps();
    const res = await fn();
    if (res?.error) {
      showToast(ERRORS[res.error] || "Something went wrong", ICONS.alertTriangle);
      return res;
    }
    await refreshState();
    renderCurrent();
    if (okMsg) showToast(typeof okMsg === "function" ? okMsg(res) : okMsg, icon);
    return res;
  } catch (err) {
    console.error(err);
    showToast("Connection problem. Try again.", ICONS.alertTriangle);
    return null;
  } finally {
    busy = false;
  }
}

// ─── EMPIRE SCREEN (businesses) ────────────────────────────────
const bizCost = (b, n) =>
  b.base_cost * Math.pow(1.15, b.level) * ((Math.pow(1.15, n) - 1) / 0.15);

function bizMax(b) {
  let n = 0;
  while (n < 100 && bizCost(b, n + 1) <= S.cash) n++;
  return n;
}

function renderEmpire() {
  $("dashUsername").textContent = profile.username;
  const nw = $("netWorthVal");
  if (nw) nw.textContent = money(S.net_worth);
  $("multVal").textContent = `x${Number(S.multiplier).toFixed(2)}`;
  updateBoostButton();

  $("bizList").innerHTML = S.businesses
    .map((b) => {
      const owned = b.level > 0;
      const locked = !owned && S.net_worth < b.unlock;
      const next = MILESTONES.find((m) => b.level < m.at) || null;
      const prev = MILESTONES.filter((m) => m.at <= b.level).pop()?.at || 0;
      const pct = next ? Math.min(100, ((b.level - prev) / (next.at - prev)) * 100) : 100;
      const c1 = bizCost(b, 1);
      const c10 = bizCost(b, 10);
      const meta = owned
        ? `Lv ${b.level} · +${money(b.income)}/s`
        : locked
          ? `Unlocks at ${money(b.unlock)} net worth`
          : `+${money(b.base_income * S.multiplier)}/s per level`;
      return `
      <div class="card biz-card ${locked ? "locked" : ""}">
        <div class="biz-top">
          <div class="biz-icon">${locked ? ICONS.lock : ICONS[b.icon] || ICONS.building}</div>
          <div class="biz-info">
            <div class="biz-name">${esc(b.name)}</div>
            <div class="biz-meta">${meta}</div>
          </div>
        </div>
        ${
          locked
            ? ""
            : `
        <div class="biz-milestone">
          <div class="progress-track"><div class="progress-fill gold-fill" style="width:${pct}%"></div></div>
          <div class="biz-milestone-lbl">${next ? `x${next.mult} income at Lv ${next.at}` : "Max milestone reached"}</div>
        </div>
        <div class="biz-actions">
          <button class="buy-btn" data-cost="${c1}" onclick="buyBusiness('${b.id}',1)">
            <span class="buy-lbl">${owned ? "Upgrade" : "Open"} x1</span><span class="buy-cost">${money(c1)}</span>
          </button>
          <button class="buy-btn" data-cost="${c10}" onclick="buyBusiness('${b.id}',10)">
            <span class="buy-lbl">x10</span><span class="buy-cost">${money(c10)}</span>
          </button>
          <button class="buy-btn buy-max" data-cost="${c1}" onclick="buyBusiness('${b.id}','max')">
            <span class="buy-lbl">MAX</span><span class="buy-cost">${Math.max(bizMax(b), 0)} lvl</span>
          </button>
        </div>`
        }
      </div>`;
    })
    .join("");
  updateAffordability();
}

function buyBusiness(id, n) {
  const b = S.businesses.find((x) => x.id === id);
  if (!b) return;
  if (n === "max") n = bizMax(b);
  if (!n) return showToast("Not enough cash", ICONS.alertTriangle);
  act(
    () => sbRpc("empire_buy_business", { p_user_id: profile.id, p_business_id: id, p_levels: n }),
    `${b.name} +${n} level${n > 1 ? "s" : ""}`,
  );
}

function claimDaily() {
  act(
    () => sbRpc("empire_claim_daily", { p_user_id: profile.id }),
    (r) => `Daily reward! +${money(r.reward)}`,
    ICONS.gift,
  );
}

function activateBoost() {
  act(
    () => sbRpc("empire_activate_boost", { p_user_id: profile.id }),
    "Profit boost on: x2 income",
    ICONS.rocket,
  );
}

// ─── TAP SCREEN ────────────────────────────────────────────────
function renderTap() {
  $("tapValue").textContent = `+${money(S.tap_value)} per tap`;
  $("tapLevel").textContent = `Tap power Lv ${S.tap_level}`;
  $("tapTotal").textContent = `${Number(S.total_taps).toLocaleString()} total taps`;
  const btn = $("tapUpgradeBtn");
  btn.dataset.cost = S.tap_upgrade_cost;
  $("tapUpgradeCost").textContent = money(S.tap_upgrade_cost);
  updateAffordability();
}

function handleTap(e) {
  if (!S) return;
  const v = S.tap_value;
  S.cash += v;
  S.total_taps++;
  pendingTaps++;
  spawnTapParticle(e, `+${fmt(v)}`);
  updateCashUI();
  $("tapTotal").textContent = `${Number(S.total_taps).toLocaleString()} total taps`;
  if (!tapTimer) tapTimer = setTimeout(flushTaps, TAP_FLUSH_MS);
}

async function flushTaps() {
  if (tapTimer) {
    clearTimeout(tapTimer);
    tapTimer = null;
  }
  if (!pendingTaps || tapInFlight || !profile) return;
  const n = Math.min(pendingTaps, MAX_TAPS_PER_CALL);
  pendingTaps -= n;
  tapInFlight = true;
  try {
    const r = await sbRpc("empire_tap", { p_user_id: profile.id, p_count: n });
    if (r?.cash != null && S) S.cash = Number(r.cash) + pendingTaps * S.tap_value;
  } catch (_) {
    pendingTaps += n; // retry on the next flush
  } finally {
    tapInFlight = false;
    if (pendingTaps && !tapTimer) tapTimer = setTimeout(flushTaps, TAP_FLUSH_MS);
  }
}

function spawnTapParticle(e, label) {
  const arena = $("tapArena");
  if (!arena) return;
  const r = arena.getBoundingClientRect();
  const x = (e?.clientX ?? r.left + r.width / 2) - r.left;
  const y = (e?.clientY ?? r.top + r.height / 2) - r.top;
  const p = document.createElement("div");
  p.className = "tap-particle";
  p.textContent = label;
  p.style.left = `${x}px`;
  p.style.top = `${y}px`;
  $("tapParticles").appendChild(p);
  setTimeout(() => p.remove(), 700);
}

function upgradeTap() {
  act(
    () => sbRpc("empire_upgrade_tap", { p_user_id: profile.id }),
    (r) => `Tap power Lv ${r.tap_level}`,
    ICONS.zap,
  );
}

// ─── MARKET (stocks & crypto) ──────────────────────────────────
function switchMarketTab(tab) {
  marketTab = tab;
  document.querySelectorAll("#marketTabs .tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === tab),
  );
  renderMarket();
}

function renderMarket() {
  document.querySelectorAll("#marketTabs .tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === marketTab),
  );
  const rows = S.market.filter((m) => m.kind === marketTab);
  const portfolio = S.market.reduce((sum, m) => sum + m.qty * m.price, 0);
  $("portfolioVal").textContent = money(portfolio);
  $("marketList").innerHTML = rows
    .map((m) => {
      const ch = (m.price / m.prev_price - 1) * 100;
      const up = ch >= 0;
      const held = m.qty * m.price;
      return `
      <button class="mkt-row" onclick="openTrade('${m.symbol}')">
        <div class="mkt-left">
          <div class="mkt-sym">${m.symbol}</div>
          <div class="mkt-name">${esc(m.name)}${m.qty > 0 ? ` · holding ${money(held)}` : ""}</div>
        </div>
        <div class="mkt-right">
          <div class="mkt-price">${priceFmt(m.price)}</div>
          <div class="mkt-chg ${up ? "up" : "down"}">${up ? "+" : ""}${ch.toFixed(2)}%</div>
        </div>
      </button>`;
    })
    .join("");
}

function openTrade(sym) {
  tradeSym = sym;
  $("tradeModal").classList.remove("hidden");
  renderTrade();
}
function closeTrade() {
  tradeSym = null;
  $("tradeModal").classList.add("hidden");
}

function renderTrade() {
  const m = S.market.find((x) => x.symbol === tradeSym);
  if (!m) return closeTrade();
  const ch = (m.price / m.prev_price - 1) * 100;
  const up = ch >= 0;
  const value = m.qty * m.price;
  const pl = m.qty > 0 ? (m.price / m.avg_cost - 1) * 100 : 0;
  $("tradeTitle").textContent = `${m.symbol} · ${m.name}`;
  $("tradePrice").textContent = priceFmt(m.price);
  const c = $("tradeChg");
  c.textContent = `${up ? "+" : ""}${ch.toFixed(2)}% (1h)`;
  c.className = `mkt-chg ${up ? "up" : "down"}`;
  $("tradeHold").textContent =
    m.qty > 0 ? `${qtyFmt(m.qty)} ${m.symbol} · ${money(value)}` : "You don't hold any";
  const plEl = $("tradePL");
  plEl.textContent =
    m.qty > 0 ? `${pl >= 0 ? "+" : ""}${pl.toFixed(2)}% vs your avg ${priceFmt(m.avg_cost)}` : "";
  plEl.className = `trade-pl ${pl >= 0 ? "up" : "down"}`;
  $("tradeCash").textContent = `Cash: ${money(S.cash)}`;
}

function doTrade(side, fraction) {
  if (!tradeSym) return;
  const sym = tradeSym;
  act(
    () =>
      sbRpc("empire_trade", {
        p_user_id: profile.id,
        p_symbol: sym,
        p_side: side,
        p_fraction: fraction,
      }),
    (r) => `${side === "buy" ? "Bought" : "Sold"} ${sym} · ${money(r.amount)}`,
    ICONS.trending,
  );
}

// ─── ASSETS (real estate, cars, jets, yachts) ──────────────────
function switchAssetTab(tab) {
  assetTab = tab;
  renderAssets();
}

function renderAssets() {
  document.querySelectorAll("#assetTabs .tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === assetTab),
  );
  const rows = S.assets.filter((a) => a.kind === assetTab);
  $("assetList").innerHTML = rows
    .map((a) => {
      const benefit =
        a.kind === "realestate"
          ? `+${money(a.income_per_sec * S.multiplier)}/s passive income`
          : `+${(a.prestige * 0.1).toFixed(1)}% income bonus`;
      return `
      <div class="card asset-card">
        <div class="biz-icon">${ICONS[a.kind]}</div>
        <div class="biz-info">
          <div class="biz-name">${esc(a.name)}</div>
          <div class="biz-meta">${benefit}</div>
          ${a.qty > 0 ? `<div class="asset-owned">Owned: ${a.qty}</div>` : ""}
        </div>
        <button class="buy-btn asset-buy" data-cost="${a.price}" onclick="buyAsset('${a.id}')">
          <span class="buy-lbl">Buy</span><span class="buy-cost">${money(a.price)}</span>
        </button>
      </div>`;
    })
    .join("");
  updateAffordability();
}

function buyAsset(id) {
  const a = S.assets.find((x) => x.id === id);
  if (!a) return;
  act(
    () => sbRpc("empire_buy_asset", { p_user_id: profile.id, p_asset_id: id, p_qty: 1 }),
    `Bought ${a.name}`,
  );
}

// ─── RANKS ─────────────────────────────────────────────────────
async function renderRanks() {
  const list = $("rankList");
  try {
    const rows = await sbRpc("empire_leaderboard", { p_limit: 50 });
    if (!rows?.length) {
      list.innerHTML = `<div class="loading-msg">No players yet. Be the first.</div>`;
      return;
    }
    list.innerHTML = rows
      .map((r, i) => {
        const me = r.user_id === profile.id;
        const medal = rankIcon(i);
        return `
        <div class="lb-row ${me ? "is-me" : ""}">
          <div class="lb-rank ${medal ? "medal" : ""}">${medal || i + 1}</div>
          <div class="lb-avatar">${ICONS.user}</div>
          <div style="flex:1;min-width:0">
            <div class="lb-name">${esc(r.username)}${me ? " (you)" : ""}</div>
            <div class="lb-sub">${esc(r.rank_label || "Newcomer")}</div>
          </div>
          <div class="lb-ep">
            <div class="lb-ep-val">${money(r.net_worth)}</div>
            <div class="lb-ep-lbl">NET WORTH</div>
          </div>
        </div>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="loading-msg">Couldn't load rankings.</div>`;
  }
}

// ─── PROFILE ───────────────────────────────────────────────────
function renderProfile() {
  $("profileName").textContent = profile.username;
  $("profileRankBadge").textContent = profile.rank_label || "Newcomer";
  $("profileNW").textContent = money(S.net_worth);
  $("profileInc").textContent = `${money(S.income_per_sec)}/s`;
  $("profileTapLv").textContent = `Lv ${S.tap_level}`;
  $("profileTaps").textContent = Number(S.total_taps).toLocaleString();

  const prestige = S.assets.reduce((s, a) => s + a.prestige * a.qty, 0) * 0.1;
  const boosted = boostSecondsLeft() > 0;
  $("bonusList").innerHTML = [
    ["Base", "x1.00"],
    ["Luxury collection", `+${prestige.toFixed(1)}%`],
    ["Profit boost", boosted ? "x2" : "off"],
  ]
    .map(
      ([k, v]) =>
        `<div class="bonus-row"><span>${k}</span><b>${v}</b></div>`,
    )
    .join("");
}

// ─── INIT ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", boot);