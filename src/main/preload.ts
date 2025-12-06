import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

type NotesChangedPayload = { eventType: string; title: string }

const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),
  getSettings: (): Promise<any> => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: any): Promise<any> => ipcRenderer.invoke('set-settings', settings),
  listNotes: (): Promise<any> => ipcRenderer.invoke('list-notes'),
  readNote: (title: string): Promise<any> => ipcRenderer.invoke('read-note', title),
  saveNote: (payload: any): Promise<any> => ipcRenderer.invoke('save-note', payload),
  deleteNote: (title: string): Promise<any> => ipcRenderer.invoke('delete-note', title),
  onNotesChanged: (callback: (payload: NotesChangedPayload) => void) =>
    ipcRenderer.on('notes-changed', (_e: IpcRendererEvent, payload: NotesChangedPayload) =>
      callback(payload),
    ),
  removeNotesChanged: (callback: (...args: any[]) => void) =>
    ipcRenderer.removeListener('notes-changed', callback),
  // Attachment API
  getAttachment: (noteTitle: string): Promise<any> => ipcRenderer.invoke('attachment:get', noteTitle),
  selectAndAddAttachment: (noteTitle: string): Promise<any> =>
    ipcRenderer.invoke('attachment:select-and-add', noteTitle),
  removeAttachment: (noteTitle: string): Promise<any> =>
    ipcRenderer.invoke('attachment:remove', noteTitle),
  openAttachment: (noteTitle: string): Promise<any> => ipcRenderer.invoke('attachment:open', noteTitle),
  getAttachmentUrl: (noteTitle: string): Promise<any> =>
    ipcRenderer.invoke('attachment:get-url', noteTitle),
}

contextBridge.exposeInMainWorld('notesApi', api)

export type NotesApi = typeof api
