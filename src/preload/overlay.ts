import { contextBridge, ipcRenderer } from 'electron'
import { IPC, TickPayload } from '../shared/types'

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', {
      onTick: (callback: (payload: TickPayload) => void) => {
        ipcRenderer.on(IPC.TICK, (_event, payload: TickPayload) => callback(payload))
      },
      stopSession: () => ipcRenderer.send(IPC.STOP_SESSION)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electronAPI = {
    onTick: (callback: (payload: TickPayload) => void) => {
      ipcRenderer.on(IPC.TICK, (_event, payload: TickPayload) => callback(payload))
    },
    stopSession: () => ipcRenderer.send(IPC.STOP_SESSION)
  }
}
