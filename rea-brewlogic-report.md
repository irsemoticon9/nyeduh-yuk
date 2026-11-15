# BrewLogic.app — REA Deep Dive

## Target
- **URL**: https://www.brewlogic.app/app
- **Framework**: React 19 + Tailwind CSS (class names: `p-2`, `rounded-full`, `font-sans`, etc.)
- **Build**: Hashed asset filenames (Vite/Rollup pattern)
- **Page Modified**: 2026-11-13 22:37:09
- **Charset**: UTF-8
- **Viewport**: width=device-width, initial-scale=1.0
- **Theme**: #050505 (near-black)

---

## 1. UI Component Inventory

### Primary Actions
| Button | Ref | Purpose |
|--------|-----|---------|
| SEDUH PANAS | e6 | Hot brew mode toggle |
| ES KOPI | e7 | Iced coffee mode toggle |
| LIGHT | e32 | Roast level |
| MEDIUM | e33 | Roast level |
| DARK | e34 | Roast level |
| Balance & Clean | e123 | Target flavor profile |
| More Sweetness | e124 | Target flavor profile |
| More Acidity | e125 | Target flavor profile |
| More Body | e126 | Target flavor profile |
| (Brewing History) | e2 | View history |
| (Install App) | e3 | PWA install prompt |

### Coffee Selection
| Field | Type | Ref | Current |
|-------|------|-----|---------|
| Coffee name | textbox | e8 | "cth. Arabika Gayo, Blue Bottle Ethiopia..." |
| Amount (grams) | spinbutton | e9 | 15 |

### Processing Method (select — e10)
Washed, Natural, Honey, Anaerobic / Fermented, Wet Hulled (Giling Basah), Experimental / Infused, Lainnya (Input Manual)

### Coffee Variety (select — e18)
Abyssinia, Bourbon, Catimor, Caturra / Catuai, Ethiopian Heirlooms, Geisha, P88, Robusta (Fine Robusta), S795 (Jember), Sigararutang / Ateng, Typica, Mix Variety, Lainnya (Input Manual)

### Hardware — Dripper (select — e35)
55 options including: 1Zpresso Dripper 01, April Brewer, Cafec Flower, Chemex 6-Cup, Clever Dripper, CRYSTAL EYE VECTOR, Fellow Stagg X, Hario V60, Hario V60 Mugen, Immersion Dripper Switch, Kalita Wave 155, Kono Meimon, Melitta 1x4, NextLevel Pulsar, OREA 01, Orea V3/V4/V4 Wide, Origami S, Timemore B75/Crystal Eye series, UFO V3 01, V60 Dripper Neo 01

### Hardware — Grinder (select — e62)
97 options including: 1Zpresso (J-Ultra, JX, K-Pro, K-Ultra, Q Air, X-Pro, ZP6), Breville Smart Grinder Pro, Comandante C40/C60, Etzinger etz-I, Fellow Ode Gen 2 / Opus 2, Hario (Canister, Mini Slim+, Skerton Pro), Kingrinder K6/P0/P1/P2, Kinu M47, Latina Sumba/Sumo, Mahlkönig EK43, Mavo Phantox Pro, Mazzer Omega, MHW-3BOMBER Blade R3, OE Lido 3, Pietro (Flat Burr), Porlex Mini II, Starseeker Edge, Timemore (Bricks 01S, C2, C3, C3 ESP, C5, Chestnut X, Nano/Plus, S3, S5, Sculptor, Slim Plus, x Millab M01), Turin DF54/DF64, Varia Hand Grinder, Vesper Lens Pro / VS-3 FOLD, Wacaco Exagrind

### Water (select — e116)
Aqua (Danone), Le Minerale, Nestle Pure Life, Cleo (Distilled/RO), Amidis (Distilled), Lainnya (Input PPM)

### Target Profile
Balance & Clean, More Sweetness, More Acidity, More Body

---

## 2. User Subscription Data (localStorage)

```json
{
  "status": "active",
  "plan": "Starter Brew",
  "expiry": "2026-12-14T11:33:18.453Z",
  "user": {
    "name": "Irse Surya Bagaskara",
    "email": "irsemoticon@gmail.com",
    "phone": "087731202329"
  },
  "orderId": "MANUAL-LOGIN",
  "paymentType": "MANUAL"
}
```

**Analysis**: Plan is "Starter Brew" with MANUAL login (no payment gateway used). Expiry ~1 month from current date.

