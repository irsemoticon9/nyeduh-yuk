// BrewLogic Personal — hybrid recipe engine
// 1) Gemini AI (jika API key tersimpan) — pola sama dengan brewlogic.app
// 2) Rule-based lokal (fallback, offline)
// Database & form 1:1 dari brewlogic.app (ditarik via REA)

// ---------- DATABASE (identik dengan brewlogic.app) ----------
const BREWERS = [
  "1Zpresso Dripper 01", "April Brewer", "Cafec Flower Dripper", "Chemex 6-Cup",
  "Clever Dripper", "CRYSTAL EYE VECTOR", "Fellow Stagg X", "Hario V60",
  "Hario V60 Mugen", "Immersion Dripper Switch", "Kalita Wave 155", "Kono Meimon",
  "Melitta 1x4", "NextLevel Pulsar", "OREA 01", "Orea V3", "Orea V4",
  "Orea V4 Wide", "Origami S", "Timemore B75", "Timemore Crystal Eye",
  "Timemore Crystal Eye Dripper 01", "Timemore Crystal Eye Glass Dripper",
  "Timemore Crystal Eye Turbo Dripper", "UFO V3 01", "V60 Dripper Neo 01 + Switch",
];
const GRINDERS = [
  "1Zpresso J-Ultra", "1Zpresso JX", "1Zpresso JX-Pro / JX-Pro S",
  "1Zpresso K-Pro / K-Plus / K-Max", "1Zpresso K-Ultra", "1Zpresso Q Air / Q2",
  "1Zpresso X-Pro / X-Ultra", "1Zpresso ZP6", "1Zpresso ZP6 Special",
  "Breville Smart Grinder Pro", "Comandante C40 MK4", "Comandante C60 Baracuda",
  "Etzinger etz-I", "Fellow Ode Gen 2", "Fellow Opus 2 (Gen 2)",
  "Hario Canister (C-20)", "Hario Mini Slim+", "Hario Skerton Pro",
  "Kingrinder K6", "Kingrinder P0/P1/P2", "Kinu M47", "Latina Sumba / Sumbawa",
  "Latina Sumo", "Mahlkonig EK43 (Dial 1-11)", "Mahlkonig EK43 / EK43 S (Dial 0-16)",
  "Mavo Phantox Pro", "Mazzer Omega", "MHW-3BOMBER Blade R3", "OE Lido 3 / OG",
  "Pietro (Flat Burr)", "Porlex Mini II", "Starseeker Edge / Edge+",
  "Timemore Bricks 01S", "Timemore C2", "Timemore C3", "Timemore C3 ESP",
  "Timemore C3 ESP Pro", "Timemore C5", "Timemore C5 ESP PRO", "Timemore C5 Pro",
  "Timemore Chestnut X", "Timemore Nano / Plus", "Timemore S3", "Timemore S5 / S5 Pro",
  "Timemore Sculptor 064S / 078S", "Timemore Slim Plus", "Timemore x Millab M01",
  "Turin DF54", "Turin DF64 / DF64 Gen 2", "Varia Hand Grinder",
  "Vesper Lens Pro Titanium", "Vesper VS-3 FOLD", "Wacaco Exagrind",
];

// ---------- GRINDER SPECS (konstanta hardware, data terverifikasi) ----------
// Klik = sifat fisik grinder, bukan variabel resep. Range per metode dari
// Honest Coffee Guide + 9barbenchmark.
// Timemore C5 ESP Pro: 3 rotasi x 50 klik = 150 klik total.
// Notasi R.N.T (rotasi.number.tick): klik = R*50 + N*5 + T
//   espresso 0.4.2-0.9.0 (22-45), V60 0.9.3-1.6.4 (48-84),
//   pour over 1.0.0-2.2.1 (50-111), steep-and-release 1.0.4-1.9.3 (54-98),
//   filter machine 0.7.1-2.1.2 (36-107), aeropress 0.7.4-2.3.0 (39-115)
const GRINDER_SPECS = {
  "Timemore C5 ESP PRO": {
    notation: "R.N.T, 150 klik total",
    ranges: {
      pressure: [22, 45],
      cone: [48, 84],
      flat: [36, 107],
      immersion: [54, 98],
      kettle: [48, 84],
    },
    fmt: c => {
      c = Math.max(0, Math.min(150, Math.round(c)));
      const R = Math.floor(c / 50), N = Math.floor((c % 50) / 5), T = c % 5;
      return `${R}.${N}.${T} (${c} klik)`;
    },
  },
};

