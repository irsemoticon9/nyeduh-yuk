// gemini.js — Gemini integration (opsional, hybrid dengan engine lokal)
// Multi-API key + multi-model: SEMUA kombinasi key x model dicoba
// berurutan (failover). Kalau key A / model A gagal, lanjut ke berikutnya.
// Pola sama dengan brewlogic.app: recipe digenerate oleh AI, output JSON.

const GEMINI_MODELS = "bl_gemini_models";
const GEMINI_AVAILABLE = "bl_gemini_available";

// Pilihan model yang tersedia di panel settings
const MODEL_OPTIONS = [
  { id: "gemini-3.5-flash", label: "gemini-3.5-flash (fast, murah)" },
  { id: "gemini-3.8-flash", label: "gemini-3.8-flash" },
  { id: "gemini-flash-latest", label: "gemini-flash-latest" },
  { id: "gemini-flash-lite-latest", label: "gemini-flash-lite-latest (paling cepat)" },
  { id: "gemini-2.5-pro", label: "gemini-2.5-pro (berpikir lebih dalam)" },
  { id: "gemini-2.5-flash", label: "gemini-2.5-flash" },
];

// API key: multi-key, terenkripsi — dikelola di keys.js
function geminiKeyCount() { return geminiKeys().length; }

function geminiModels() {
  try {
    const a = JSON.parse(localStorage.getItem(GEMINI_MODELS) || "null");
    if (Array.isArray(a) && a.length) return a;
  } catch {}
  // Default: semua model dicentang (yang tidak tersedia otomatis di-skip saat generate)
  return MODEL_OPTIONS.map(m => m.id);
}

function saveGeminiModels(models) {
  localStorage.setItem(GEMINI_MODELS, JSON.stringify(Array.isArray(models) ? models : []));
}

// ---------- DETEKSI MODEL TERSEDIA ----------
function availableModelsCache() {
  try {
    const c = JSON.parse(localStorage.getItem(GEMINI_AVAILABLE) || "null");
    if (c && Array.isArray(c.models) && c.models.length) return c;
  } catch {}
  return null;
}

function saveAvailableModels(models) {
  localStorage.setItem(GEMINI_AVAILABLE, JSON.stringify({ ts: Date.now(), models }));
}

