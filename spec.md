You see here basic ts electron+vite+vue+daisyui+tailwind boilerplate.

What I want:

A very very minimal note-taking software, based on a folder of plaintext `.txt` files on the user's harddrive

- notes have only title and body
- basic UI: sidebar on the right, with a list of all notes, and a search box on top. Rest of the UI: editable note
- CRUD operations as needed
- true plaintext only notes, absolutely no rich text or markdown
- "Obsidian style" command popup, for now hosting only "Delete currently open note"
- "Obsidian style" opening popup (searching for existing notes), when typing in the name of a non-existing note, new note with this title is opened
- Settings modal (openable with icon-button on the bottom of the sidebar), for now just allows setting keyboard shortcuts for opening each of the modals, as well as for all the commands (i.e. for now just "delete currently open note"). Use a clean pattern for this.
- Settings modal should also have a folder picker to select which folder from the hard drive to use. If app is opened and this is folder is not set, open the modal autoamtically and hint to set this folder (establish a toast system)
- Prefer reasonably auto-save/auto-sync (not explicit "Save" buttons etc.)

Think about a clean, understandable architecture that keeps files, functions and classes neat and clean.
Follow Vue+Electron best practices

Ask clarification questions if you are unsure.
Always follow `./developer_guidelines.md`.
Always use LATEST, up to date (November 2025) documentation for libraries.