---

## 3. Cookies

| Cookie | Value | Origin |
|--------|-------|--------|
| `_fbp` | `fb.1.1794658988814.221044044927187892` | Facebook Pixel tracking |

---

## 4. Local Storage Keys

| Key | Value |
|-----|-------|
| `brewlogic_sub` | JSON subscription (see above) |
| `lastExternalReferrer` | "other" |
| `lastExternalReferrerTime` | 1794658985563 |
| `pwa_dismissed` | "true" |

---

## 5. External Services & Integrations

| Service | Detail |
|---------|--------|
| Facebook Pixel | fbevents.js + noscript tracker (ID: 8773877136008649) |
| Cloudflare Turnstile | `challenges.cloudflare.com/turnstile/v0/api.js` — bot/honeypot challenge |
| Midtrans Snap | Payment gateway loaded dynamically in app (Midtrans = Indonesian payment processor) |
| Google Fonts | Inter (weights 300-700) |
| PWA | manifest.webmanifest, pwa-192x192.png, registerSW.js, Service Worker registered |
| Push | Browser Push API enabled |
| WebSocket | WebSocket API available |

---

## 6. JavaScript Bundle Inventory

| File | Likely Purpose |
|------|----------------|
| `index-D-92kmXX.js` | Main app bundle (entry point) |
| `index-DwOD2A6f.js` | CSS bundle entry |
| `BrewingConsole-CXK8abiu.js` | Brewing console component (core logic) |
| `LandingPage-DCCfE75t.js` | Landing page component |
| `MemberLogin-ByoYvGJq.js` | Login/member auth component |
| `helpers-Cx-4XURj.js` | Utility/helper functions |
| `fallbackData-CHX-gmZ7.js` | Fallback data (grinder/dripper/water lists?) |
| `settings-CBVkGnt8.js` | Settings page |
| `Footer-BoyOeqeR.js` | Footer component |
| `marker-shadow-Df7OGf8G.js` | Map/marker component |
| `globe-CmKO81sG.js` | Globe/geo component |
| `sliders-vertical-9r-Jyr-J.js` | Vertical slider component |
| `share-2-DdQ1WC9r.js` | Share functionality |
| `arrow-left-Bz0eHgTb.js` | Navigation back icon |
| `registerSW.js` | Service Worker registration |

---

## 7. PWA Configuration

- `apple-mobile-web-app-capable`: yes
- `mobile-web-app-capable`: yes
- `apple-mobile-web-app-status-bar-style`: black-translucent
- `theme-color`: #050505
- `manifest.webmanifest`: present
- Service Worker: registered and active
- `pwa_dismissed`: true (user dismissed PWA install prompt)

---

## 8. Security & Privacy

| Aspect | Finding |
|--------|---------|
| Facebook Pixel | Active tracking (FB events + noscript fallback) |
| Cloudflare Turnstile | Bot detection enabled |
| PWA | Installed as standalone app (black-translucent status bar) |
| Subscription | Storing PII in localStorage (name, email, phone) |
| Referrer tracking | lastExternalReferrer + timestamp stored |

---

## 9. Inferred App Architecture

```
BrewLogic.app
├── Landing Page (/)
├── App Console (/app) ← current
│   ├── Brewing Console
│   │   ├── Coffee Selection (name, amount)
│   │   ├── Processing Method
│   │   ├── Variety
│   │   ├── Roast Level
│   │   ├── Hardware (dripper, grinder, water)
│   │   └── Target Flavor Profile
│   ├── Brewing History
│   ├── Settings
│   ├── Install App (PWA)
│   ├── Share
│   └── AI Enhanced (Google Gemini via @google/genai)
├── Member Login
└── Payment (Midtrans Snap)
```

**Key insight**: The app imports `@google/genai@^1.34.0` — the "AI Enhanced" feature uses Google Gemini for brewing recommendations.

---

## 10. Open Questions / Further Investigation Needed

| Question | How to Answer |
|----------|---------------|
| What API endpoints are called? | Network capture (HAR) or Fiddler/ProxyMan |
| Where is subscription state validated? | Check server-side or if purely client-side |
| What does "Starter Brew" plan include? | Test feature limits |
| Is there an admin panel? | Check for /admin, /panel routes |
| What's the backend stack? | Inspect response headers |
| Can the subscription be bypassed? | Test with localStorage modification |
