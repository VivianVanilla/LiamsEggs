// The only bridge between the page and the system.

const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  info: () => ipcRenderer.invoke('info'),
  onCommand: (fn) => ipcRenderer.on('cmd', (_e, msg) => fn(msg)),

  setRects: (list) => ipcRenderer.send('rects', list),
  captureAll: (on) => ipcRenderer.send('captureAll', on),
  focus: (on) => ipcRenderer.send('focus', on),
  quitReady: () => ipcRenderer.send('quitReady'),
  closeGame: () => ipcRenderer.send('closeGame'),

  listArt: () => ipcRenderer.invoke('art:list'),
  listDisplays: () => ipcRenderer.invoke('displays:list'),
  setDisplay: (id) => ipcRenderer.invoke('displays:set', id),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  sampleScreen: (area) => ipcRenderer.invoke('screen:sample', area),

  listCreatures: () => ipcRenderer.invoke('creature:list'),
  saveCreature: (base, text) => ipcRenderer.invoke('creature:save', base, text),
  buryCreature: (base, text) => ipcRenderer.invoke('creature:bury', base, text),
  listGraves: () => ipcRenderer.invoke('creature:graves'),
  newCreatureBase: (name) => ipcRenderer.invoke('creature:newBase', name),
  readDroppedCreature: (file) => ipcRenderer.invoke('creature:readDropped', file),
  importCreatures: () => ipcRenderer.invoke('creature:importDialog'),
  exportCreature: (base, text) => ipcRenderer.invoke('creature:exportDialog', base, text),
  setActive: (base) => ipcRenderer.invoke('active:set', base),
  setTeam: (bases, active) => ipcRenderer.invoke('team:set', bases, active),

  consumeFood: (file) => ipcRenderer.invoke('food:consume', file),

  loadData: (key) => ipcRenderer.invoke('data:load', key),
  saveData: (key, text) => ipcRenderer.invoke('data:save', key, text),

  pathOfFile: (file) => webUtils.getPathForFile(file),
});
