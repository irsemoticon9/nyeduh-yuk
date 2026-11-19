// keys.js — Multi-API key Gemini, disimpan terenkripsi (XOR + base64)
// Tujuannya: tidak ada plaintext key di repo GitHub.
// Catatan jujur: salt ikut tertanam di bundle -> ini obfuscation,
// bukan kriptografi kuat. Key tetap aman selama tidak ada yang
// membongkar salt dari bundle (dan untuk personal app, cukup).

const CRYPT_SALT = "brewlogic-personal-salt-2026";

// Ciphertext dari key yang sudah pernah dipakai (hasil xorB64 dengan CRYPT_SALT)
const EMBEDDED_KEYS_CIPHER = [
  "IyNLNg5XNSdVZhQTNkEFDCAOHQQuKR56fHEEeA0wMD8aBS0kKWw5NwogGFs+NmQGGw8dHmM=",
  "IyNLNg5XNSdVZCAIQRw3GQc4ahAXPllCSFNDTjRDFicAPCwfDn0kDggGWisIQWJKMD8ue3M=",
];

function xorCipher(data, salt) {
  const s = salt.split("");
  const out = data
    .split("")
    .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ s[i % s.length].charCodeAt(0)))
    .join("");
  return btoa(out);
}

function decryptCipher(ct) {
  try {
    const raw = atob(ct.trim());
    const s = CRYPT_SALT.split("");
    return raw
      .split("")
      .map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ s[i % s.length].charCodeAt(0)))
      .join("");
  } catch {
    return "";
  }
}

// Ambil semua key (didekripsi) dari localStorage
function geminiKeys() {
  try {
    const arr = JSON.parse(localStorage.getItem("bl_gemini_keys") || "[]");
    return arr.map(decryptCipher).filter(Boolean);
  } catch {
    return [];
  }
}

// Simpan daftar key (auto-enkripsi sebelum disimpan)
function saveGeminiKeys(keys) {
  const valid = (keys || []).map(k => (k || "").trim()).filter(Boolean);
  if (!valid.length) {
    localStorage.removeItem("bl_gemini_keys");
    return;
  }
  localStorage.setItem("bl_gemini_keys", JSON.stringify(valid.map(k => xorCipher(k, CRYPT_SALT))));
}

// Seed dari embedded ciphertext jika localStorage masih kosong
function seedEmbeddedKeys() {
  if (!localStorage.getItem("bl_gemini_keys")) {
    const decrypted = EMBEDDED_KEYS_CIPHER.map(decryptCipher).filter(Boolean);
    if (decrypted.length) {
      localStorage.setItem("bl_gemini_keys", JSON.stringify(decrypted.map(k => xorCipher(k, CRYPT_SALT))));
    }
  }
}

// Backward compatibility: single key lama (bl_gemini_key, plaintext)
function migrateOldKey() {
  const old = localStorage.getItem("bl_gemini_key");
  if (old && !localStorage.getItem("bl_gemini_keys")) {
    saveGeminiKeys([old]);
  }
  localStorage.removeItem("bl_gemini_key");
}

migrateOldKey();
seedEmbeddedKeys();