function grinderSetting(grinder, cls, grindScore) {
  const spec = GRINDER_SPECS[grinder];
  if (!spec) return "";
  const range = spec.ranges[cls] || spec.ranges.cone;
  const t = Math.max(0, Math.min(1, (grindScore - 2) / 2.5));
  return spec.fmt(range[0] + t * (range[1] - range[0]));
}

// ---------- STATE ----------
let roast = "MEDIUM";
let profile = "balance";
let histOpen = false;

const PROFILE_LABEL = {
  balance: "Balance & Clean",
  sweet: "More Sweetness",
  acid: "More Acidity",
  body: "More Body",
};

// ---------- INIT SELECTS ----------
function fillSelect(id, items, startIdx = 0) {
  const el = document.getElementById(id);
  el.innerHTML = items.map(i => `<option>${i}</option>`).join("");
  el.selectedIndex = startIdx;
}
fillSelect("fBrewer", BREWERS, BREWERS.indexOf("Hario V60"));
fillSelect("fGrinder", GRINDERS, 0);

// ---------- SEGMENTED CONTROLS ----------
function bindSeg(groupId, attr, setter) {
  const group = document.getElementById(groupId);
  group.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-" + attr + "]");
    if (!btn) return;
    group.querySelectorAll("button").forEach(b => b.classList.remove("seg-active"));
    btn.classList.add("seg-active");
    setter(btn.dataset[attr]);
  });
}
bindSeg("roastGroup", "roast", v => { roast = v; });
bindSeg("profileGroup", "profile", v => { profile = v; });

// ---------- PARAMS ----------
function collectParams(mode) {
  return {
    mode,
    origin: document.getElementById("fName").value.trim(),
    dose: Math.max(5, Math.min(60, parseFloat(document.getElementById("fAmount").value) || 15)),
    process: document.getElementById("fProcess").value,
    variety: document.getElementById("fVariety").value,
    roast,
    brewer: document.getElementById("fBrewer").value,
    grinder: document.getElementById("fGrinder").value,
    water: document.getElementById("fWater").value,
    profile: profile,
    profileLabel: PROFILE_LABEL[profile],
  };
}

// ---------- LOCAL ENGINE (rule-based fallback) ----------
function brewerClass(name) {
  const n = name.toLowerCase();
  if (n.includes("ufo")) return "pressure";
  if (n.includes("clever") || n.includes("april") || n.includes("immersion")) return "immersion";
  if (n.includes("kalita") || n.includes("melitta")) return "flat";
  if (n.includes("stagg") || n.includes("kettle")) return "kettle";
  return "cone";
}

