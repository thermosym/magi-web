# MAGI System (Web)

A PWA reimagining of the MAGI system from *Neon Genesis Evangelion*. Three AI
agents — **MELCHIOR**, **BALTHASAR**, **CASPER** — each with a distinct
personality, independently answer a question and vote on the final verdict,
rendered in a NERV-style terminal UI.

This is a TypeScript / React / Vite rewrite of
[TomaszRewak/MAGI](https://github.com/TomaszRewak/MAGI), ported from a
Python/Dash app to a static, installable web app. Each wise man can be wired
to a **different LLM provider** (OpenRouter, OpenAI, Claude, Gemini, DeepSeek,
Qwen, GLM, MiniMax, APIYI, or any OpenAI-compatible endpoint including LM
Studio and other local servers).

## Quick start

Requires [pnpm](https://pnpm.io/) and Node 20+.

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Open the page. Every wise man starts in **待機** (standby, light red) because
nothing is configured yet. Click any wise man to open its modal and set:

- **provider** — dropdown
- **apiBase** — auto-prefilled from the provider; editable only when provider
  is `Custom`
- **apiKey** — paste your key (optional when provider is `Custom` for local
  servers that don't need auth)
- **model** — dropdown of common defaults per provider, plus a `Custom...`
  option to type any model id
- **personality** — editable system prompt for that wise man

Once all three are configured they turn **blue (起動, ready)** and the
question input unlocks.

## Supported providers

| Provider | apiBase | Transport |
| --- | --- | --- |
| OpenRouter | `https://openrouter.ai/api/v1` | OpenAI-compatible |
| OpenAI | `https://api.openai.com/v1` | OpenAI-compatible |
| Claude (Anthropic) | `https://api.anthropic.com/v1` | native `/v1/messages` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | OpenAI-compatible |
| DeepSeek | `https://api.deepseek.com/v1` | OpenAI-compatible |
| Qwen (DashScope) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI-compatible |
| GLM (Zhipu) | `https://open.bigmodel.cn/api/paas/v4` | OpenAI-compatible |
| MiniMax | `https://api.minimaxi.com/v1` | OpenAI-compatible |
| APIYI | `https://vip.apiyi.com/v1` | OpenAI-compatible |
| Custom | user-defined | OpenAI-compatible (e.g. LM Studio, Ollama, llama.cpp) |

Claude uses the native Anthropic API directly from the browser via the
`anthropic-dangerous-direct-browser-access: true` header. Gemini uses Google's
OpenAI-compat endpoint. Every other provider goes through a single
OpenAI-compatible client.

### Browser CORS caveat

Not every provider exposes CORS for direct browser-to-API calls. OpenRouter,
Anthropic (with the header above), Gemini's OpenAI-compat endpoint, and most
Chinese providers work. OpenAI, DeepSeek, and some others may refuse
browser-direct requests — in those cases, route through OpenRouter, APIYI, or
a local proxy.

### Running against a local LLM (LM Studio / Ollama / llama.cpp)

**This only works in the dev build, not in the deployed HTTPS version.**

In dev (`pnpm dev` → `http://localhost:5173/`), the app page is served over
`http://`, which is allowed to talk to another `http://localhost` port. Make
sure CORS is enabled in your local server's settings and point the Custom
provider at, for example, `http://localhost:1234/v1`.

A production HTTPS deployment (e.g. Cloudflare Pages, `https://*.pages.dev`)
**cannot** reach `http://localhost:1234` from the user's browser. This is not
a mis-configuration — it's a hard browser rule with two layers working
together:

1. **Private Network Access (PNA / CORS-RFC1918).** Chromium blocks public
   HTTPS pages from sending CORS preflights to private-network endpoints
   (localhost, `192.168.*`, `10.*`) unless the server sends an
   `Access-Control-Allow-Private-Network: true` header. Local LLM servers
   don't implement this, so the preflight fails before the real request is
   even attempted. DevTools labels this as a "CORS error", but the root cause
   is PNA.
2. **Mixed content.** Independently, HTTPS pages are generally forbidden from
   making plaintext HTTP requests. Browsers make an exception for `localhost`
   as a "potentially trustworthy" origin, so mixed content alone wouldn't
   block it — but combined with PNA above, the request is dead on arrival.

There is no fix for this that keeps the app as a pure static PWA served over
HTTPS. The intended workflow is:

- **For local-model experimentation:** run `pnpm dev` and use the HTTP dev
  server. LM Studio / Ollama / llama.cpp work out of the box.
- **For the deployed HTTPS version:** configure each wise man with a cloud
  provider (OpenRouter is the most CORS-friendly default).

localStorage is scoped per origin, so your dev-server config (pointing at
localhost) and your pages.dev config (pointing at cloud providers) are kept
independently and do not interfere with each other.

If you really want the deployed HTTPS version to reach a local LLM server,
the options involve infrastructure changes outside this app: wrapping the
local server in HTTPS via a reverse proxy like Caddy (auto-generated cert),
or exposing it through a tunnel like `cloudflared tunnel`. These are
intentionally not built into MAGI.

## How it works

Each question triggers **exactly three parallel LLM calls — one per wise man.
No central classifier, no follow-up "classify the answer" round.**

Every wise man receives:

1. A system prompt that injects their personality and instructs them to end
   with a single-line status tag:
   ```
   STATUS: YES | NO | CONDITIONAL_YES | ERROR
   ```
2. The user's question, with this instruction appended:
   > try your best to answer yes or no. If really not sure then
   > conditional_yes. if you are panic then error. use my original language
   > to give reasons.

The app parses the final `STATUS:` line from each reply. If a wise man
returned `CONDITIONAL_YES`, any trailing explanation on the STATUS line (or
the body above it) is captured as the `conditions` field and shown in the
modal.

### Voting

The final verdict is aggregated in strict priority order:

```
error  >  no  >  conditional_yes  >  yes
```

A single error, no, or conditional_yes anywhere wins over less severe
statuses. Only if **all three** wise men return YES does the final verdict
become YES.

### Visual states

| State | Wise man card | Response box |
| --- | --- | --- |
| Unconfigured | light red `#f0a0a0`, text `NAME • N / 待機` | idle 待機 blue |
| Configured, idle | blue `#3caee0`, text `NAME • N` | idle 待機 blue |
| Processing | flickering | flickering |
| `yes` | solid green | green `合 意` |
| `no` | dark red | dark red `拒 絶` |
| `conditional_yes` | green diagonal stripes | orange `状 態` |
| `error` | black with dark red text | black with dark red `誤 差` |

See `src/lib/magi.ts` for the parsing + voting logic and
`src/components/WiseMan.tsx` / `Response.tsx` for the visual states.

## Question history & reset

- Past questions are kept in `localStorage` (last 50, deduped).
- Click the question input to see them as a browser-native datalist dropdown.
- The **reset** button clears the current question and answers (returning all
  wise men to the blue idle state) without touching configs or history.

## Storage

Everything lives in the browser's `localStorage`:

| Key | Contents |
| --- | --- |
| `magi.config.v2` | per-wise-man provider, apiBase, apiKey, model, personality |
| `magi.history.v1` | past questions (max 50) |

There is no backend, no analytics, no remote persistence.

## Security note

**API keys are stored in your browser's `localStorage`.** Don't use this app
on shared or public computers. A hostile browser extension or any script
running in the same origin can read `localStorage` — this is the same threat
model as any single-page app that takes API keys from the user.

## Scripts

- `pnpm dev` — start Vite dev server with HMR
- `pnpm build` — type-check (`tsc -b`) and build to `dist/`
- `pnpm preview` — preview the production build
- `pnpm lint` — run ESLint

## Install as a PWA

The build output is a full PWA with manifest and service worker. Any
Chromium-based browser (and Safari on iOS) will offer an **Install** option
that adds MAGI to your Dock / home screen as a standalone app with its own
window.

## Deploying to Cloudflare Pages

The build output is fully static. Point Cloudflare Pages at this repo with:

- Build command: `pnpm build`
- Build output directory: `dist`
- Node version: `20` or higher

No environment variables are required — all configuration lives in the
browser.

## Project layout

```
src/
├── App.tsx                   — root component, state reducer, question flow
├── main.tsx
├── index.css                 — NERV terminal styles (ported from the original)
├── lib/
│   ├── providers.ts          — 10 provider registry (id, apiBase, models, kind)
│   ├── types.ts              — WiseManConfig / WiseManAnswer / AnswerStatus
│   ├── storage.ts            — localStorage config + history helpers
│   ├── llm.ts                — unified chat client (OpenAI-compat + Anthropic)
│   └── magi.ts               — askWiseMan, parseWiseManReply, aggregateStatus
└── components/
    ├── Magi.tsx              — grid layout + connectors + title
    ├── WiseMan.tsx           — wise man card with status visuals
    ├── WiseManModal.tsx      — per-wise-man config form
    ├── Response.tsx          — aggregated verdict box
    ├── Header.tsx
    ├── Status.tsx            — left-side "CODE:473 / EXTENTION:..." terminal text
    └── QuestionInput.tsx     — query input + history datalist + reset button
```

## Credits

- Original concept, prompts, and visual design:
  [TomaszRewak/MAGI](https://github.com/TomaszRewak/MAGI) — a Python/Dash
  implementation. This repo reimplements the same idea in TS/React with
  multi-provider LLM support.
- NERV aesthetic and all three personalities are from
  [*Neon Genesis Evangelion*](https://en.wikipedia.org/wiki/Neon_Genesis_Evangelion).
