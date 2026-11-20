/* Modern Classics · Kokteyl Kitabı – kokteyl, spritz, shot, backbar ve snack havuzları */
(() => {
  "use strict";
  const DASH = 0.8;
  const D = {}; const IT = {}, PR = {}, CK = {}, FAM = {}, BB = {}, SN = {};
  const STATUS = { menu: "Menüye Al", revize: "Revize Et", elendi: "Elendi" };
  const BASES = ["Rom", "Cin", "Viski", "Agave", "Diğer", "Zero"];
  const PREP_LIMIT = 240;
  const VAT_DRINK = 19, VAT_FOOD = 7;
  const SET = {
    cocktail: { n: "Kokteyl", list: "#/kokteyller", g: 0.15 },
    zero: { n: "Alkolsüz", list: "#/kokteyller?f=zero", g: 0.15 },
    spritz: { n: "Spritz", list: "#/spritz", g: 0.10 },
    shot: { n: "Shot", list: "#/shot", g: 0 },
    backbar: { n: "Backbar / Şişe", list: "#/backbar" },
    snack: { n: "Snack", list: "#/snack" }
  };
  const MENU_ORDER = ["cocktail", "zero", "spritz", "shot", "backbar", "snack"];

  /* ---------- Depolama ---------- */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("mc_" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mc_" + k, JSON.stringify(v)); } catch (e) { /* yok */ } }
  };
  const S = { notes: LS.get("notes", {}), prices: LS.get("prices", {}), week: LS.get("week", {}), weekDef: LS.get("weekDef", 15), defPrice: LS.get("defPrice", { cocktail: 14.5, zero: 8.5 }) };
  const save = (k) => LS.set(k, S[k]);

  /* ---------- Yardımcılar ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nf = (n, d) => (isFinite(n) ? (+n).toLocaleString("tr-TR", { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 0 : d }) : "—");
  const eur = (n) => (isFinite(n) ? "€" + (+n).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");
  const pct = (n) => (isFinite(n) ? "%" + nf(n, 0) : "—");
  const fold = (s) => String(s || "").toLocaleLowerCase("tr").replace(/ş/g, "s").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[éè]/g, "e").replace(/ñ/g, "n").replace(/’/g, "'");
  function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1900); }
  const amt = (q) => nf(q, q % 1 ? (q * 10 % 1 ? 2 : 1) : 0);

  /* ---------- Router ---------- */
  let CUR = null, lastHash = null;
  function parseHash() {
    const h = location.hash && location.hash.indexOf("#/") === 0 ? location.hash : (CUR || "#/");
    const [path, qs] = h.replace(/^#\/?/, "").split("?");
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    const q = {}; (qs || "").split("&").filter(Boolean).forEach((kv) => { const [k, v] = kv.split("="); q[decodeURIComponent(k)] = decodeURIComponent(v || ""); });
    return { parts, q, h };
  }
  function go(h) {
    CUR = h;
    if (location.hash === h) { render(); return; }
    try { location.hash = h; } catch (e) { /* yok */ }
    setTimeout(() => { if (location.hash !== h) render(); }, 60);
  }

  /* ---------- Hesaplar ---------- */
  function price(id) { const o = S.prices[id]; return o != null ? +o : IT[id].price; }
  const memo = {};
  function unitCost(ref) {
    if (IT[ref]) { const it = IT[ref]; return it.pack ? price(ref) / it.pack : 0; }
    const p = PR[ref]; if (!p) return 0;
    if (memo[ref] != null) return memo[ref];
    let s = 0; p.ings.forEach(([r, q]) => { s += unitCost(r) * q; });
    return (memo[ref] = s / p.y);
  }
  const resetMemo = () => { Object.keys(memo).forEach((k) => delete memo[k]); };
  const refName = (r) => (IT[r] ? IT[r].n : PR[r] ? PR[r].n : r);
  const refAbv = (r) => (IT[r] ? IT[r].abv || 0 : PR[r] ? PR[r].abv || 0 : 0);
  const lineMl = (l) => (l[2] === "d" ? l[1] * DASH : l[1]);
  const lineCost = (l) => unitCost(l[0]) * lineMl(l);
  const setOf = (c) => (c.set === "cocktail" && c.zp ? "zero" : c.set);
  function drinkCost(c) { return c.ings.reduce((s, l) => s + lineCost(l), 0) + (SET[setOf(c)].g || 0); }
  const note = (id) => S.notes[id] || {};
  function grossOf(id, noOverride) {
    const n = note(id); if (!noOverride && n.price != null && n.price !== "") return +n.price;
    if (CK[id]) { const c = CK[id]; return c.sell != null ? c.sell : (setOf(c) === "zero" ? S.defPrice.zero : S.defPrice.cocktail); }
    if (BB[id]) return BB[id].sell;
    if (SN[id]) return SN[id].sell;
    return 0;
  }
  const netOf = (gross, vat) => gross / (1 + vat / 100);
  const marginOf = (cost, gross, vat) => { const n = netOf(gross, vat); return n ? (n - cost) / n * 100 : 0; };
  const pourOf = (cost, gross, vat) => { const n = netOf(gross, vat); return n ? cost / n * 100 : 0; };
  /* Backbar */
  function bbBuy(b) { if (S.prices[b.id] != null) return +S.prices[b.id]; if (b.item) return price(b.item) * b.size / IT[b.item].pack; return b.buy; }
  function bbCost(b) { const buy = bbBuy(b); return b.sparkling ? buy / b.size * b.glass : buy / b.size * b.pour + (b.mixer || 0); }
  const snCost = (s) => (S.prices[s.id] != null ? +S.prices[s.id] : s.cost);
  function itemEcon(id) {
    if (CK[id]) { const c = CK[id], cost = drinkCost(c), g = grossOf(id); return { cost, gross: g, margin: marginOf(cost, g, VAT_DRINK), pour: pourOf(cost, g, VAT_DRINK) }; }
    if (BB[id]) { const b = BB[id], cost = bbCost(b), g = grossOf(id); return { cost, gross: g, margin: marginOf(cost, g, VAT_DRINK), pour: pourOf(cost, g, VAT_DRINK) }; }
    if (SN[id]) { const s = SN[id], cost = snCost(s), g = grossOf(id); return { cost, gross: g, margin: marginOf(cost, g, VAT_FOOD), pour: pourOf(cost, g, VAT_FOOD) }; }
    return { cost: 0, gross: 0, margin: 0, pour: 0 };
  }
  function itemSet(id) { if (CK[id]) return setOf(CK[id]); if (BB[id]) return "backbar"; if (SN[id]) return "snack"; return ""; }
  function itemName(id) { return (CK[id] || BB[id] || SN[id] || {}).n || id; }
  function itemHref(id) { if (CK[id]) return "#/k/" + id; if (BB[id]) return "#/b/" + id; if (SN[id]) return "#/s/" + id; return "#/"; }

  /* Batch modeli (Dave Arnold stirred denklemi; sadece full formatta su batch’e girer) */
  function batchModel(c) {
    const still = c.ings.filter((l) => l[2] !== "t" && l[2] !== "f");
    const tops = c.ings.filter((l) => l[2] === "t");
    const floats = c.ings.filter((l) => l[2] === "f");
    const vol = still.reduce((s, l) => s + lineMl(l), 0);
    const alc = still.reduce((s, l) => s + lineMl(l) * refAbv(l[0]) / 100, 0);
    const x = vol ? alc / vol : 0;
    const d = c.fmt === "full" ? Math.max(0, -1.21 * x * x + 1.246 * x + 0.145) : 0;
    const water = vol * d, per = vol + water;
    return { still, tops, floats, vol, alc, x, d, water, per, finalAbv: per ? alc / per * 100 : 0 };
  }
  function storageNote(c, m) {
    if (c.fmt === "full" || c.fmt === "shot") {
      if (m.finalAbv >= 25) return { t: "Dondurucu (-18°C)", ok: true };
      return { t: `Buzdolabı 2–4°C (ABV %${nf(m.finalAbv, 1)}: -18°C’de buzlanır)`, ok: false };
    }
    return { t: "Buzdolabı 2–4°C", ok: true };
  }
  function serveLine(c, m) {
    const fl = m.floats.map((l) => `${amt(l[1])} ${l[2] === "d" ? "dash" : "ml"} ${refName(l[0])}`).join(", ");
    const tp = m.tops.map((l) => `${amt(l[1])} ml ${refName(l[0])}`).join(" + ");
    let s;
    if (c.fmt === "full") s = `Batch’ten <b>${nf(m.per, 0)} ml</b> dök · ${esc(c.ice)}`;
    else if (c.fmt === "shake") s = `Batch’ten <b>${nf(m.per, 0)} ml</b> ölç · buzla 8–10 sn sert çalkala · ince süz · ${esc(c.ice)}`;
    else if (c.fmt === "top") s = `Premix’ten <b>${nf(m.per, 0)} ml</b> buza dök · <b>${esc(tp)}</b> ile tamamla · bir kez karıştır`;
    else if (c.fmt === "shot") s = `Premix’ten <b>${nf(m.per, 0)} ml</b> soğuk shot bardağına dök (5 sn)`;
    else s = `Punch’tan <b>${nf(m.per, 0)} ml</b> dök · ${esc(c.ice)}`;
    if (fl) s += ` · Üstüne: <b>${esc(fl)}</b>`;
    return s;
  }
  const preps = (c) => Array.from(new Set(c.ings.map((l) => l[0]).filter((r) => PR[r])));
  const usedBy = (pid) => D.drinks.filter((c) => c.ings.some((l) => l[0] === pid));
  const usedInPreps = (pid) => D.preps.filter((p) => p.ings.some((l) => l[0] === pid));

  /* ---------- UI parçaları ---------- */
  const head = (k, t, sub, lead) => `<header class="sec-head"><div class="sec-kicker">${k}</div><h1>${t}${sub ? `<em>${sub}</em>` : ""}</h1>${lead ? `<p class="lead">${lead}</p>` : ""}</header>`;
  const starsTxt = (r) => (r ? "★".repeat(r) + "☆".repeat(5 - r) : "");
  const stPill = (id) => { const n = note(id); return n.st ? `<span class="stpill ${n.st}">${STATUS[n.st]}</span>` : ""; };
  const fmtPill = (c) => `<span class="fmtpill">${esc(D.formats[c.fmt].n)}</span>`;
  const ingSummary = (c) => c.ings.filter((l) => l[2] !== "d").map((l) => `${amt(l[1])} ${refName(l[0])}`).join(" · ");
  const mcls = (m) => (m >= 78 ? "var(--green)" : m >= 70 ? "var(--accent)" : "#ec8a72");
  function cCard(c) {
    const n = note(c.id), e = itemEcon(c.id), st = setOf(c);
    return `<a class="card ccard" href="#/k/${c.id}">
      <div class="top"><h3>${esc(c.n)}</h3>${stPill(c.id)}</div>
      <span class="de" lang="de">${esc(c.de)}</span>
      <span class="ings">${esc(ingSummary(c))}</span>
      <div class="foot"><span class="tags">${fmtPill(c)}${st === "cocktail" ? `<span class="pill">${esc(c.base)}</span>` : ""}</span><span class="mono" style="font-size:12.5px">${n.r ? `<span class="mini-stars">${starsTxt(n.r)}</span> ` : ""}${eur(e.cost)} → ${eur(e.gross)} · <span style="color:${mcls(e.margin)}">${pct(e.margin)}</span></span></div>
    </a>`;
  }
  function pCard(p) {
    const u = usedBy(p.id).length;
    return `<a class="card" href="#/h/${p.id}">
      <div class="row"><h3>${esc(p.n)}</h3><span class="pill accent">${u} içki</span></div>
      <span class="sub">${esc(p.cat)} · ${esc(p.tech)}</span>
      <span class="txt">Aktif ${p.act} dk · Toplam ${esc(p.tot)} · Raf: ${esc(p.shelf)}</span>
      <span class="sub">${eur(unitCost(p.id) * 1000)} / L</span>
    </a>`;
  }
  function bCard(b) {
    const e = itemEcon(b.id);
    return `<a class="card" href="#/b/${b.id}">
      <div class="row"><h3>${esc(b.n)}</h3>${stPill(b.id)}</div>
      <span class="sub">${esc(b.cat)} · %${nf(b.abv, 1)}</span>
      <span class="txt">${esc(b.prof)}</span>
      <div class="foot" style="display:flex;justify-content:space-between;gap:6px;margin-top:auto;flex-wrap:wrap"><span class="mono" style="font-size:12.5px">${b.sparkling ? "0,1 L" : (b.mixer ? "4 cl + tonik" : "4 cl")}: ${eur(e.cost)} → ${eur(e.gross)}</span><span class="mono" style="font-size:12.5px;color:${mcls(e.margin)}">marj ${pct(e.margin)}</span></div>
    </a>`;
  }
  function sCard(s) {
    const e = itemEcon(s.id);
    return `<a class="card" href="#/s/${s.id}">
      <div class="row"><h3 lang="it">${esc(s.n)}</h3>${stPill(s.id)}</div>
      <span class="de" lang="de" style="font-size:13px;color:var(--muted);font-style:italic">${esc(s.de)}</span>
      <span class="sub">${esc(s.cat)} · ${esc(s.portion)} · raf: ${esc(s.shelf)}</span>
      <span class="txt">Eşleşme: ${esc(s.pairs)}</span>
      <div class="foot" style="display:flex;justify-content:space-between;gap:6px;margin-top:auto;flex-wrap:wrap"><span class="mono" style="font-size:12.5px">${eur(e.cost)} → ${eur(e.gross)}</span><span class="mono" style="font-size:12.5px;color:${mcls(e.margin)}">marj ${pct(e.margin)}</span></div>
    </a>`;
  }

  /* Ortak tadım defteri bloğu (+ fiyat override) */
  function notebookHtml(id) {
    const n = note(id), def = grossOf(id, true);
    return `<div class="calc" style="border-color:rgba(214,167,92,.35)">
      <div class="stars" id="stars">${[1, 2, 3, 4, 5].map((i) => `<button data-r="${i}" class="${n.r >= i ? "on" : ""}" aria-label="${i} puan">★</button>`).join("")}</div>
      <div class="status" id="status" style="margin-top:12px">${Object.keys(STATUS).map((k) => `<button data-st="${k}" class="${k} ${n.st === k ? "on" : ""}">${STATUS[k]}</button>`).join("")}</div>
      <div class="field" style="margin-top:12px;max-width:240px"><label for="np">Menü fiyatın (€, KDV dahil)</label><input id="np" type="number" step="0.1" min="0" inputmode="decimal" value="${n.price != null && n.price !== "" ? n.price : ""}" placeholder="${nf(def, 2)}"></div>
      <div class="field" style="margin-top:12px"><label for="nt">Tadım notu</label><textarea id="nt" class="inp" placeholder="ör. Asit biraz yüksek; misafir tepkisi iyi; fiyatı 0,50 € artır.">${esc(n.note || "")}</textarea></div>
      <p class="calc-note" id="nsaved">${n.d ? "Son güncelleme: " + new Date(n.d).toLocaleString("tr-TR") : ""}</p>
    </div>`;
  }
  function bindNotebook(id, onChange) {
    const upd = (patch) => { S.notes[id] = Object.assign({}, S.notes[id], patch, { d: Date.now() }); save("notes"); $("#nsaved").textContent = "Kaydedildi · " + new Date().toLocaleTimeString("tr-TR"); setActive(null); };
    $$("#stars button").forEach((b) => b.addEventListener("click", () => { const r = +b.dataset.r; const nr = note(id).r === r ? 0 : r; upd({ r: nr }); $$("#stars button").forEach((x) => x.classList.toggle("on", +x.dataset.r <= nr)); }));
    $$("#status button").forEach((b) => b.addEventListener("click", () => { const s = note(id).st === b.dataset.st ? "" : b.dataset.st; upd({ st: s }); $$("#status button").forEach((x) => x.classList.toggle("on", x.dataset.st === s)); toast(s ? STATUS[s] : "Durum kaldırıldı"); }));
    let t; $("#nt").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => upd({ note: e.target.value }), 400); });
    $("#np").addEventListener("change", (e) => { upd({ price: e.target.value === "" ? null : +e.target.value }); if (onChange) setTimeout(onChange, 0); });
  }
  const econBox = (e, vat, label) => `<div class="results" style="margin-top:0"><div class="res"><span>${label || "Maliyet"}</span><strong>${eur(e.cost)}</strong></div><div class="res hl"><span>Satış (KDV %${vat} dahil)</span><strong>${eur(e.gross)}</strong></div><div class="res"><span>Net satış</span><strong>${eur(netOf(e.gross, vat))}</strong></div><div class="res ${e.margin >= 75 ? "good" : e.margin < 65 ? "bad" : ""}"><span>Kâr marjı</span><strong>${pct(e.margin)}</strong></div><div class="res"><span>Pour / food cost</span><strong>${nf(e.pour, 1)} %</strong></div></div>`;

  /* ---------- Navigasyon ---------- */
  const NAV = [
    { h: "#/kokteyller", t: "Kokteyller", k: "kokteyl", no: "◎" },
    { h: "#/spritz", t: "Spritz Havuzu", k: "spritz", no: "◍" },
    { h: "#/shot", t: "Shot Havuzu", k: "shot", no: "▪" },
    { h: "#/backbar", t: "Backbar & Şişe", k: "backbar", no: "▮" },
    { h: "#/snack", t: "Aperitivo Snack", k: "snack", no: "◒" },
    { h: "#/hazirliklar", t: "Ev Hazırlıkları", k: "hazirlik", no: "⚗" },
    { h: "#/defter", t: "Tadım Defteri", k: "defter", no: "✎" },
    { h: "#/menu", t: "Menü Taslağı", k: "menu", no: "☰" },
    { h: "#/fiyatlar", t: "Fiyatlar & Yedek", k: "fiyat", no: "€" }
  ];
  const ICON = {
    glass: '<path d="M6 3h12l-1 7a5 5 0 0 1-10 0Z"/><path d="M12 15v6M8 21h8"/>',
    pool: '<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>',
    prep: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7 15h10"/>',
    note: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13 7 4 4"/>',
    menu: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>'
  };
  function buildNav() {
    $("#nav-main").innerHTML = `<div class="nav-label">Bölümler</div>` + NAV.map((n) => `<a class="nav-item" data-k="${n.k}" href="${n.h}"><span class="nav-no">${n.no}</span><span>${n.t}</span>${n.k === "menu" ? `<span class="nav-count" id="menu-count"></span>` : ""}</a>`).join("");
    $("#nav-fam").innerHTML = `<div class="nav-label">Kokteyl aileleri</div>` + D.families.map((f) => `<a class="nav-item" data-k="fam-${f.id}" href="#/kokteyller?f=${f.id}"><span class="nav-no">${D.cocktails.filter((c) => c.fam === f.id).length}</span><span>${esc(f.n)}</span></a>`).join("");
    const bn = [["#/kokteyller", "glass", "Kokteyl", "kokteyl"], ["#/havuz", "pool", "Havuzlar", "havuz"], ["#/hazirliklar", "prep", "Hazırlık", "hazirlik"], ["#/defter", "note", "Defter", "defter"], ["#/menu", "menu", "Menü", "menu"]];
    $("#bottom-nav").innerHTML = bn.map((b) => `<a href="${b[0]}" data-k="${b[3]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[b[1]]}</svg>${b[2]}</a>`).join("");
  }
  let ACTIVE = { k: "", t: "" };
  function setActive(k, title) {
    if (k !== null) ACTIVE = { k, t: title };
    k = ACTIVE.k; title = ACTIVE.t;
    $$(".nav-item").forEach((a) => a.classList.toggle("active", a.dataset.k === k));
    const bk = k && k.indexOf("fam-") === 0 ? "kokteyl" : ["spritz", "shot", "backbar", "snack", "fiyat", "havuz"].indexOf(k) >= 0 ? "havuz" : k;
    $$("#bottom-nav a").forEach((a) => a.classList.toggle("on", a.dataset.k === bk));
    $("#top-title").textContent = title || "Kokteyl Kitabı";
    document.title = (title ? title + " · " : "") + "Modern Classics";
    const mc = $("#menu-count"); if (mc) mc.textContent = menuIds().length || "";
  }

  /* ---------- Görünümler ---------- */
  const V = {};
  V.home = () => {
    const rated = Object.values(S.notes).filter((n) => n.r).length;
    const pools = [["#/kokteyller", "Kokteyller", D.cocktails.filter((c) => !c.zp).length + " kokteyl · " + D.cocktails.filter((c) => c.zp).length + " alkolsüz"], ["#/spritz", "Spritz & hızlı nakit", D.spritz.length + " kart · ≤ 20 sn servis"], ["#/shot", "House shot", D.shots.length + " kart · 4,50 € bandı"], ["#/backbar", "Backbar & şişe servisi", D.backbar.length + " şişe · 4 cl / kadeh / şişe"], ["#/snack", "Aperitivo snack", D.snacks.length + " kart · davlumbazsız"], ["#/hazirliklar", "Ev hazırlıkları", D.preps.length + " formül · çapraz kullanım"]];
    return { k: "", t: "Kokteyl Kitabı", html: `
      <section class="hero">
        <div class="sec-kicker"><span class="num" lang="en">Modern Classics</span> · <span lang="en">Mixology Handbook</span> + <span lang="en">Terpene Matrix</span> serisi</div>
        <h1>Seçim havuzu: tat, operasyon ve marj tek yerde.</h1>
        <p>Her havuzdan tadarak “Menüye Al / Revize Et / Elendi” seç; Menü Taslağı final menünü, hazırlık yükünü ve ortalama marjını hesaplar.</p>
      </section>
      <div class="stats">
        <a class="stat" href="#/defter"><strong>${rated}</strong><span>tadıldı</span></a>
        <a class="stat" href="#/menu"><strong>${menuIds().length}</strong><span>menüde (hedef 30–40)</span></a>
        <a class="stat" href="#/hazirliklar"><strong>${D.preps.length}</strong><span>ev hazırlığı</span></a>
      </div>
      <h2 class="section-title">Havuzlar</h2>
      <div class="grid" style="margin-top:12px">${pools.map(([h, t, s]) => `<a class="card" href="${h}"><h3 style="font-family:var(--font-display);font-size:19px">${t}</h3><span class="sub">${s}</span></a>`).join("")}</div>
      <h2 class="section-title">Kokteyl aileleri</h2>
      <div class="grid" style="margin-top:12px">${D.families.map((f) => `<a class="card" href="#/kokteyller?f=${f.id}"><div class="row"><h3>${esc(f.n)}</h3><span class="pill">${D.cocktails.filter((c) => c.fam === f.id).length}</span></div><span class="sub">${esc(f.classic)}</span></a>`).join("")}</div>` };
  };
  V.havuz = () => ({ k: "havuz", t: "Havuzlar", html: `${head("Seçim havuzları", "Havuzlar", "", "")}
    <div class="grid">${[["#/spritz", "Spritz & Hızlı Nakit", D.spritz.length + " kart"], ["#/shot", "House Shot", D.shots.length + " kart"], ["#/backbar", "Backbar & Şişe", D.backbar.length + " şişe"], ["#/snack", "Aperitivo Snack", D.snacks.length + " kart"], ["#/kokteyller?f=zero", "Alkolsüz", D.cocktails.filter((c) => c.zp).length + " kart"], ["#/fiyatlar", "Fiyatlar & Yedek", "JSON dışa/içe aktar"]].map(([h, t, s]) => `<a class="card" href="${h}"><h3 style="font-family:var(--font-display);font-size:19px">${t}</h3><span class="sub">${s}</span></a>`).join("")}</div>` });

  function statusFilterChips(st, link) {
    return [["all", "Tüm durumlar"], ["menu", "Menüye Al"], ["revize", "Revize Et"], ["elendi", "Elendi"], ["yok", "Denenmedi"]].map(([v, l]) => `<a class="chip ${st === v ? "on" : ""}" href="${link({ st: v })}">${l}</a>`).join("");
  }
  const stMatch = (id, st) => (st === "all" ? true : st === "yok" ? !note(id).st : note(id).st === st);

  V.kokteyller = (q) => {
    const f = q.f || "all", b = q.b || "all", fmt = q.fmt || "all", st = q.st || "all", qs = q.q || "", p = q.p || "";
    let list = D.cocktails.filter((c) => (f === "all" || c.fam === f) && (b === "all" || c.base === b) && (fmt === "all" || c.fmt === fmt) && (!p || c.ings.some((l) => l[0] === p)) && stMatch(c.id, st));
    if (qs) list = list.filter((c) => fold([c.n, c.de, c.br, ingSummary(c), FAM[c.fam].n].join(" ")).indexOf(fold(qs)) >= 0);
    const link = (o) => { const z = Object.assign({ f, b, fmt, st, q: qs, p }, o); return "#/kokteyller?" + Object.keys(z).filter((k) => z[k] && z[k] !== "all").map((k) => k + "=" + encodeURIComponent(z[k])).join("&"); };
    const fam = FAM[f];
    return { k: f !== "all" ? "fam-" + f : "kokteyl", t: fam ? fam.n : "Kokteyller", html: `
      ${head(fam ? `Aile · <span class="num">${esc(fam.classic)}</span>` : `<span class="num" lang="en">Cocktails</span>`, fam ? esc(fam.n) : "Kokteyller", `${list.length} kart${p && PR[p] ? " · " + esc(PR[p].n) + " kullananlar" : ""} · varsayılan fiyat ${eur(S.defPrice.cocktail)}`, "")}
      <div class="tools"><input type="search" id="cs" placeholder="Ara: isim, malzeme, terpen (ör. pandan, kakule)…" value="${esc(qs)}"></div>
      <div class="chips">
        <a class="chip ${f === "all" ? "on" : ""}" href="${link({ f: "all" })}">Tüm aileler</a>
        ${D.families.map((x) => `<a class="chip ${f === x.id ? "on" : ""}" href="${link({ f: x.id })}">${esc(x.n)}</a>`).join("")}
      </div>
      <div class="chips" style="position:static">
        ${["all"].concat(BASES).map((x) => `<a class="chip ${b === x ? "on" : ""}" href="${link({ b: x })}">${x === "all" ? "Tüm bazlar" : x}</a>`).join("")}
        <span style="width:1px;background:var(--line);flex:none"></span>
        ${["all", "full", "shake", "top", "pour"].map((x) => `<a class="chip ${fmt === x ? "on" : ""}" href="${link({ fmt: x })}">${x === "all" ? "Tüm formatlar" : esc(D.formats[x].n)}</a>`).join("")}
        <span style="width:1px;background:var(--line);flex:none"></span>
        ${statusFilterChips(st, link)}
      </div>
      <div class="grid">${list.map(cCard).join("") || `<p class="empty">Bu filtrelerle kart yok.</p>`}</div>`,
      after: () => { const i = $("#cs"); i.addEventListener("change", () => go(link({ q: i.value }))); } };
  };

  function poolList(kind, q) {
    const st = q.st || "all", z = q.z || "all";
    const src = kind === "spritz" ? D.spritz : D.shots;
    const list = src.filter((c) => stMatch(c.id, st) && (z === "all" || (z === "zero" ? c.base === "Zero" : c.base !== "Zero")));
    const link = (o) => { const p = Object.assign({ st, z }, o); return `#/${kind}?` + Object.keys(p).filter((k) => p[k] !== "all").map((k) => k + "=" + p[k]).join("&"); };
    const avg = list.length ? list.reduce((s, c) => s + itemEcon(c.id).margin, 0) / list.length : 0;
    const info = kind === "spritz" ? D.spritzNote : D.shotNote;
    return `${head(`<span class="num" lang="en">${kind === "spritz" ? "Spritz & Fast Cash" : "House Shots"}</span>`, kind === "spritz" ? "Spritz & Hızlı Nakit Havuzu" : "Basic & House Shot Havuzu", `${list.length} kart · ortalama marj ${pct(avg)}`, esc(info))}
      <div class="chips">${statusFilterChips(st, link)}${kind === "spritz" ? `<span style="width:1px;background:var(--line);flex:none"></span>${[["all", "Tümü"], ["alk", "Alkollü"], ["zero", "Alkolsüz"]].map(([v, l]) => `<a class="chip ${z === v ? "on" : ""}" href="${link({ z: v })}">${l}</a>`).join("")}` : ""}</div>
      <div class="grid">${list.map(cCard).join("") || `<p class="empty">Kart yok.</p>`}</div>`;
  }
  V.spritz = (q) => ({ k: "spritz", t: "Spritz Havuzu", html: poolList("spritz", q) });
  V.shot = (q) => ({ k: "shot", t: "Shot Havuzu", html: poolList("shot", q) });

  function batchTable(c, m, mode, val) {
    const target = mode === "n" ? val * m.per : val * 1000;
    const n = m.per ? target / m.per : 0;
    const rows = m.still.map((l) => { const tot = lineMl(l) * n; const it = IT[l[0]]; return `<tr><td>${PR[l[0]] ? `<a href="#/h/${l[0]}">${esc(refName(l[0]))}</a>` : esc(refName(l[0]))}</td><td class="mono">${nf(tot, tot < 20 ? 1 : 0)} ml</td><td class="mono">${it && it.pack >= 500 ? nf(tot / it.pack, 2) : "—"}</td></tr>`; }).join("");
    const water = m.water ? `<tr><td>Su (dilüsyon, %${nf(m.d * 100, 0)})</td><td class="mono">${nf(m.water * n, 0)} ml</td><td>—</td></tr>` : "";
    return `<div class="results" style="margin:0 0 10px"><div class="res hl"><span>Porsiyon</span><strong>${nf(n, 0)}</strong></div><div class="res"><span>Toplam batch</span><strong>${nf(target / 1000, 2)} L</strong></div><div class="res"><span>Batch ABV</span><strong>%${nf(m.finalAbv, 1)}</strong></div></div>
      <div class="table-wrap"><table><tr><th>Bileşen</th><th>Miktar</th><th>Şişe</th></tr>${rows}${water}<tr><td><b>Toplam</b></td><td class="mono"><b>${nf(target, 0)} ml</b></td><td></td></tr></table></div>
      ${m.tops.length ? `<p class="calc-note">Servis anında porsiyon başına: ${m.tops.map((l) => `${amt(l[1])} ml ${esc(refName(l[0]))}`).join(" + ")} (batch’e girmez).</p>` : ""}`;
  }

  V.k = (id) => {
    const c = CK[id]; if (!c) return V.notfound();
    const st = setOf(c), fam = FAM[c.fam], m = batchModel(c), stg = storageNote(c, m);
    const e = itemEcon(id);
    const ps = preps(c);
    const siblings = D.drinks.filter((x) => x.id !== id && x.ings.some((l) => ps.indexOf(l[0]) >= 0)).map((x) => ({ x, s: x.ings.filter((l) => ps.indexOf(l[0]) >= 0).length })).sort((a, b) => b.s - a.s).slice(0, 6);
    const bm = LS.get("bmode", { mode: "L", val: 1 });
    const back = st === "spritz" || st === "shot" ? `<a class="crumb" href="${SET[st].list}">← ${SET[st].n} havuzu</a>` : `<a class="crumb" href="#/kokteyller?f=${c.fam}">← ${esc(fam.n)}</a>`;
    const kick = st === "spritz" ? "Spritz" : st === "shot" ? "House Shot" : c.zp ? "Zero-Proof" : fam.n + " twist";
    const actK = st === "spritz" ? "spritz" : st === "shot" ? "shot" : "fam-" + c.fam;
    return { k: actK, t: c.n, html: `
      ${back}
      <article class="formula" style="margin-top:12px">
        <div class="formula-head"><div><span class="kick" lang="en">${esc(kick)}</span><h2 lang="en">${esc(c.n)}</h2><p class="de" lang="de">${esc(c.de)}</p></div>${stPill(id)}</div>
        <div class="fmeta">
          <div><span>${st === "cocktail" ? "Baz" : "Kategori"}</span>${esc(st === "cocktail" ? c.base : SET[st].n + (c.base === "Zero" ? " · alkolsüz" : ""))}</div><div><span>Bardak</span>${esc(c.glass)}</div>
          <div><span>Format</span>${esc(D.formats[c.fmt].n)}</div><div><span>Buz</span>${esc(c.ice)}</div>
          <div><span>Maliyet → Satış</span><b style="font-weight:500">${eur(e.cost)} → ${eur(e.gross)}</b></div><div><span>Marj · Pour cost</span><b style="font-weight:500;color:${mcls(e.margin)}">${pct(e.margin)}</b> · ${nf(e.pour, 1)} %</div>
          <div style="grid-column:1/-1"><span>Saklama</span><span style="text-transform:none;letter-spacing:0;font-family:var(--font-mono);font-size:12.5px;color:${stg.ok ? "var(--green)" : "#ec8a72"}">${esc(stg.t)}</span></div>
        </div>
        <div class="fsec"><h4>Malzemeler (1 porsiyon)</h4><ul class="ingl">${c.ings.map((l) => `<li><span class="amt">${amt(l[1])} ${l[2] === "d" ? "dash" : "ml"}</span><span>${PR[l[0]] ? `<a class="prep-link" href="#/h/${l[0]}">${esc(refName(l[0]))}</a>` : esc(refName(l[0]))}</span><span class="tag2">${l[2] === "t" ? "servis anında" : l[2] === "f" ? "üstüne" : PR[l[0]] ? "ev hazırlığı" : ""}</span></li>`).join("")}</ul></div>
        <div class="fsec"><h4>Servis</h4><div class="serve"><div>${serveLine(c, m)}</div><div><b>Garnitür:</b> ${esc(c.g)}</div></div></div>
        <div class="fsec"><h4>Terpen köprüsü</h4><div style="font-size:15px">${esc(c.br)}</div>${c.note ? `<div class="note tip" style="margin-top:10px"><span class="tag">Not</span><p>${esc(c.note)}</p></div>` : ""}</div>
      </article>
      <section class="block"><h2><span class="bn">A</span> Batch tablosu</h2>
        <div class="calc">
          <div class="seg2" id="bmode">${[["L", 1, "1 L"], ["L", 5, "5 L"], ["n", 0, "Porsiyon"]].map(([mo, v, l]) => `<button data-mo="${mo}" data-v="${v}" class="${(bm.mode === mo && (mo === "n" || +bm.val === v)) ? "on" : ""}">${l}</button>`).join("")}</div>
          <div class="field" id="nwrap" style="margin-top:10px;max-width:200px;${bm.mode === "n" ? "" : "display:none"}"><label for="nsv">Porsiyon sayısı</label><input id="nsv" type="number" min="1" step="1" inputmode="numeric" value="${bm.mode === "n" ? bm.val : 20}"></div>
          <div id="btable" style="margin-top:12px"></div>
        </div>
      </section>
      <section class="block"><h2><span class="bn">B</span> Tadım defteri</h2>${notebookHtml(id)}</section>
      ${ps.length ? `<section class="block"><h2><span class="bn">C</span> Kullandığı hazırlıklar</h2><div class="grid">${ps.map((p) => pCard(PR[p])).join("")}</div></section>` : ""}
      ${siblings.length ? `<section class="block"><h2><span class="bn">D</span> Aynı hazırlıkları paylaşanlar</h2><div class="grid">${siblings.map((o) => cCard(o.x)).join("")}</div></section>` : ""}`,
      after: () => {
        let mode = bm.mode, val = +bm.val;
        const draw = () => { $("#btable").innerHTML = batchTable(c, m, mode, val); LS.set("bmode", { mode, val }); };
        $$("#bmode button").forEach((b) => b.addEventListener("click", () => {
          $$("#bmode button").forEach((x) => x.classList.remove("on")); b.classList.add("on");
          mode = b.dataset.mo; val = mode === "n" ? (+$("#nsv").value || 20) : +b.dataset.v;
          $("#nwrap").style.display = mode === "n" ? "" : "none"; draw();
        }));
        $("#nsv").addEventListener("input", (ev) => { if (mode === "n") { val = Math.max(1, +ev.target.value || 1); draw(); } });
        draw();
        bindNotebook(id, render);
      } };
  };

  /* Backbar */
  V.backbar = (q) => {
    const cat = q.c || "all", st = q.st || "all";
    const list = D.backbar.filter((b) => (cat === "all" || b.cat === cat) && stMatch(b.id, st));
    const link = (o) => { const p = Object.assign({ c: cat, st }, o); return "#/backbar?" + Object.keys(p).filter((k) => p[k] !== "all").map((k) => k + "=" + encodeURIComponent(p[k])).join("&"); };
    return { k: "backbar", t: "Backbar & Şişe", html: `
      ${head(`<span class="num" lang="en">Backbar</span>`, "Backbar, Premium & Şişe Servisi", `${list.length} şişe`, esc(D.backbarNote))}
      <div class="chips"><a class="chip ${cat === "all" ? "on" : ""}" href="${link({ c: "all" })}">Tümü</a>${D.backbarCats.map((c) => `<a class="chip ${cat === c ? "on" : ""}" href="${link({ c })}">${esc(c)}</a>`).join("")}</div>
      <div class="chips" style="position:static">${statusFilterChips(st, link)}</div>
      <div class="grid">${list.map(bCard).join("") || `<p class="empty">Kart yok.</p>`}</div>` };
  };
  V.b = (id) => {
    const b = BB[id]; if (!b) return V.notfound();
    const buy = bbBuy(b), e = itemEcon(id);
    const uses = Array.from(new Set((b.uses || []).concat(b.item ? D.drinks.filter((c) => c.ings.some((l) => l[0] === b.item)).map((c) => c.id) : []))).filter((u) => CK[u]);
    let bottleRow = "";
    if (b.sparkling) {
      const mb = marginOf(buy, b.sellBottle, VAT_DRINK);
      bottleRow = `<div class="results" style="margin-top:10px"><div class="res"><span>Şişe maliyeti</span><strong>${eur(buy)}</strong></div><div class="res hl"><span>Kapalı şişe satış</span><strong>${eur(b.sellBottle)}</strong></div><div class="res ${mb >= 70 ? "good" : "bad"}"><span>Şişe marjı</span><strong>${pct(mb)}</strong></div><div class="res"><span>Kadeh / şişe</span><strong>${nf(b.size / b.glass, 1)}</strong></div></div><p class="calc-note">Açık köpüklü şişe tıpa ile 1–2 gün dayanır; kadeh satışında fire payını hesaba kat.</p>`;
    }
    return { k: "backbar", t: b.n, html: `
      <a class="crumb" href="#/backbar?c=${encodeURIComponent(b.cat)}">← ${esc(b.cat)}</a>
      <article class="formula" style="margin-top:12px">
        <div class="formula-head"><div><span class="kick">${esc(b.cat)}</span><h2>${esc(b.n)}</h2><p class="de">${esc(b.prof)}</p></div>${stPill(id)}</div>
        <div class="fmeta">
          <div><span>Şişe</span>${nf(b.size / 1000, 2)} L · %${nf(b.abv, 1)}</div><div><span>Alış (net, tahmini)</span>${eur(buy)}</div>
          <div><span>Servis birimi</span>${b.sparkling ? "0,1 L kadeh" : `${b.pour / 10} cl${b.mixer ? " + " + esc(b.mixerN) : ""}`}</div><div><span>Birim maliyet</span>${eur(e.cost)}</div>
        </div>
        <div class="fsec"><h4>Neden bu şişe?</h4><div style="font-size:15px">${esc(b.why)}</div></div>
        <div class="fsec"><h4>Servis</h4><div style="font-size:15px">${esc(b.serve)}</div></div>
        ${uses.length ? `<div class="fsec"><h4>Kullanıldığı / yükseltme yapılabilecek içkiler</h4><div class="tags">${uses.map((u) => `<a class="pill accent" style="text-decoration:none" href="#/k/${u}">${esc(CK[u].n)}</a>`).join("")}</div></div>` : ""}
      </article>
      <section class="block"><h2><span class="bn">A</span> Ekonomi</h2>
        ${econBox(e, VAT_DRINK, b.sparkling ? "Kadeh maliyeti" : "4 cl maliyeti")}${bottleRow}
        <div class="field" style="margin-top:12px;max-width:260px"><label for="bbuy">Kendi alış fiyatın (net €, şişe)</label><input id="bbuy" type="number" step="0.1" min="0" inputmode="decimal" value="${S.prices[id] != null ? S.prices[id] : ""}" placeholder="${nf(buy, 2)}"></div>
      </section>
      <section class="block"><h2><span class="bn">B</span> Tadım defteri</h2>${notebookHtml(id)}</section>`,
      after: () => {
        bindNotebook(id, render);
        $("#bbuy").addEventListener("change", (ev) => { if (ev.target.value === "") delete S.prices[id]; else S.prices[id] = +ev.target.value; save("prices"); setTimeout(render, 0); });
      } };
  };

  /* Snack */
  V.snack = (q) => {
    const cat = q.c || "all", st = q.st || "all";
    const list = D.snacks.filter((s) => (cat === "all" || s.cat === cat) && stMatch(s.id, st));
    const link = (o) => { const p = Object.assign({ c: cat, st }, o); return "#/snack?" + Object.keys(p).filter((k) => p[k] !== "all").map((k) => k + "=" + encodeURIComponent(p[k])).join("&"); };
    const avg = list.length ? list.reduce((s, x) => s + itemEcon(x.id).margin, 0) / list.length : 0;
    return { k: "snack", t: "Aperitivo Snack", html: `
      ${head(`<span class="num" lang="it">Aperitivo</span>`, "İtalyan Aperitivo Snack Havuzu", `${list.length} kart · ortalama marj ${pct(avg)}`, esc(D.snackNote))}
      <div class="chips"><a class="chip ${cat === "all" ? "on" : ""}" href="${link({ c: "all" })}">Tümü</a>${D.snackCats.map((c) => `<a class="chip ${cat === c ? "on" : ""}" href="${link({ c })}">${esc(c)}</a>`).join("")}</div>
      <div class="chips" style="position:static">${statusFilterChips(st, link)}</div>
      <div class="grid">${list.map(sCard).join("") || `<p class="empty">Kart yok.</p>`}</div>` };
  };
  V.s = (id) => {
    const s = SN[id]; if (!s) return V.notfound();
    const e = itemEcon(id);
    const famLinks = (s.fams || []).map((f) => f === "spritz" ? `<a class="pill accent" style="text-decoration:none" href="#/spritz">Spritz havuzu</a>` : FAM[f] ? `<a class="pill accent" style="text-decoration:none" href="#/kokteyller?f=${f}">${esc(FAM[f].n)}</a>` : "").join("");
    return { k: "snack", t: s.n, html: `
      <a class="crumb" href="#/snack?c=${encodeURIComponent(s.cat)}">← ${esc(s.cat)}</a>
      <article class="formula" style="margin-top:12px">
        <div class="formula-head"><div><span class="kick">${esc(s.cat)} · ${esc(s.portion)}</span><h2 lang="it">${esc(s.n)}</h2><p class="de" lang="de">${esc(s.de)}</p></div>${stPill(id)}</div>
        <div class="fmeta">
          <div><span>Porsiyon</span>${esc(s.portion)}</div><div><span>Raf ömrü</span>${esc(s.shelf)}</div>
          <div style="grid-column:1/-1"><span>Alerjenler (LMIV)</span>${esc(s.allergens)}</div>
        </div>
        <div class="fsec"><h4>Bileşenler</h4><ul class="ingl">${s.comps.map((x) => `<li style="grid-template-columns:1fr"><span>${esc(x)}</span></li>`).join("")}</ul></div>
        <div class="fsec"><h4>60 saniyede servis</h4><div style="font-size:15px">${esc(s.prep)}</div></div>
        <div class="fsec"><h4>Hangi içkiyle?</h4><div style="font-size:15px;margin-bottom:8px">${esc(s.pairs)}</div><div class="tags">${famLinks}</div>${s.br && s.br !== "—" ? `<p class="calc-note">Terpen/tat köprüsü: ${esc(s.br)}</p>` : ""}${s.note ? `<div class="note tip" style="margin-top:10px"><span class="tag">Not</span><p>${esc(s.note)}</p></div>` : ""}</div>
      </article>
      <section class="block"><h2><span class="bn">A</span> Ekonomi</h2>${econBox(e, VAT_FOOD, "Porsiyon maliyeti")}
        <div class="field" style="margin-top:12px;max-width:260px"><label for="scost">Kendi porsiyon maliyetin (net €)</label><input id="scost" type="number" step="0.05" min="0" inputmode="decimal" value="${S.prices[id] != null ? S.prices[id] : ""}" placeholder="${nf(s.cost, 2)}"></div>
      </section>
      <section class="block"><h2><span class="bn">B</span> Tadım defteri</h2>${notebookHtml(id)}</section>`,
      after: () => {
        bindNotebook(id, render);
        $("#scost").addEventListener("change", (ev) => { if (ev.target.value === "") delete S.prices[id]; else S.prices[id] = +ev.target.value; save("prices"); setTimeout(render, 0); });
      } };
  };

  /* Hazırlıklar */
  V.hazirliklar = (q) => {
    const cat = q.c || "all";
    const list = D.preps.filter((p) => cat === "all" || p.cat === cat);
    return { k: "hazirlik", t: "Ev Hazırlıkları", html: `
      ${head(`<span class="num" lang="en">House Preps</span>`, "Ev Hazırlıkları", `${D.preps.length} hazırlık · kokteyl, spritz ve shot’larda ortak`, "")}
      <div class="chips"><a class="chip ${cat === "all" ? "on" : ""}" href="#/hazirliklar">Tümü</a>${D.prepCats.map((c) => `<a class="chip ${cat === c ? "on" : ""}" href="#/hazirliklar?c=${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}</div>
      <div class="grid">${list.map(pCard).join("")}</div>` };
  };
  V.h = (id, q) => {
    const p = PR[id]; if (!p) return V.notfound();
    const mult = Math.max(0.1, +q.x || 1);
    const users = usedBy(id), parents = usedInPreps(id);
    const bySet = MENU_ORDER.map((k) => ({ k, l: users.filter((c) => setOf(c) === k) })).filter((o) => o.l.length);
    return { k: "hazirlik", t: p.n, html: `
      <a class="crumb" href="#/hazirliklar?c=${encodeURIComponent(p.cat)}">← ${esc(p.cat)}</a>
      <article class="formula" style="margin-top:12px">
        <div class="formula-head"><div><span class="kick">Formül · ${esc(p.cat)}</span><h2>${esc(p.n)}</h2></div><span class="pill accent">${users.length} içki</span></div>
        <div class="fmeta">
          <div><span>Verim</span>~${nf(p.y * mult, 0)} ml</div><div><span>Teknik</span>${esc(p.tech)}</div>
          <div><span>Aktif süre</span>${Math.round(p.act * Math.max(1, mult * 0.6))} dk</div><div><span>Toplam</span>${esc(p.tot)}</div>
          <div><span>Raf ömrü</span>${esc(p.shelf)}</div><div><span>Maliyet</span>${eur(unitCost(id) * 1000)} / L</div>
        </div>
        <div class="fsec"><h4>Ölçek</h4><div class="seg2" id="mult">${[0.5, 1, 2, 3].map((x) => `<button data-x="${x}" class="${mult === x ? "on" : ""}">×${nf(x, x % 1 ? 1 : 0)}</button>`).join("")}</div></div>
        <div class="fsec"><h4>Malzemeler</h4><ul class="ingl">${p.ings.map(([r, qty, nt]) => { const it = IT[r]; const u = it ? it.u : "ml"; return `<li><span class="amt">${amt(qty * mult)} ${u}</span><span>${PR[r] ? `<a class="prep-link" href="#/h/${r}">${esc(refName(r))}</a>` : esc(refName(r))}${nt ? ` <span class="muted">(${esc(nt)})</span>` : ""}</span><span></span></li>`; }).join("")}</ul></div>
        <div class="fsec"><h4>Yapılışı</h4><ol class="ol">${p.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>${p.tip ? `<div class="note tip" style="margin-top:12px"><span class="tag">Not</span><p>${esc(p.tip)}</p></div>` : ""}</div>
      </article>
      ${bySet.map((o, i) => `<section class="block"><h2><span class="bn">${String.fromCharCode(65 + i)}</span> Kullanıldığı: ${SET[o.k].n} <small>${o.l.length}</small></h2><div class="grid">${o.l.map(cCard).join("")}</div></section>`).join("")}
      ${parents.length ? `<section class="block"><h2>İçinde kullanıldığı hazırlıklar</h2><div class="grid">${parents.map(pCard).join("")}</div></section>` : ""}`,
      after: () => { $$("#mult button").forEach((b) => b.addEventListener("click", () => go(`#/h/${id}?x=${b.dataset.x}`))); } };
  };

  /* Defter */
  function allIds() { return D.drinks.map((c) => c.id).concat(D.backbar.map((b) => b.id), D.snacks.map((s) => s.id)); }
  function logRow(id) {
    const n = note(id), e = itemEcon(id);
    return `<a class="ritem" href="${itemHref(id)}" style="grid-template-columns:1fr auto"><div><div class="nm">${esc(itemName(id))} <span class="mini-stars">${starsTxt(n.r)}</span></div><div class="ds">${SET[itemSet(id)].n} · ${eur(e.cost)} → ${eur(e.gross)} · marj ${pct(e.margin)}${n.note ? " · " + esc(n.note.slice(0, 80)) + (n.note.length > 80 ? "…" : "") : ""}</div></div><div class="bd">${stPill(id)}</div></a>`;
  }
  V.defter = () => {
    const ids = allIds().filter((id) => { const n = note(id); return n.r || n.note || n.st; });
    const groups = [["menu", "Menüye Al"], ["revize", "Revize Et"], ["elendi", "Elendi"]];
    const untagged = ids.filter((id) => !note(id).st);
    return { k: "defter", t: "Tadım Defteri", html: `
      ${head(`<span class="num" lang="en">Tasting Log</span>`, "Tadım Defteri", `${ids.length} / ${allIds().length} kart kayıtlı`, "Kokteyl, spritz, shot, backbar ve snack kartlarındaki puan, not ve durumlar burada toplanır.")}
      ${groups.map(([k, l]) => { const g = ids.filter((id) => note(id).st === k).sort((a, b) => (note(b).r || 0) - (note(a).r || 0)); return `<section class="block"><h2><span class="stpill ${k}">${l}</span> <small>${g.length}</small></h2>${g.length ? `<div class="rank">${g.map(logRow).join("")}</div>` : `<p class="empty">Henüz yok.</p>`}</section>`; }).join("")}
      ${untagged.length ? `<section class="block"><h2>Durumsuz notlar <small>${untagged.length}</small></h2><div class="rank">${untagged.map(logRow).join("")}</div></section>` : ""}
      <p class="calc-note">Yedek almak için: <a href="#/fiyatlar">Fiyatlar & Yedek → JSON dışa aktar</a>.</p>` };
  };

  /* Menü taslağı */
  function menuIds() { return allIds().filter((id) => note(id).st === "menu"); }
  function weekNeeds(list) {
    const need = {}, bottles = {};
    const addPrep = (pid, ml) => {
      need[pid] = (need[pid] || 0) + ml;
      PR[pid].ings.forEach(([r, q]) => { const sub = q / PR[pid].y * ml; if (PR[r]) addPrep(r, sub); else if (IT[r] && IT[r].abv && IT[r].u === "ml") bottles[r] = (bottles[r] || 0) + sub; });
    };
    list.forEach((c) => {
      const w = S.week[c.id] != null ? +S.week[c.id] : S.weekDef;
      c.ings.forEach((l) => { const ml = lineMl(l) * w; if (PR[l[0]]) addPrep(l[0], ml); else if (IT[l[0]] && IT[l[0]].abv != null && IT[l[0]].u === "ml" && IT[l[0]].abv > 0) bottles[l[0]] = (bottles[l[0]] || 0) + ml; });
    });
    return { need, bottles };
  }
  V.menu = () => {
    const ids = menuIds();
    if (!ids.length) return { k: "menu", t: "Menü Taslağı", html: `${head(`<span class="num" lang="en">Menu Draft</span>`, "Menü Taslağı", "", "")}<div class="note tip"><span class="tag">Boş</span><p>Herhangi bir havuzdaki kartta “Menüye Al” seçtiklerin burada kategorilere ayrılır; toplam ürün sayısı, ortalama marj, haftalık hazırlık yükü ve şişe ihtiyacı hesaplanır.</p><p><a href="#/havuz">Havuzlara git →</a></p></div>` };
    const groups = MENU_ORDER.map((k) => ({ k, ids: ids.filter((id) => itemSet(id) === k) })).filter((g) => g.ids.length);
    const avgAll = ids.reduce((s, id) => s + itemEcon(id).margin, 0) / ids.length;
    const drinks = ids.filter((id) => CK[id]).map((id) => CK[id]);
    const { need, bottles } = weekNeeds(drinks);
    const pids = Object.keys(need).sort((a, b) => need[b] - need[a]);
    let totalMin = 0;
    const prepRows = pids.map((pid) => {
      const p = PR[pid]; const batches = Math.max(1, Math.ceil(need[pid] / p.y * 2) / 2);
      const min = Math.round(p.act * Math.max(1, batches * 0.6)); totalMin += min;
      const inMenu = drinks.filter((c) => c.ings.some((l) => l[0] === pid)).length;
      return `<tr><td><a href="#/h/${pid}">${esc(p.n)}</a><br><span class="muted" style="font-size:12px">${esc(p.cat)} · raf ${esc(p.shelf)}</span></td><td class="mono">${inMenu}</td><td class="mono">${nf(need[pid], 0)} ml</td><td class="mono">×${nf(batches, 1)}</td><td class="mono">${min} dk</td></tr>`;
    }).join("");
    const over = totalMin > PREP_LIMIT;
    const inRange = ids.length >= 30 && ids.length <= 40;
    return { k: "menu", t: "Menü Taslağı", html: `
      ${head(`<span class="num" lang="en">Menu Draft</span>`, "Menü Taslağı", `${ids.length} ürün · ${groups.length} kategori`, "")}
      <div class="results" style="margin-top:0">
        <div class="res hl"><span>Seçili ürün</span><strong>${ids.length}</strong></div>
        <div class="res ${avgAll >= 75 ? "good" : avgAll < 68 ? "bad" : ""}"><span>Ortalama marj</span><strong>${pct(avgAll)}</strong></div>
        <div class="res"><span>Gerekli hazırlık</span><strong>${pids.length}</strong></div>
        <div class="res ${over ? "bad" : "good"}"><span>Haftalık aktif prep</span><strong>${totalMin} dk</strong></div>
      </div>
      <p class="muted" style="font-size:13.5px;margin:10px 0 0">${inRange ? "Hedef aralıkta (30–40)." : ids.length < 30 ? `Hedef 30–40 ürün: ${30 - ids.length} ürün daha seçebilirsin.` : `Hedefin üstünde: ${ids.length - 40} ürün çıkarmayı düşün.`}</p>
      ${groups.map((g, i) => { const avg = g.ids.reduce((s, id) => s + itemEcon(id).margin, 0) / g.ids.length; return `<section class="block"><h2><span class="bn">${String.fromCharCode(65 + i)}</span> ${SET[g.k].n} <small>${g.ids.length} ürün · ort. marj ${pct(avg)}</small></h2>
        <div class="table-wrap"><table><tr><th>Ürün</th><th>Maliyet</th><th>Satış</th><th>Marj</th>${CK[g.ids[0]] ? "<th>Porsiyon/hafta</th>" : ""}</tr>${g.ids.map((id) => { const e = itemEcon(id); return `<tr><td><a href="${itemHref(id)}">${esc(itemName(id))}</a> <span class="mini-stars">${starsTxt(note(id).r)}</span></td><td class="mono">${eur(e.cost)}</td><td class="mono">${eur(e.gross)}</td><td class="mono" style="color:${mcls(e.margin)}">${pct(e.margin)}</td>${CK[id] ? `<td><input class="inp sm" style="max-width:80px" type="number" min="0" step="1" inputmode="numeric" data-w="${id}" value="${S.week[id] != null ? S.week[id] : ""}" placeholder="${S.weekDef}"></td>` : ""}</tr>`; }).join("")}</table></div></section>`; }).join("")}
      ${drinks.length ? `<section class="block"><h2>Haftalık hazırlık yükü <small>içkiler için</small></h2>
        <div class="field" style="max-width:260px;margin-bottom:10px"><label for="wdef">Varsayılan porsiyon / hafta</label><input id="wdef" type="number" min="0" step="1" inputmode="numeric" value="${S.weekDef}"></div>
        <div class="load"><span class="muted" style="font-size:13px">Prep yükü: ${totalMin} / ${PREP_LIMIT} dk (haftada 1 gün, en fazla 4 saat)</span><div class="bar ${over ? "over" : ""}"><i style="width:${Math.min(100, totalMin / PREP_LIMIT * 100)}%"></i></div></div>
        ${over ? `<div class="note warn" style="margin-top:10px"><span class="tag">Limit aşıldı</span><p>Aynı hazırlıkları paylaşan ürünleri seç veya raf ömrü 3+ hafta olanları iki haftada bir yap.</p></div>` : ""}
        <div class="table-wrap" style="margin-top:10px"><table><tr><th>Hazırlık</th><th>Menüde</th><th>İhtiyaç / hafta</th><th>Parti</th><th>Aktif</th></tr>${prepRows}</table></div>
        <h3 style="font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:18px 0 8px">Haftalık şişe ihtiyacı</h3>
        <div class="table-wrap"><table><tr><th>Şişe</th><th>ml / hafta</th><th>Şişe</th></tr>${Object.keys(bottles).sort((a, b) => bottles[b] - bottles[a]).map((r) => `<tr><td>${esc(IT[r].n)}</td><td class="mono">${nf(bottles[r], 0)}</td><td class="mono">${nf(bottles[r] / IT[r].pack, 2)}</td></tr>`).join("")}</table></div>
      </section>` : ""}`,
      after: () => {
        const w = $("#wdef"); if (w) w.addEventListener("change", (e) => { S.weekDef = Math.max(0, +e.target.value || 0); save("weekDef"); render(); });
        $$("[data-w]").forEach((i) => i.addEventListener("change", () => { if (i.value === "") delete S.week[i.dataset.w]; else S.week[i.dataset.w] = Math.max(0, +i.value); save("week"); render(); }));
      } };
  };

  /* Fiyatlar + yedek */
  V.fiyatlar = () => {
    const cats = Array.from(new Set(D.items.map((i) => i.cat)));
    return { k: "fiyat", t: "Fiyatlar & Yedek", html: `
      ${head(`<span class="num" lang="en">Prices & Backup</span>`, "Fiyatlar ve Yedek", "Net (KDV hariç) paket fiyatları", esc(D.priceNote))}
      <section class="block"><h2><span class="bn">A</span> Yedekle / geri yükle</h2>
        <div class="calc">
          <p class="calc-note" style="margin-top:0">Tüm havuzlardaki notlar, puanlar, durumlar, menü fiyatların, alış fiyatları ve haftalık porsiyonlar tek JSON dosyasında.</p>
          <div class="actions"><button class="btn primary" id="exp">⬇ JSON dışa aktar</button><label class="btn" for="impf">⬆ JSON içe aktar</label><input id="impf" type="file" accept="application/json,.json" hidden><button class="btn" id="copy">Panoya kopyala</button></div>
          <div class="field" style="margin-top:12px"><label for="imptxt">Veya JSON’u buraya yapıştır</label><textarea id="imptxt" class="inp" placeholder='{"notes":{…},"prices":{…}}'></textarea></div>
          <div class="actions" style="margin-top:8px"><button class="btn" id="impbtn">Yapıştırılanı içe aktar</button></div>
        </div>
      </section>
      <section class="block"><h2><span class="bn">B</span> Varsayılan menü fiyatları</h2>
        <div class="fields" style="max-width:520px"><div class="field"><label for="dpc">Kokteyl (€, KDV dahil)</label><input id="dpc" type="number" step="0.1" min="0" inputmode="decimal" value="${S.defPrice.cocktail}"></div><div class="field"><label for="dpz">Alkolsüz kokteyl (€)</label><input id="dpz" type="number" step="0.1" min="0" inputmode="decimal" value="${S.defPrice.zero}"></div></div>
        <p class="calc-note">Kart bazında fiyatı her kartın tadım defterinden değiştirebilirsin. Spritz, shot, backbar ve snack’lerin önerilen fiyatları kartlarında.</p>
      </section>
      <section class="block"><h2><span class="bn">C</span> Fiyat listesi</h2>
        <div class="actions" style="margin-bottom:10px"><button class="btn sm danger" id="preset">Tüm fiyatları varsayılana döndür</button></div>
        ${cats.map((cat) => `<h3 style="font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">${esc(cat)}</h3><div class="inv">${D.items.filter((i) => i.cat === cat && i.id !== "r_su").map((i) => `<label class="price-row ${S.prices[i.id] != null ? "changed" : ""}"><span>${esc(i.n)}<small>${i.pack} ${i.u}${i.abv ? " · %" + nf(i.abv, 1) : ""}</small></span><input class="inp sm" type="number" step="0.01" min="0" inputmode="decimal" data-p="${i.id}" value="${price(i.id)}"><span class="unit muted mono" style="font-size:11px">€ / paket</span></label>`).join("")}</div>`).join("")}
      </section>`,
      after: () => {
        const dump = () => JSON.stringify({ app: "modern-classics", v: 2, at: new Date().toISOString(), notes: S.notes, prices: S.prices, week: S.week, weekDef: S.weekDef, defPrice: S.defPrice }, null, 1);
        $("#exp").addEventListener("click", () => {
          try { const b = new Blob([dump()], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "modern-classics-yedek-" + new Date().toISOString().slice(0, 10) + ".json"; document.body.appendChild(a); a.click(); a.remove(); toast("Dosya hazırlandı"); }
          catch (e) { $("#imptxt").value = dump(); toast("İndirme engellendi; JSON kutuya yazıldı"); }
        });
        $("#copy").addEventListener("click", () => { const t = dump(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Panoya kopyalandı")).catch(() => { $("#imptxt").value = t; $("#imptxt").select(); toast("Kutudan kopyala"); }); });
        const load = (txt) => {
          try {
            const o = JSON.parse(txt); if (!o || typeof o !== "object") throw new Error();
            if (o.notes) S.notes = Object.assign({}, S.notes, o.notes); if (o.prices) S.prices = Object.assign({}, S.prices, o.prices);
            if (o.week) S.week = Object.assign({}, S.week, o.week); if (o.weekDef != null) S.weekDef = o.weekDef; if (o.defPrice) S.defPrice = Object.assign({}, S.defPrice, o.defPrice);
            ["notes", "prices", "week", "weekDef", "defPrice"].forEach(save); resetMemo(); toast("İçe aktarıldı"); render();
          } catch (e) { toast("Geçersiz JSON"); }
        };
        $("#impf").addEventListener("change", (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => load(r.result); r.readAsText(f); });
        $("#impbtn").addEventListener("click", () => load($("#imptxt").value));
        $("#preset").addEventListener("click", () => { Object.keys(S.prices).forEach((k) => { if (IT[k]) delete S.prices[k]; }); save("prices"); resetMemo(); render(); toast("Varsayılan fiyatlar"); });
        $("#dpc").addEventListener("change", (e) => { S.defPrice.cocktail = +e.target.value || 14.5; save("defPrice"); toast("Kaydedildi"); });
        $("#dpz").addEventListener("change", (e) => { S.defPrice.zero = +e.target.value || 8.5; save("defPrice"); toast("Kaydedildi"); });
        $$("[data-p]").forEach((i) => i.addEventListener("change", () => { const id = i.dataset.p; const v = +i.value; if (i.value === "" || v === IT[id].price) delete S.prices[id]; else S.prices[id] = v; save("prices"); resetMemo(); i.closest(".price-row").classList.toggle("changed", S.prices[id] != null); toast("Fiyat kaydedildi"); }));
      } };
  };

  V.ara = (q) => {
    const s = fold(q.q || "");
    const has = (t) => fold(t).indexOf(s) >= 0;
    const cs = s ? D.drinks.filter((c) => has([c.n, c.de, c.br, c.g, ingSummary(c)].join(" "))) : [];
    const ps = s ? D.preps.filter((p) => has([p.n, p.cat, p.tech, p.ings.map((l) => refName(l[0])).join(" "), p.steps.join(" ")].join(" "))) : [];
    const bs = s ? D.backbar.filter((b) => has([b.n, b.cat, b.prof, b.why].join(" "))) : [];
    const ss = s ? D.snacks.filter((x) => has([x.n, x.de, x.pairs, x.comps.join(" ")].join(" "))) : [];
    return { k: "", t: "Arama", html: `${head("Arama", "Arama", s ? `“${esc(q.q)}”: ${cs.length + ps.length + bs.length + ss.length} sonuç` : "", "")}
      <input class="inp" id="bigs" type="search" value="${esc(q.q || "")}" placeholder="Ara…" style="font-size:17px;padding:13px 15px;margin-bottom:12px">
      ${ps.length ? `<h2 class="section-title" style="margin-top:8px">Hazırlıklar</h2><div class="grid" style="margin-top:10px">${ps.map(pCard).join("")}</div>` : ""}
      ${cs.length ? `<h2 class="section-title">İçkiler</h2><div class="grid" style="margin-top:10px">${cs.map(cCard).join("")}</div>` : ""}
      ${bs.length ? `<h2 class="section-title">Backbar</h2><div class="grid" style="margin-top:10px">${bs.map(bCard).join("")}</div>` : ""}
      ${ss.length ? `<h2 class="section-title">Snack</h2><div class="grid" style="margin-top:10px">${ss.map(sCard).join("")}</div>` : ""}`,
      after: () => { const i = $("#bigs"); i.addEventListener("change", () => go("#/ara?q=" + encodeURIComponent(i.value))); if (!q.q) i.focus(); } };
  };
  V.notfound = () => ({ k: "", t: "Bulunamadı", html: `${head("404", "Sayfa bulunamadı", "", "")}<a class="btn" href="#/">Ana sayfa</a>` });

  function route() {
    const { parts, q } = parseHash();
    switch (parts[0] || "") {
      case "": return V.home();
      case "havuz": return V.havuz();
      case "kokteyller": return V.kokteyller(q);
      case "spritz": return V.spritz(q);
      case "shot": return V.shot(q);
      case "backbar": return V.backbar(q);
      case "snack": return V.snack(q);
      case "k": return V.k(parts[1]);
      case "b": return V.b(parts[1]);
      case "s": return V.s(parts[1]);
      case "hazirliklar": return V.hazirliklar(q);
      case "h": return V.h(parts[1], q);
      case "defter": return V.defter();
      case "menu": return V.menu();
      case "fiyatlar": return V.fiyatlar();
      case "ara": return V.ara(q);
      default: return V.notfound();
    }
  }
  function render() {
    const view = $("#view"); if (!view || !view.parentNode) return;
    const fresh = view.cloneNode(false);
    try { view.parentNode.replaceChild(fresh, view); } catch (e) { return; }
    let r; try { r = route(); } catch (e) { console.error(e); r = { k: "", t: "Hata", html: `<div class="note warn"><span class="tag">Hata</span><p>${esc(e.message)}</p></div>` }; }
    fresh.innerHTML = r.html; setActive(r.k, r.t);
    if (r.after) r.after();
    const cur = parseHash().h; if (cur !== lastHash) { window.scrollTo(0, 0); lastHash = cur; }
    $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("show");
  }

  async function boot() {
    try {
      const files = ["items", "preps", "cocktails", "spritz", "shots", "backbar", "snacks"];
      const [it, pr, ck, sp, sh, bb, sn] = await Promise.all(files.map((f) => fetch("data/" + f + ".json").then((r) => { if (!r.ok) throw new Error(f + ".json yüklenemedi"); return r.json(); })));
      D.items = it.items; D.priceNote = it.note; D.preps = pr.preps; D.prepCats = pr.categories;
      D.cocktails = ck.cocktails.map((c) => Object.assign({ set: "cocktail" }, c)); D.families = ck.families;
      D.formats = Object.assign({}, ck.formats, { shot: { n: "Shot · premix", s: "Premix şişeden 5 sn’de dök" } });
      D.spritz = sp.spritz.map((c) => Object.assign({ set: "spritz" }, c)); D.spritzNote = sp.note;
      D.shots = sh.shots.map((c) => Object.assign({ set: "shot" }, c)); D.shotNote = sh.note;
      D.backbar = bb.bottles; D.backbarCats = bb.cats; D.backbarNote = bb.note;
      D.snacks = sn.snacks; D.snackCats = sn.cats; D.snackNote = sn.note;
      D.drinks = D.cocktails.concat(D.spritz, D.shots);
    } catch (e) {
      $("#view").innerHTML = `<div class="note warn"><span class="tag">Veri yüklenemedi</span><p>${esc(e.message)}</p><p>Uygulama bir web sunucusu üzerinden (GitHub Pages) açılmalıdır; dosyayı doğrudan açmak JSON yüklemesini engeller.</p></div>`; return;
    }
    D.items.forEach((x) => { IT[x.id] = x; }); D.preps.forEach((x) => { PR[x.id] = x; }); D.drinks.forEach((x) => { CK[x.id] = x; }); D.families.forEach((x) => { FAM[x.id] = x; });
    D.backbar.forEach((x) => { BB[x.id] = x; }); D.snacks.forEach((x) => { SN[x.id] = x; });
    buildNav();
    $("#menu-btn").addEventListener("click", () => { $("#sidebar").classList.add("open"); $("#scrim").classList.add("show"); });
    $("#scrim").addEventListener("click", () => { $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("show"); });
    $("#side-search").addEventListener("keydown", (e) => { if (e.key === "Enter") { go("#/ara?q=" + encodeURIComponent(e.target.value)); e.target.blur(); } });
    const setOnline = () => document.body.classList.toggle("offline", !navigator.onLine);
    window.addEventListener("online", setOnline); window.addEventListener("offline", setOnline); setOnline();
    if (!/github\.io$|localhost|127\.0\.0\.1/.test(location.hostname) && location.protocol !== "file:") { $(".hb").href = "https://claude.ai/artifact/9d2rT1dwKxYTmJpKS6e9kj"; $(".tm").href = "https://claude.ai/artifact/5qNiFepjqXSPYvSb4ycry8"; }
    window.addEventListener("hashchange", () => { if (location.hash.indexOf("#/") === 0) CUR = location.hash; render(); });
    document.addEventListener("click", (e) => { const a = e.target.closest('a[href^="#/"]'); if (!a || e.metaKey || e.ctrlKey) return; e.preventDefault(); go(a.getAttribute("href")); });
    render();
  }
  boot();
})();
