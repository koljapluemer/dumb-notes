import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'

// Disable sandbox inside AppImage/packaged builds to avoid chrome-sandbox permission requirement
process.env.ELECTRON_DISABLE_SANDBOX = '1'
app.commandLine.appendSwitch('no-sandbox')

type Settings = {
  folderPath: string
  shortcuts: Record<string, string>
}

type NoteMeta = {
  title: string
  updatedAt: number
  createdAt: number
}

type NoteRead = {
  title: string
  body: string
  updatedAt: number
}

type SavePayload = {
  originalTitle?: string
  title: string
  body: string
}

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')
const NOTE_EXT = '.txt'
const RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
])

let mainWindow: BrowserWindow | null = null
const isDev = process.env.VITE_DEV_SERVER_URL !== undefined

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Start maximized for full-height layout
  mainWindow.maximize()

  if (isDev) {
    const url = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    void mainWindow.loadURL(url)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    // In packaged app, renderer bundle is staged at dist/renderer/*
    const indexHtml = path.join(__dirname, '../renderer/index.html')
    void mainWindow.loadFile(indexHtml)
  }
}

function readSettings(): Settings {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    return JSON.parse(raw) as Settings
  } catch {
    return { folderPath: '', shortcuts: {} }
  }
}

function writeSettings(settings: Partial<Settings>): Settings {
  const current = readSettings()
  const next: Settings = { ...current, ...settings }
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true })
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2))
  return next
}

function isSafeTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return false
  if (title.endsWith(' ') || title.endsWith('.')) return false
  if (title.includes('..')) return false
  if (/[<>:"/\\|?*\x00-\x1F]/.test(title)) return false
  if (RESERVED_NAMES.has(title.toUpperCase())) return false
  return true
}

function getNotePath(folderPath: string, title: string): string {
  return path.join(folderPath, `${title}${NOTE_EXT}`)
}

function ensureFolder(folderPath: string): void {
  if (!folderPath) {
    throw new Error('No folder selected')
  }
  const stat = fs.statSync(folderPath, { throwIfNoEntry: false })
  if (!stat || !stat.isDirectory()) {
    throw new Error('Selected folder not found')
  }
}

function listNotes(folderPath: string): NoteMeta[] {
  ensureFolder(folderPath)
  const files = fs.readdirSync(folderPath, { withFileTypes: true })
  return files
    .filter((f) => f.isFile() && f.name.endsWith(NOTE_EXT))
    .map((f) => {
      const full = path.join(folderPath, f.name)
      const stat = fs.statSync(full)
      const title = f.name.slice(0, -NOTE_EXT.length)
      return {
        title,
        updatedAt: stat.mtimeMs,
        createdAt: stat.birthtimeMs,
      }
    })
}

function readNote(folderPath: string, title: string): NoteRead {
  ensureFolder(folderPath)
  const filePath = getNotePath(folderPath, title)
  const stat = fs.statSync(filePath, { throwIfNoEntry: false })
  if (!stat) throw new Error('Note not found')
  const body = fs.readFileSync(filePath, 'utf-8')
  return { title, body, updatedAt: stat.mtimeMs }
}

function saveNote(folderPath: string, payload: SavePayload): NoteMeta {
  const { originalTitle, title, body } = payload
  if (!isSafeTitle(title)) throw new Error('Unsafe title')
  ensureFolder(folderPath)

  const targetPath = getNotePath(folderPath, title)
  const existing = fs.statSync(targetPath, { throwIfNoEntry: false })

  if (originalTitle && originalTitle !== title) {
    const originalPath = getNotePath(folderPath, originalTitle)
    const originalStat = fs.statSync(originalPath, { throwIfNoEntry: false })
    if (!originalStat) throw new Error('Original note missing')
    if (existing) throw new Error('Duplicate title')
    fs.writeFileSync(targetPath, body ?? '', 'utf-8')
    fs.unlinkSync(originalPath)
  } else if (!existing || body !== undefined) {
    fs.writeFileSync(targetPath, body ?? '', 'utf-8')
  } else {
    throw new Error('Duplicate title')
  }
  const stat = fs.statSync(targetPath)
  return { title, updatedAt: stat.mtimeMs, createdAt: stat.birthtimeMs }
}

function deleteNote(folderPath: string, title: string): void {
  ensureFolder(folderPath)
  const filePath = getNotePath(folderPath, title)
  fs.unlinkSync(filePath)
}

ipcMain.handle('select-folder', async () => {
  const res = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  })
  if (res.canceled || res.filePaths.length === 0) return null
  const folderPath = res.filePaths[0]
  writeSettings({ folderPath })
  return folderPath
})

ipcMain.handle('get-settings', () => {
  const settings = readSettings()
  return settings
})

ipcMain.handle('set-settings', (_e, next: Partial<Settings>) => {
  const saved = writeSettings(next)
  return saved
})

ipcMain.handle('list-notes', () => {
  const { folderPath } = readSettings()
  return listNotes(folderPath)
})

ipcMain.handle('read-note', (_e, title: string) => {
  const { folderPath } = readSettings()
  return readNote(folderPath, title)
})

ipcMain.handle('save-note', (_e, payload: SavePayload) => {
  const { folderPath } = readSettings()
  const saved = saveNote(folderPath, payload)
  return saved
})

ipcMain.handle('delete-note', (_e, title: string) => {
  const { folderPath } = readSettings()
  deleteNote(folderPath, title)
  return true
})
