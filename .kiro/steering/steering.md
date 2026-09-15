---
inclusion: always
---

# GPRO Extractor

Chrome extension (Manifest V3) that scrapes a player's driver and car data from GPRO game pages, stores it, and pastes it into GPRO Tools forms. Runs on `*.gpro.net` and `*.gpro-tools.eu`.

## Architecture

Three-part message-passing flow. Keep this separation intact:

- `popup.js` / `popup.html` — UI layer. Three actions: extract driver, extract car, paste. Sends messages to the active tab via `chrome.tabs.sendMessage` and renders status/results. Never scrapes or touches the DOM of game pages directly.
- `content.js` — injected content script. Owns all page DOM reading (extraction) and writing (pasting), plus `chrome.storage.local` reads/writes. Registers a single `chrome.runtime.onMessage` listener that dispatches on `request.action`.
- `chrome.storage.local` — single source of truth. All data lives under the `gproDriverData` key as `{ updatedAt, driver, car }`.

Message actions (the contract between popup and content): `extractData`, `extractCarData`, `pasteData`.

## Conventions

- **Message responses** are always `{ success: boolean, ... }`. On failure include a user-facing `error` string; on success include `data`, `count`, and/or `message`.
- **Async responses**: `return true` from the `onMessage` listener whenever `sendResponse` is called inside an async callback (e.g. `chrome.storage.local` callbacks), otherwise the message channel closes early.
- **Storage merges** are non-destructive. Extracting driver data must not wipe car data, and vice versa. Always spread existing data and refresh `updatedAt`: `{ ...currentData, updatedAt: new Date().toISOString(), driver: ... }`.
- **User-facing strings are Portuguese (pt-BR)**. All status messages, errors, and button labels stay in Portuguese. Code identifiers and comments may be Portuguese or English as already present; match the surrounding file.
- **Fail gracefully on missing DOM.** Extraction/paste functions locate their target element/table first and return a `{ success: false, error }` with a specific Portuguese message if it is absent, rather than throwing.

## DOM matching patterns

Game and Tools pages are not controlled by us, so matching is defensive and text-based:

- Locate tables/sections by anchor elements: `<caption>` text (`"Carro"`, `"Piloto"`), `<th>` text, or known IDs like `#dvSkillsTable`.
- Normalize labels before comparing: strip accents (`normalize("NFD")` + combining-mark regex), lowercase, and remove non-alphanumerics. Reuse the existing `normalizeKey` helper.
- Prefer stable identifiers (element `id`, `select`/`input` `name` prefixes like `Buy`) over positional/text matching when available; fall back to normalized labels.
- Map extracted keys to target form fields through the `CAR_KEY_MAP` and driver `aliases` objects. Add new mappings there rather than hardcoding lookups inline.
- After setting an input's `value`, dispatch both `input` and `change` events with `{ bubbles: true }` so the target page's framework registers the update.

## Working in this codebase

- Update `manifest.json` `matches` when supporting new host pages, and bump `version` on releases.
- Keep permissions minimal — currently `storage`, `activeTab`, `scripting`.
- There is no build step, framework, or test runner; this is plain JS loaded directly by Chrome. Verify changes by loading the unpacked extension.
