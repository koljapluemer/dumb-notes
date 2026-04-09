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
}

export const notesApi = new NotesApiService()

export type { Settings, NoteMeta, NoteRead, SavePayload }
