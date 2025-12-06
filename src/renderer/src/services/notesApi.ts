/**
 * Notes API Service
 * Wraps the Electron IPC API for note operations.
 * This abstraction makes it easy to swap implementations (e.g., for JSON-based apps).
 */

type Settings = {
  folderPath: string
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

class NotesApiService {
  private api = window.notesApi

  async getSettings(): Promise<Settings> {
    return this.api.getSettings()
  }

  async setSettings(settings: Settings): Promise<Settings> {
    return this.api.setSettings(settings)
  }

  async selectFolder(): Promise<string | null> {
    return this.api.selectFolder()
  }

  async listNotes(): Promise<NoteMeta[]> {
    return this.api.listNotes()
  }

  async readNote(title: string): Promise<NoteRead> {
    return this.api.readNote(title)
  }

  async saveNote(payload: SavePayload): Promise<NoteMeta> {
    return this.api.saveNote(payload)
  }

  async deleteNote(title: string): Promise<void> {
    return this.api.deleteNote(title)
  }

  // Attachment methods
  async getAttachment(noteTitle: string): Promise<AttachmentMeta | null> {
    return this.api.getAttachment(noteTitle)
  }

  async selectAndAddAttachment(noteTitle: string): Promise<AttachmentMeta | null> {
    return this.api.selectAndAddAttachment(noteTitle)
  }

  async removeAttachment(noteTitle: string): Promise<void> {
    return this.api.removeAttachment(noteTitle)
  }

  async openAttachment(noteTitle: string): Promise<void> {
    return this.api.openAttachment(noteTitle)
  }

  async getAttachmentUrl(noteTitle: string): Promise<string | null> {
    return this.api.getAttachmentUrl(noteTitle)
  }
}

export const notesApi = new NotesApiService()

export type { Settings, NoteMeta, NoteRead, SavePayload, AttachmentMeta }
