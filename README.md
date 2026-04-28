<div align="center">
  <img src="public/icons/comiq_logo.svg" alt="Comiq logo" width="192" height="192" />
  <h1>Comiq</h1>
  <p>Local-first comic reader PWA for CBR, CBZ, and CBT files</p>

[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Features](#features) • [Getting started](#getting-started) • [Usage](#usage) • [Architecture](#architecture) • [Development](#development)

</div>

---

Comiq is a fully client-side PWA for reading digital comics directly in your browser. Your files never leave your device — all archive extraction, thumbnail generation, and progress tracking happens locally. After the first load, the app works completely offline.

## Features

- **Library Mode** — Grant access to local folders once; browse a combined library with cover thumbnails and reading progress. Reopens comics where you left off, even after a browser restart.
- **Quick Read Mode** — Open a single comic instantly without folder setup. Works in any modern browser, keeping session state only for the current tab.
- **Three archive formats** — Native support for CBZ (ZIP), CBT (TAR), and CBR (RAR) archives.
- **Two reading layouts** — Switch between continuous scroll and page-flip modes without losing your position.
- **Page-flip controls** — Previous/next page buttons, arrow key navigation, and clockwise/anti-clockwise rotation.
- **Offline-capable** — Service worker caches the full app shell on first load.
- **No backend required** — Zero server uploads. All processing runs in the browser via Web Workers.
- **Installable** — Meets PWA criteria and can be installed as a standalone desktop app.

> [!NOTE]
> Library Mode uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) and is supported on **Chromium-based desktop browsers** (Chrome, Edge, Opera) only. Quick Read works in any modern browser.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [npm](https://www.npmjs.com/) 10 or later
- A Chromium-based browser (Chrome, Edge) for full Library Mode support

### Installation

```bash
git clone https://github.com/ProfSantosh/comiq.git
cd comiq
npm install
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:5173/comiq/](http://localhost:5173/comiq/) in your browser.

## Usage

### Library Mode

1. Open the app in a Chromium-based desktop browser.
2. Click **Add folder** and grant access to a folder containing your comics.
3. Repeat for additional folders — all comics appear in one combined library view.
4. Click any comic to start reading. Progress is saved automatically and restored on next open.
5. Click **Rescan** on a source to pick up new files added to the folder.
6. To remove a source, click the remove button next to it — this removes all its comics from the library.

### Quick Read Mode

1. Click **Quick Read** (or use Quick Read if your browser doesn't support Library Mode).
2. Select a CBR, CBZ, or CBT file.
3. Read immediately. The session is preserved within the current browser tab but does not persist after closing.

### Reading controls

| Action | Control |
|--------|---------|
| Next page | Right arrow / Down arrow / Next button |
| Previous page | Left arrow / Up arrow / Prev button |
| Rotate page | Rotation buttons in the toolbar |
| Switch layout | Toggle in the toolbar (scroll / page-flip) |

## Architecture

Comiq is a single-page React application with no backend. The key architectural decisions:

| Concern | Solution |
|---------|----------|
| Persistent library state | [Dexie](https://dexie.org/) (IndexedDB wrapper) |
| Quick Read session state | `sessionStorage` (tab-scoped only) |
| Archive extraction | Vite ES module Web Workers — keep main thread free |
| CBZ (ZIP) extraction | [fflate](https://github.com/101arrowz/fflate) |
| CBT (TAR) extraction | [js-untar](https://github.com/InvokIT/js-untar) |
| CBR (RAR) extraction | Optional WASM adapter (`unrar.js`) |
| Offline support | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + Workbox service worker |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Routing | React Router v7 |
| Hosting | GitHub Pages (`/comiq/` base path) |

### Source layout

```
src/
├── app/             # Root application component
├── components/      # Shared UI components
├── domain/
│   ├── archive/     # Archive adapters (CBZ, CBT, CBR) and adapter registry
│   ├── library/     # Library scanning, source management, capability detection
│   └── reader/      # Shared reader engine and error handling
├── features/
│   ├── library/     # Library view, grid, recently-read, source manager
│   ├── quick-read/  # Quick Read upload and session handling
│   ├── reader/      # Continuous scroll and page-flip reader components
│   └── settings/    # Reader preferences UI
├── persistence/     # Dexie DB schema and repository classes
├── routes/          # React Router route definitions
└── workers/         # Web Workers for extraction, page prep, and thumbnails
```

## Development

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server with PWA enabled |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run test:unit` | Run unit and integration tests with Vitest |
| `npm run test:coverage` | Run tests with V8 coverage report (70% threshold) |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run deploy` | Build and publish to GitHub Pages |

### Testing

Unit and integration tests use [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/). IndexedDB is mocked with [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB).

End-to-end tests use [Playwright](https://playwright.dev/). Install browser binaries before the first run:

```bash
npx playwright install chromium
```

Then run the full E2E suite:

```bash
npm run test:e2e
```

> [!TIP]
> Coverage must remain above 70% for statements, branches, functions, and lines. Run `npm run test:coverage` to check before opening a pull request.

### Deploying

The app is configured for GitHub Pages at the `/comiq/` base path. To deploy:

```bash
npm run deploy
```

This builds the app and pushes the `dist/` folder to the `gh-pages` branch using [gh-pages](https://github.com/tschaub/gh-pages).
