import { contextBridge, ipcRenderer } from 'electron'
import { IPC, StartSessionPayload, BlockSuggestion } from '../shared/types'

const api = {
  startSession: (payload: StartSessionPayload) =>
    ipcRenderer.send(IPC.START_SESSION, payload),
  onSessionEnded: (callback: () => void) => {
    ipcRenderer.on(IPC.SESSION_ENDED, () => callback())
  },
  getBlockSuggestions: (): Promise<BlockSuggestion[]> =>
    ipcRenderer.invoke(IPC.GET_BLOCK_SUGGESTIONS)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = api
}
