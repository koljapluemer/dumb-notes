# dumb-notes

> for notes that are too simple for Obsidian.md

Minimal plaintext note-taker (Electron + Vite + Vue + Tailwind/DaisyUI). Notes live as `.txt` files in a single user-chosen folder.

- Sidebar (right): search + list + sort dropdown (no subfolders).
- Main pane: title field + body textarea, autosave (debounced), external edit prompts, delete via command palette.
- Modals: open-note palette (`Ctrl+O`), command palette (`Ctrl+P`), settings (folder picker, shortcut bindings), toasts for warnings/errors.

## Prerequisites
- Node 18+ (recommended 20+)
- npm

## Quick Start

### Install
```bash
npm install
```

### Development

**Option 1** - Using `just` (recommended):
```bash
just dev
```

**Option 2** - Manual (3 separate terminals):

**Terminal 1** - Main process (watch mode):
```bash
npm run dev:main
```

**Terminal 2** - Renderer dev server:
```bash
npm run dev:renderer
```

**Terminal 3** - Launch Electron:
```bash
npm run start:dev
```

The app will hot-reload when you edit Vue files. Main process changes require restarting Terminal 3 (or `just dev`).

### Build .deb Package
```bash
npm run package:deb
```

Output: `release/dumb-notes_1.0.0_amd64.deb`

## Architecture

```
dumb-notes/
├── src/
│   ├── main/           # Electron main process (CommonJS)
│   │   ├── main.ts     # Window, IPC handlers
│   │   └── preload.ts  # Secure IPC bridge
│   └── renderer/       # Vue 3 SPA (ESM)
│       ├── src/
│       │   ├── App.vue
│       │   └── components/
│       ├── index.html
│       └── vite.config.ts
├── dist/
│   ├── main/           # Compiled Electron code
│   └── renderer/       # Built Vue app
└── package.json        # All dependencies here
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:renderer` | Start Vite dev server on :5173 |
| `npm run dev:main` | Compile main process in watch mode |
| `npm run start:dev` | Launch Electron connected to dev server |
| `npm run build:main` | Compile main process to `dist/main/` |
| `npm run build:renderer` | Build renderer to `src/renderer/dist/` |
| `npm run build` | Full production build (renderer + main + copy) |
| `npm run package:deb` | Build + create .deb package |
| `npm run package:appimage` | Build + create AppImage |
| `npm start` | Build main and run Electron |
| `npm run clean` | Remove all build artifacts |
| `npm run typecheck` | Run Vue type checking |
