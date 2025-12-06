import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import packageJson from '../../package.json'

// Disable sandbox inside AppImage/packaged builds to avoid chrome-sandbox permission requirement
process.env.ELECTRON_DISABLE_SANDBOX = '1'
app.commandLine.appendSwitch('no-sandbox')

// Register custom protocol as privileged BEFORE app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'attachment',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
    },
  },
])

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

type AttachmentMeta = {
  filename: string
  storedAs: string
  mimeType: string
  size: number
  addedAt: number
}

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')
const NOTE_EXT = '.txt'
const ATTACHMENT_EXT = '.attachment'
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
  // Register custom protocol for serving attachment files
  protocol.handle('attachment', async (request) => {
    console.log('[PROTOCOL] Request received:', request.url)
    try {
      // Extract the file path from attachment://filename
      // Remove trailing slash that gets added by standard protocol
      let url = request.url.slice('attachment://'.length)
      if (url.endsWith('/')) {
        url = url.slice(0, -1)
      }
      console.log('[PROTOCOL] Extracted filename:', url)

      const settings = readSettings()
      console.log('[PROTOCOL] Settings folder:', settings.folderPath)

      const attachmentsFolder = getAttachmentsFolder(settings.folderPath)
      console.log('[PROTOCOL] Attachments folder:', attachmentsFolder)

      const filePath = path.join(attachmentsFolder, url)
      console.log('[PROTOCOL] Full file path:', filePath)

      // Security: verify file is within attachments folder
      if (!filePath.startsWith(attachmentsFolder)) {
        console.log('[PROTOCOL] ERROR: Path outside attachments folder')
        return new Response('Forbidden', { status: 403 })
      }

      // Check file exists
      if (!fs.existsSync(filePath)) {
        console.log('[PROTOCOL] ERROR: File does not exist')
        return new Response('Not Found', { status: 404 })
      }

      console.log('[PROTOCOL] File exists, serving...')
      const fileUrl = 'file://' + filePath
      console.log('[PROTOCOL] Fetching from:', fileUrl)

      // Serve the file
      const response = await net.fetch(fileUrl)
      console.log('[PROTOCOL] Response status:', response.status)
      return response
    } catch (err) {
      console.error('[PROTOCOL] ERROR:', err)
      return new Response('Internal Server Error', { status: 500 })
    }
  })

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
    title: `Dumb Notes v${packageJson.version}`,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Start maximized for full-height layout
  mainWindow.maximize()

  // Set title after page load to override HTML <title>
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.setTitle(`Dumb Notes v${packageJson.version}`)
  })

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

// Attachment helpers
function getAttachmentMetaPath(folderPath: string, noteTitle: string): string {
  return path.join(folderPath, `${noteTitle}${ATTACHMENT_EXT}`)
}

function getAttachmentsFolder(folderPath: string): string {
  return path.join(folderPath, '.attachments')
}

function sanitizeFilename(filename: string): string {
  // Remove or replace unsafe characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace illegal chars
    .replace(/\s+/g, '_') // Replace whitespace with underscores
    .replace(/[()[\]{}]/g, '') // Remove brackets and parens
    .replace(/—|–/g, '-') // Replace em/en dashes with hyphens
    .replace(/[''""]/g, '') // Remove smart quotes
    .replace(/[^\w.-]/g, '_') // Replace any remaining non-alphanumeric chars
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^[._-]+|[._-]+$/g, '') // Trim leading/trailing special chars
}

function generateStoredFilename(originalFilename: string): string {
  const hash = crypto.randomBytes(6).toString('hex')
  const ext = path.extname(originalFilename)
  const nameWithoutExt = path.basename(originalFilename, ext)
  const safeName = sanitizeFilename(nameWithoutExt)
  const safeExt = sanitizeFilename(ext)
  return `${hash}_${safeName}${safeExt}`
}

function getAttachment(folderPath: string, noteTitle: string): AttachmentMeta | null {
  const metaPath = getAttachmentMetaPath(folderPath, noteTitle)
  try {
    const raw = fs.readFileSync(metaPath, 'utf-8')
    return JSON.parse(raw) as AttachmentMeta
  } catch {
    return null
  }
}

