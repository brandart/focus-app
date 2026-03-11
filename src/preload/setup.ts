import { contextBridge, ipcRenderer } from 'electron'
import { IPC, StartSessionPayload } from '../shared/types'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', {
      startSession: (payload: StartSessionPayload) =>
        ipcRenderer.send(IPC.START_SESSION, payload),
      onSessionEnded: (callback: () => void) => {
        ipcRenderer.on(IPC.SESSION_ENDED, () => callback())
      }
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = {
    startSession: (payload: StartSessionPayload) =>
      ipcRenderer.send(IPC.START_SESSION, payload),
    onSessionEnded: (callback: () => void) => {
      ipcRenderer.on(IPC.SESSION_ENDED, () => callback())
    }
  }
}
