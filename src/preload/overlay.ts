import { contextBridge, ipcRenderer } from 'electron'
import { IPC, TickPayload, BorderSettings } from '../shared/types'

const api = {
  onTick: (callback: (payload: TickPayload) => void) => {
    ipcRenderer.on(IPC.TICK, (_event, payload: TickPayload) => callback(payload))
  },
  onBorderUpdate: (callback: (settings: BorderSettings) => void) => {
    ipcRenderer.on(IPC.UPDATE_BORDER, (_event, settings: BorderSettings) => callback(settings))
  },
  stopSession: () => ipcRenderer.send(IPC.STOP_SESSION)
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