function localRecipe(p) {
  const cls = brewerClass(p.brewer);
  let ratio = p.mode === "hot" ? 15 : 13;
  let grind = { cone: 3, flat: 2.5, immersion: 3, pressure: 2, kettle: 3 }[cls];
  let temp = { LIGHT: 94, MEDIUM: 92, DARK: 90 }[p.roast];
  let timeSec = { cone: 150, flat: 180, immersion: 210, pressure: 90, kettle: 150 }[cls];

  if (cls === "pressure") { ratio = 2; timeSec = 95; temp = 93; }

  const pAdj = {
    balance: { ratio: 0, grind: 0, temp: 0, time: 0 },
    sweet:   { ratio: -1, grind: -0.3, temp: -1, time: 10 },
    acid:    { ratio: +1, grind: -0.3, temp: +1, time: -20 },
    body:    { ratio: -2, grind: +0.3, temp: -1, time: 20 },
  }[p.profile];
  ratio += pAdj.ratio; grind += pAdj.grind; temp += pAdj.temp; timeSec += pAdj.time;

  if (p.process === "Natural" || p.process === "Anaerobic / Fermented") grind += 0.3;
  else if (p.process === "Wet Hulled (Giling Basah)") { grind += 0.3; temp -= 1; }
  else if (p.process === "Experimental / Infused") grind += 0.1;

  if (p.roast === "LIGHT") grind += 0.2;
  if (p.roast === "DARK") grind -= 0.2;

  if (p.water.includes("Distilled") || p.water.includes("Amidis")) temp -= 1;
  if (p.water === "Le Minerale") temp += 1;

  const waterG = Math.round(p.dose * ratio);

  const grindSteps = [
    { max: 2, label: "Halus (fine)", mm: "0.5 - 0.8 mm" },
    { max: 2.6, label: "Medium-halus (medium-fine)", mm: "0.8 - 1.0 mm" },
    { max: 3.4, label: "Medium", mm: "1.0 - 1.2 mm" },
    { max: 4.2, label: "Medium-kasar (medium-coarse)", mm: "1.2 - 1.8 mm" },
    { max: 99, label: "Kasar (coarse)", mm: "1.8 mm+" },
  ];
  const g = grindSteps.find(s => grind <= s.max);

  const clicks = grinderSetting(p.grinder, cls, grind);

  let schedule = [];
  if (cls === "pressure") {
    schedule = [
      `Tamp: ringan (${p.dose} g, jangan dipadatkan)`,
      `Pompa: 9 - 11 pump stabil`,
      `Stop saat output ~${waterG} g (±95 detik)`,
    ];
  } else if (cls === "immersion") {
    schedule = [
      `Bloom: tuang ${Math.round(p.dose * 2)} g air, aduk 3 detik (0:00)`,
      `Tunggu 30 detik`,
      `Tuang semua ${waterG} g air, aduk 1-2x`,
      `Steep total ${fmtTime(timeSec)}, lalu seduh/serap semua`,
    ];
  } else {
    schedule = [
      `Bloom: tuang ${Math.round(p.dose * 2)} g air, tunggu 30 detik`,
      `Pulse 1: tuang sampai ${Math.round(waterG * 0.5)} g total`,
      `Pulse 2: tuang sampai ${waterG} g total`,
      `Total waktu di dripper: ${fmtTime(timeSec)}`,
    ];
  }
  if (p.mode === "iced") {
    schedule.unshift(`Siapkan gelas/server: isi es batu ±120-150 g di depan dripper`);
    schedule.push(`Hasil seduhan langsung dituang ke gelas berisi es`);
  }

  const varietyNotes = {
    "Abyssinia": "floral, citrus, body ringan",
    "Bourbon": "sweet, balanced, caramel",
    "Catimor": "body tebal, acidity rendah, earthy",
    "Caturra / Catuai": "body tebal, rendah asam, cokelat",
    "Ethiopian Heirlooms": "floral kompleks, berry",
    "Geisha": "jasmine, bergamot, sangat clean",
    "P88": "earthy, earth, low acidity",
    "Robusta (Fine Robusta)": "body sangat tebal, bitter notes - kurangi suhu 1-2°C",
    "S795 (Jember)": "earthy, spicier, low acidity",
    "Sigararutang / Ateng": "earthy, syrupy",
    "Typica": "clean, classic, acidity halus",
    "Mix Variety": "profil campur - tunjukkan profil dominan",
    "Lainnya (Input Manual)": "sesuaikan profil kopi",
  };
  const waterNotes = {
    "Aqua (Danone)": "TDS ~40-60 ppm - profil clean",
    "Le Minerale": "TDS ~148 ppm - profil lebih bold, mineral",
    "Nestle Pure Life": "TDS sedang - seimbang",
    "Cleo (Distilled/RO)": "TDS ~0 - tambah 1 g garam/tertiary atau suhu +1°C agar tidak flat",
    "Amidis (Distilled)": "TDS ~0 - profil paling bersih, risk of flat",
    "Lainnya (Input PPM)": "ideal TDS 70-120 ppm, hardness 50-75 ppm",
  };

  return {
    mode: p.mode === "hot" ? "SEDUH PANAS" : "ES KOPI",
    name: p.origin || "Kopi",
    origin: p.origin,
    dose: p.dose,
    ratio: cls === "pressure" ? `1:${ratio} (espresso)` : `1:${ratio}`,
    waterG,
    esG: p.mode === "iced" ? 120 : 0,
    totalVolume: p.mode === "iced" ? waterG + 120 : waterG,
    grindLabel: `${g.label} (${g.mm})`,
    clicks,
    grinder: p.grinder,
    temp: `${temp}°C`,
    time: fmtTime(timeSec),
    schedule,
    notes: [
      `Varitas ${p.variety}: ${varietyNotes[p.variety] || "profil standar"}.`,
      `Air: ${waterNotes[p.water] || "seimbang"}.`,
      cls === "kettle" ? `Stagg X = kettle, resep mengasumsikan dripper cone (V60) terpisah.` : "",
    ].filter(Boolean),
    source: "LOCAL",
    date: new Date().toISOString(),
  };
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return ss ? `${m}:${String(ss).padStart(2, "0")}` : `${m}:00`;
}