async function fetchAvailableModels(key) {
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": key },
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.error?.message || `HTTP ${r.status}`);
  }
  const j = await r.json();
  return (j.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map(m => (m.name || "").replace(/^models\//, ""))
    .filter(Boolean);
}

// Coba tiap key sampai dapat daftar model; simpan yang cocok dengan daftar kandidat.
async function detectAvailableModels(keys, candidates) {
  const list = candidates && candidates.length ? candidates : MODEL_OPTIONS.map(m => m.id);
  if (!keys.length) return { ok: false, error: "belum ada API key" };
  let lastErr = "tidak ada model kandidat yang cocok";
  for (const k of keys) {
    try {
      const ids = await fetchAvailableModels(k);
      const set = new Set(ids);
      const usable = list.filter(id => set.has(id));
      const detected = ids.filter(isChatModel);
      if (usable.length || detected.length) {
        saveAvailableModels(detected.length ? detected : usable);
        return { ok: true, models: usable, detected, all: ids };
      }
    } catch (e) {
      lastErr = e.message;
    }
  }
  return { ok: false, error: lastErr };
}

// Urutkan: model yang terdeteksi tersedia dicoba lebih dulu.
function orderedModels() {
  const sel = geminiModels();
  const cache = availableModelsCache();
  if (!cache) return sel;
  const avail = new Set(cache.models);
  return [...sel.filter(m => avail.has(m)), ...sel.filter(m => !avail.has(m))];
}

// Model yang tidak cocok untuk resep (image/tts/audio/riset/robotik) disaring keluar.
const NON_CHAT_MODEL = /(image|tts|transcribe|embedding|computer-use|deep-research|robotics|nano-banana|lyria|antigravity|veo|imagen)/;

function isChatModel(id) {
  return /^gemini-/.test(id) && !NON_CHAT_MODEL.test(id);
}

// Gabungan: daftar kurasi + model lain yang benar-benar terdeteksi di akun ini.
function allModelOptions() {
  const curated = MODEL_OPTIONS.map(m => ({ id: m.id, label: m.label }));
  const known = new Set(curated.map(c => c.id));
  const cache = availableModelsCache();
  const extras = (cache ? cache.models : [])
    .filter(id => !known.has(id) && isChatModel(id))
    .map(id => ({ id, label: `${id} (terdeteksi)` }));
  return [...curated, ...extras];
}

// ---------- PROMPT ----------
function buildPrompt(p) {
  const modeText = p.mode === "hot"
    ? "SEDUH PANAS (pour-over panas, tanpa es)"
    : "ES KOPI (flash chill: seduhan panas dituang langsung ke server berisi es batu)";

  // Konstanta hardware: klik gilingan dikunci ke range fisik grinder,
  // bukan dibiarkan AI memilih bebas (anti klik acak antar run).
  const cls = (typeof brewerClass !== "undefined") ? brewerClass(p.brewer) : "cone";
  const spec = (typeof GRINDER_SPECS !== "undefined") ? GRINDER_SPECS[p.grinder] : null;
  let grinderLine = `- Grinder: ${p.grinder}`;
  if (spec) {
    const r = spec.ranges[cls] || spec.ranges.cone;
    const mid = spec.fmt(Math.round((r[0] + r[1]) / 2));
    grinderLine += ` — dial ${spec.notation}.`;
    grinderLine += ` Range setting untuk metode ${cls}: ${spec.fmt(r[0])} s.d. ${spec.fmt(r[1])}.`;
    grinderLine += ` Pilih SATU setting di dalam range tersebut (lebih halus untuk acidity, lebih kasar untuk body/sweetness) dan tuliskan "gilingan" PERSIS dalam format R.N.T + total klik, contoh: ${mid}. Jangan memakai satuan atau angka di luar range itu.`;
  }

  return `Kamu adalah brew scientist profesional. Buat resep seduh kopi presisi.

INPUT:
- Mode: ${modeText}
- Asal kopi: ${p.origin || "Tidak disebut"}
- Processing: ${p.process}
- Varitas: ${p.variety}
- Roast: ${p.roast}
- Dosis kopi: ${p.dose} g
- Dripper: ${p.brewer}
${grinderLine}
- Air: ${p.water}
- Target profil: ${p.profile}

OUTPUT: JSON dengan field:
{
  "totalVolume": number (ml),
  "waktu": "MM:SS",
  "suhu": number (°C),
  "gilingan": string (setting grinder sesuai range hardware di atas),
  "airPanas": number (g),
  "es": number (g, 0 untuk SEDUH PANAS),
  "steps": [{ "judul": string, "waktu": "MM:SS", "deskripsi": string, "air": number (g) }],
  "notes": [string]
}
Aturan:
- totalVolume = airPanas + es.
- Deskripsikan katup/bukaan sesuai jenis dripper (immersion switch: sebut KATUP BUKA/TUTUP).
- Tailoring sesuai target profil, processing, dan karakter TDS air.
- Nilai numerik (suhu, air, waktu) harus konsisten dan dalam rentang wajar brew manual.
- Bahasa Indonesia.
- Jawab HANYA JSON valid, tanpa markdown, tanpa teks di luar JSON.`;
}

// ---------- API CALL ----------
async function callModel(key, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 90000);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error(j?.error?.message || `HTTP ${r.status}`);
    }
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Respon kosong");
    return parseRecipeJSON(text);
  } finally {
    clearTimeout(to);
  }
}

// Coba semua kombinasi key x model berurutan; return resep dari yang pertama sukses.
async function callGemini(p) {
  const keys = geminiKeys();
  if (!keys.length) throw new Error("NO_KEY");

  const prompt = buildPrompt(p);
  const models = orderedModels();
  if (!models.length) throw new Error("NO_MODEL");

  const errors = [];
  for (let ki = 0; ki < keys.length; ki++) {
    for (const model of models) {
      try {
        const ai = await callModel(keys[ki], model, prompt);
        return { ...ai, model, keyLabel: maskKey(keys[ki]) };
      } catch (e) {
        errors.push(`${model}@key${ki + 1}: ${e.message}`);
        // failover ke model/key berikutnya
      }
    }
  }
  throw new Error("Semua key+model gagal — " + errors.slice(0, 4).join(" | "));
}

function maskKey(k) {
  const t = k || "";
  return t.length > 8 ? t.slice(0, 6) + "…" + t.slice(-4) : "???";
}

function parseRecipeJSON(text) {
  let t = (text || "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("JSON tidak ditemukan di respon");
  return JSON.parse(t.slice(start, end + 1));
}

// ---------- TEST SEMUA KOMBINASI KEY x MODEL ----------
async function testModel(key, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 30000);
  try {
    const t0 = Date.now();
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Balas dengan satu kata saja: OK" }] }],
        generationConfig: { temperature: 0 },
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return { ok: false, err: j?.error?.message || `HTTP ${r.status}` };
    }
    const j = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { ok: false, err: "Respon kosong" };
    return { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, err: e.message };
  } finally {
    clearTimeout(to);
  }
}

async function testAllCombos(keys, models) {
  const out = [];
  for (let ki = 0; ki < keys.length; ki++) {
    for (const model of models) {
      const r = await testModel(keys[ki], model);
      out.push({ keyLabel: maskKey(keys[ki]), model, ok: r.ok, ms: r.ms, err: r.err });
    }
  }
  return out;
}

async function testGeminiKey() {
  const key = geminiKeys()[0];
  if (!key) return false;
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1`,
    { headers: { "x-goog-api-key": key } }
  );
  return r.ok;
}
