# dumb-notes

Minimal plaintext note-taker (Electron + Vite + Vue + Tailwind/DaisyUI). Notes live as `.txt` files in a single user-chosen folder; filename == title, file content == body. Unsafe or duplicate titles are rejected.

- Sidebar (right): search + list + sort dropdown (no subfolders).
- Main pane: title field + body textarea, autosave (debounced), external edit prompts, delete via command palette.
- Modals: open-note palette (`Ctrl+O`), command palette (`Ctrl+P`), settings (folder picker, shortcut bindings), toasts for warnings/errors.

## Prereqs
- Node 18+ (recommended 20+)
- npm

## Install
```bash
# root deps
npm install
# renderer deps
cd src/renderer && npm install
```

## Develop (hot reload)
Terminal 1 (renderer):
```bash
cd src/renderer
npm run dev -- --host
```
Terminal 2 (electron, loads dev server):
```bash
cd /home/b/GITHUB/dumb-notes
VITE_DEV_SERVER_URL=http://localhost:5173 npm run start
```

## Run with built assets
```bash
# build renderer
cd src/renderer && npm run build
# build main
cd /home/b/GITHUB/dumb-notes && npm run build:main
# launch
electron .
```

## Notes on titles
- Allowed: letters, numbers, spaces, dashes, underscores, parentheses, dots.
- Rejected: reserved DOS names, control chars, `<>:"/\\|?*`, trailing space/dot, `..`, duplicates.
- Empty title disallowed; empty body allowed.

## Keyboard shortcuts (default)
- `Ctrl+O` open-note palette
- `Ctrl+P` command palette
- Others: user-configurable in Settings

## Scripts (root)
- `npm run build:main` – compile Electron main/preload (outputs `dist/main`)
- `npm run start` – build main then launch Electron (uses dev server if `VITE_DEV_SERVER_URL` is set)