function addAttachment(folderPath: string, noteTitle: string, sourceFilePath: string): AttachmentMeta {
  ensureFolder(folderPath)

  // Create .attachments folder if needed
  const attachmentsFolder = getAttachmentsFolder(folderPath)
  fs.mkdirSync(attachmentsFolder, { recursive: true })

  // Generate stored filename and copy file
  const originalFilename = path.basename(sourceFilePath)
  const storedFilename = generateStoredFilename(originalFilename)
  const destPath = path.join(attachmentsFolder, storedFilename)

  fs.copyFileSync(sourceFilePath, destPath)

  // Get file stats
  const stats = fs.statSync(destPath)

  // Create metadata
  const metadata: AttachmentMeta = {
    filename: originalFilename,
    storedAs: storedFilename,
    mimeType: getMimeType(originalFilename),
    size: stats.size,
    addedAt: Date.now(),
  }

  // Write metadata file
  const metaPath = getAttachmentMetaPath(folderPath, noteTitle)
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2))

  return metadata
}

function removeAttachment(folderPath: string, noteTitle: string): void {
  const metadata = getAttachment(folderPath, noteTitle)
  if (!metadata) return

  // Delete attachment file
  const attachmentsFolder = getAttachmentsFolder(folderPath)
  const attachmentPath = path.join(attachmentsFolder, metadata.storedAs)
  try {
    fs.unlinkSync(attachmentPath)
  } catch {
    // File might already be missing
  }

  // Delete metadata file
  const metaPath = getAttachmentMetaPath(folderPath, noteTitle)
  try {
    fs.unlinkSync(metaPath)
  } catch {
    // Metadata might already be missing
  }
}

function renameAttachment(folderPath: string, oldTitle: string, newTitle: string): void {
  const oldMetaPath = getAttachmentMetaPath(folderPath, oldTitle)
  const newMetaPath = getAttachmentMetaPath(folderPath, newTitle)

  if (fs.existsSync(oldMetaPath)) {
    fs.renameSync(oldMetaPath, newMetaPath)
  }
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

function getAttachmentUrl(folderPath: string, noteTitle: string): string | null {
  const metadata = getAttachment(folderPath, noteTitle)
  if (!metadata) return null

  const attachmentsFolder = getAttachmentsFolder(folderPath)
  const attachmentPath = path.join(attachmentsFolder, metadata.storedAs)

  if (!fs.existsSync(attachmentPath)) return null

  const url = `attachment://${metadata.storedAs}`
  console.log('[GET_ATTACHMENT_URL] Generated URL:', url, 'for file:', attachmentPath)
  return url
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

  // Handle attachment rename if title changed
  if (payload.originalTitle && payload.originalTitle !== payload.title) {
    renameAttachment(folderPath, payload.originalTitle, payload.title)
  }

  const saved = saveNote(folderPath, payload)
  return saved
})

ipcMain.handle('delete-note', (_e, title: string) => {
  const { folderPath } = readSettings()

  // Delete attachment if exists
  removeAttachment(folderPath, title)

  deleteNote(folderPath, title)
  return true
})

// Attachment IPC handlers
ipcMain.handle('attachment:get', (_e, noteTitle: string) => {
  const { folderPath } = readSettings()
  return getAttachment(folderPath, noteTitle)
})

ipcMain.handle('attachment:select-and-add', async (_e, noteTitle: string) => {
  const { folderPath } = readSettings()

  const res = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    title: 'Select file to attach',
  })

  if (res.canceled || res.filePaths.length === 0) return null

  const sourceFilePath = res.filePaths[0]
  return addAttachment(folderPath, noteTitle, sourceFilePath)
})

ipcMain.handle('attachment:remove', (_e, noteTitle: string) => {
  const { folderPath } = readSettings()
  removeAttachment(folderPath, noteTitle)
  return true
})

ipcMain.handle('attachment:open', (_e, noteTitle: string) => {
  const { folderPath } = readSettings()
  const metadata = getAttachment(folderPath, noteTitle)
  if (!metadata) throw new Error('Attachment not found')

  const attachmentsFolder = getAttachmentsFolder(folderPath)
  const attachmentPath = path.join(attachmentsFolder, metadata.storedAs)

  void shell.openPath(attachmentPath)
  return true
})

ipcMain.handle('attachment:get-url', (_e, noteTitle: string) => {
  const { folderPath } = readSettings()
  return getAttachmentUrl(folderPath, noteTitle)
})