// ---------- GENERATE (hybrid) ----------
async function generateRecipe(mode) {
  const p = collectParams(mode);
  const label = mode === "hot" ? "SEDUH PANAS" : "ES KOPI";

  if (geminiKeys().length) {
    const overlay = document.getElementById("loadingOverlay");
    overlay.classList.remove("hidden");
    let recipe;
    try {
      const ai = await callGemini(p);
      recipe = normalizeAIRecipe(ai, p, label);
    } catch (e) {
      recipe = localRecipe(p);
      recipe.source = "LOCAL";
      recipe.aiError = e.message;
    } finally {
      overlay.classList.add("hidden");
    }
    renderRecipe(recipe);
    saveHistory(recipe);
  } else {
    const recipe = localRecipe(p);
    renderRecipe(recipe);
    saveHistory(recipe);
  }
}

function normalizeAIRecipe(ai, p, label) {
  const steps = (ai.steps || []).map((s, i) => {
    const air = s.air ? ` (${s.air} g air)` : "";
    return `${s.judul || "Step " + (i + 1)} [${s.waktu || "--:--"}]: ${s.deskripsi || ""}${air}`;
  });
  if (p.mode === "iced" && !steps.some(x => x.includes("es"))) {
    steps.unshift("Siapkan server berisi es batu");
  }
  return {
    mode: label,
    name: p.origin || "Kopi",
    origin: p.origin,
    dose: p.dose,
    ratio: `1:${(ai.airPanas / p.dose).toFixed(1)}`,
    waterG: ai.airPanas,
    esG: ai.es || 0,
    totalVolume: ai.totalVolume || (ai.airPanas + (ai.es || 0)),
    grindLabel: ai.gilingan || "sesuai grinder",
    clicks: "",
    grinder: p.grinder,
    temp: `${ai.suhu}°C`,
    time: ai.waktu || "--:--",
    schedule: steps,
    notes: ai.notes || [],
    source: "AI",
    model: ai.model || "",
    date: new Date().toISOString(),
  };
}

