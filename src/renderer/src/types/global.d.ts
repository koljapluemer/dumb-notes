export {}

declare global {
  interface Window {
    notesApi: {
      selectFolder: () => Promise<string | null>
      getSettings: () => Promise<any>
      setSettings: (settings: any) => Promise<any>
      listNotes: () => Promise<any>
      readNote: (title: string) => Promise<any>
      saveNote: (payload: any) => Promise<any>
      deleteNote: (title: string) => Promise<any>
      onNotesChanged: (callback: (payload: { eventType: string; title: string }) => void) => void
      removeNotesChanged: (callback: (...args: any[]) => void) => void
    }
  }
}