// ---------- RENDER ----------
function renderRecipe(r) {
  const result = document.getElementById("result");
  const badge = r.source === "AI"
    ? `<span class="text-[10px] font-bold tracking-widest text-accent bg-accent/10 rounded-full px-3 py-1" title="Model: ${r.model || ""}">⚡ AI RECIPE${r.model ? " · " + r.model : ""}</span>`
    : `<span class="text-[10px] font-bold tracking-widest text-zinc-400 bg-zinc-800 rounded-full px-3 py-1">LOCAL RECIPE</span>`;
  const iceRow = r.esG
    ? `${stat("AIR PANAS", r.waterG + " g")}${stat("ES DI SERVER", r.esG + " g")}`
    : `${stat("AIR", r.waterG + " g")}${stat("TOTAL VOLUME", r.totalVolume + " ml")}`;

  result.innerHTML = `
    <div class="rise bg-card border border-edge rounded-2xl p-5">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg font-bold text-white">${r.name}</h2>
          <p class="text-xs text-zinc-500">${r.mode} · ${r.grinder}</p>
        </div>
        ${badge}
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4">
        ${stat("RATIO", r.ratio)}
        ${stat("WAKTU", r.time)}
        ${stat("SUHU", r.temp)}
        ${stat("DOSIS", r.dose + " g")}
        ${iceRow}
      </div>

      <div class="bg-bgmain border border-edge rounded-xl p-4 mb-4">
        <p class="text-xs font-bold tracking-widest text-zinc-500 mb-2">GILINGAN</p>
        <p class="text-sm font-semibold text-white">${r.grindLabel}</p>
        ${r.clicks ? `<p class="text-xs text-accent mt-1">${r.grinder}: ${r.clicks}</p>` : ""}
      </div>

      <div class="mb-4">
        <p class="text-xs font-bold tracking-widest text-zinc-500 mb-2">STEP SEDUH</p>
        <ol class="space-y-2">
          ${r.schedule.map((s, i) => `
            <li class="flex gap-3 text-xs">
              <span class="text-accent font-bold shrink-0">${i + 1}</span>
              <span class="text-zinc-300">${s}</span>
            </li>`).join("")}
        </ol>
      </div>

      ${r.aiError ? `<p class="text-[11px] text-amber-400 mb-3">⚠ AI gagal (${r.aiError}) — menampilkan resep lokal.</p>` : ""}

      <div class="border-t border-edge pt-3 mb-4">
        ${r.notes.map(n => `<p class="text-[11px] text-zinc-500 mb-1">• ${n}</p>`).join("")}
      </div>

      <button id="btnCopy" class="w-full py-3 rounded-xl bg-accent text-black text-sm font-bold hover:bg-[#ccee27] transition-colors">
        SALIN RESEP
      </button>
    </div>`;
  result.classList.remove("hidden");
  document.getElementById("btnCopy").addEventListener("click", () => {
    const txt = [
      `${r.name} — ${r.mode} (${r.source === "AI" ? "Gemini AI" + (r.model ? " · " + r.model : "") : "Lokal"})`,
      `Kopi: ${r.dose} g | Air: ${r.waterG} g (${r.ratio})${r.esG ? " | Es: " + r.esG + " g" : ""}`,
      `Giling: ${r.grindLabel} | ${r.grinder}`,
      `Suhu: ${r.temp} | Waktu: ${r.time}`,
      "Step:",
      ...r.schedule.map((s, i) => `  ${i + 1}. ${s}`),
      ...(r.notes.length ? ["Catatan:", ...r.notes.map(n => "  - " + n)] : []),
    ].join("\n");
    navigator.clipboard.writeText(txt).then(() => {
      document.getElementById("btnCopy").textContent = "TERSALIN ✓";
      setTimeout(() => { document.getElementById("btnCopy").textContent = "SALIN RESEP"; }, 1500);
    });
  });
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function stat(label, value) {
  return `
    <div class="bg-bgmain border border-edge rounded-xl p-3">
      <p class="text-[10px] font-bold tracking-widest text-zinc-500 mb-1">${label}</p>
      <p class="text-sm font-bold text-accent">${value}</p>
    </div>`;
}

// ---------- HISTORY (localStorage) ----------
const HKEY = "bl_history";
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch { return []; }
}
function saveHistory(r) {
  const h = loadHistory();
  h.unshift({
    name: r.name,
    mode: r.mode,
    ratio: r.ratio,
    temp: r.temp,
    time: r.time,
    source: r.source,
    date: r.date,
  });
  localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 30)));
}
function renderHistory() {
  const panel = document.getElementById("historyPanel");
  const h = loadHistory();
  if (!histOpen || !h.length) { panel.classList.add("hidden"); return; }
  panel.classList.remove("hidden");
  panel.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-xs font-bold tracking-widest text-zinc-500">BREWING HISTORY</h3>
      <button id="btnClearH" class="text-[11px] text-zinc-500 hover:text-red-400 transition-colors">Hapus semua</button>
    </div>
    <div class="space-y-2">
      ${h.map((r, i) => `
        <div class="flex items-center justify-between bg-card border border-edge rounded-xl px-4 py-3">
          <div>
            <p class="text-sm font-semibold text-white">${r.name} <span class="text-[9px] font-bold ${r.source === "AI" ? "text-accent" : "text-zinc-500"}">${r.source}</span></p>
            <p class="text-[11px] text-zinc-500">${r.mode} · ${r.ratio} · ${r.temp} · ${r.time}</p>
          </div>
          <button data-del="${i}" class="text-zinc-600 hover:text-red-400 text-xs transition-colors">✕</button>
        </div>`).join("")}
    </div>`;
  document.getElementById("btnClearH").addEventListener("click", () => {
    localStorage.removeItem(HKEY);
    renderHistory();
  });
  panel.querySelectorAll("[data-del]").forEach(b => {
    b.addEventListener("click", () => {
      const arr = loadHistory();
      arr.splice(+b.dataset.del, 1);
      localStorage.setItem(HKEY, JSON.stringify(arr));
      renderHistory();
    });
  });
}
function toggleHistory() {
  histOpen = !histOpen;
  renderHistory();
}

// ---------- SETTINGS (Gemini) ----------
function initSettings() {
  const btn = document.getElementById("btnSettings");
  const panel = document.getElementById("settingsPanel");
  const keyEl = document.getElementById("geminiKey");
  const keyList = document.getElementById("keyList");
  const modelList = document.getElementById("modelList");
  const statusEl = document.getElementById("keyStatus");

  // Draft key (plaintext hanya di memori; yang disimpan selalu ciphertext)
  let draft = geminiKeys();
  let selectedModels = new Set(geminiModels());

  // Render checkbox model (kurasi + yang terdeteksi tersedia)
  function renderModels() {
    const opts = allModelOptions();
    modelList.innerHTML = opts.map(m => `
      <label class="flex items-center gap-2.5 bg-bgmain border border-edge rounded-xl px-3 py-2.5 cursor-pointer hover:border-accent/50 transition-colors">
        <input type="checkbox" value="${m.id}" ${selectedModels.has(m.id) ? "checked" : ""} class="accent-[#D4F932] w-4 h-4 shrink-0">
        <span class="text-xs text-zinc-300 break-all">${m.label}</span>
      </label>`).join("");
    modelList.classList.add("max-h-64", "overflow-y-auto", "pr-1");
    modelList.querySelectorAll("input").forEach(cb => {
      cb.addEventListener("change", () => {
        if (cb.checked) selectedModels.add(cb.value);
        else selectedModels.delete(cb.value);
      });
    });
  }
  renderModels();

  function checkedModels() {
    return Array.from(modelList.querySelectorAll("input:checked")).map(cb => cb.value);
  }

  function renderKeys() {
    keyList.innerHTML = draft.length
      ? draft.map((k, i) => `
        <div class="flex items-center gap-2 bg-bgmain border border-edge rounded-xl px-3 py-2">
          <span class="flex-1 text-xs text-zinc-300 font-mono">${maskKey(k)}</span>
          <span class="text-[10px] text-zinc-600">KEY ${i + 1}</span>
          <button data-del="${i}" class="text-zinc-600 hover:text-red-400 text-xs font-bold px-1">✕</button>
        </div>`).join("")
      : `<p class="text-[11px] text-zinc-600">Belum ada key tersimpan.</p>`;

    keyList.querySelectorAll("[data-del]").forEach(b => {
      b.addEventListener("click", () => {
        draft.splice(Number(b.dataset.del), 1);
        renderKeys();
      });
    });
  }

  btn.addEventListener("click", () => {
    panel.classList.toggle("hidden");
    draft = geminiKeys();
    renderKeys();
    selectedModels = new Set(geminiModels());
    renderModels();
    if (!panel.classList.contains("hidden")) autoDetect(false);
  });

  // Deteksi model yang benar-benar tersedia untuk key ini (otomatis saat panel dibuka sekali per 12 jam)
  async function autoDetect(force) {
    const cache = availableModelsCache();
    const stale = !cache || (Date.now() - cache.ts) > 12 * 60 * 60 * 1000;
    if (!force && !stale) return;
    if (!geminiKeys().length) return;
    updateStatus("Mendeteksi model yang tersedia...");
    const res = await detectAvailableModels(geminiKeys(), MODEL_OPTIONS.map(m => m.id));
    if (res.ok) {
      const avail = new Set(res.detected && res.detected.length ? res.detected : res.models);
      selectedModels = new Set([...avail]);
      renderModels();
      saveGeminiModels([...selectedModels]);
      updateStatus(`Tersedia ${selectedModels.size} model — semua otomatis dicentang.`);
    } else {
      updateStatus("Deteksi gagal (" + res.error + ") — semua model tetap dicoba saat generate.");
    }
  }

  function updateStatus(msg) {
    const n = geminiKeys().length;
    statusEl.textContent = msg || (n
      ? `${n} key tersimpan — model aktif: ${geminiModels().join(", ")}.`
      : "Tanpa API key → resep pakai engine lokal (rule-based).");
  }

  document.getElementById("btnAddKey").addEventListener("click", () => {
    const k = keyEl.value.trim();
    if (!k) { updateStatus("Isi API key dulu."); return; }
    if (draft.includes(k)) { updateStatus("Key itu sudah ada di daftar."); return; }
    draft.push(k);
    keyEl.value = "";
    renderKeys();
    updateStatus(`Ditambahkan ke daftar (${draft.length}). Klik SIMPAN untuk menyimpan.`);
  });

  document.getElementById("btnSaveKey").addEventListener("click", () => {
    const models = checkedModels();
    if (!draft.length) { updateStatus("Tambahkan minimal 1 key."); return; }
    if (!models.length) { updateStatus("Centang minimal 1 model."); return; }
    saveGeminiKeys(draft);
    saveGeminiModels(models);
    updateStatus(`Tersimpan ✓ — ${draft.length} key × ${models.length} model.`);
  });

  document.getElementById("btnDetectModels").addEventListener("click", () => autoDetect(true));

  document.getElementById("btnTestKey").addEventListener("click", async () => {
    const models = checkedModels();
    if (!draft.length) { updateStatus("Tambahkan minimal 1 key."); return; }
    if (!models.length) { updateStatus("Centang minimal 1 model."); return; }
    updateStatus("Menguji semua kombinasi key × model...");
    const results = await testAllCombos(draft, models);
    updateStatus(results.map(r =>
      `${r.keyLabel} ${r.model} ${r.ok ? "✓ " + r.ms + "ms" : "✗ " + r.err}`
    ).join("  ·  "));
  });

  renderKeys();
  updateStatus();
}

// ---------- MODE + SUBMIT ----------
let selectedMode = "hot";

function setMode(mode) {
  selectedMode = mode;
  document.querySelectorAll(".mode-btn").forEach(b => {
    const on = b.dataset.mode === mode;
    b.classList.toggle("seg-active", on);
    b.classList.toggle("text-white", !on);
  });
  const hint = document.getElementById("hint");
  if (hint) hint.textContent = (mode === "hot" ? "SEDUH PANAS" : "ES KOPI") + " dipilih → atur parameter → tekan PROSES RESEP";
}

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
});

const processBtn = document.getElementById("btnProcess");
processBtn.addEventListener("click", async () => {
  if (processBtn.disabled) return;
  const label = processBtn.textContent;
  processBtn.disabled = true;
  processBtn.textContent = "MEMPROSES...";
  try {
    await generateRecipe(selectedMode);
  } finally {
    processBtn.disabled = false;
    processBtn.textContent = label;
  }
});

setMode("hot");

document.getElementById("btnHistory").addEventListener("click", toggleHistory);
initSettings();
renderHistory();
