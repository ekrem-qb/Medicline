// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

'use strict'

const { ipcRenderer } = require('electron')
const log = require('electron-log')
const emailSuffix = '@medicline.com'

async function main() {
  // breakpoints should work from here on,
  // toggle them with F9 or just use 'debugger'
  //debugger

  // await the document to finish loading
  await new Promise(resolve => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', resolve) : resolve())

  // notify Main that Renderer is ready
  ipcRenderer.send('rendererReady', null)

  // await confirmation that Main is ready
  await new Promise(resolve => ipcRenderer.once('mainReady', resolve))

  // now both Main and Renderer processes are ready
  // we can do whatever we want
}

Object.assign(console, log.functions)

document.onkeydown = (event => {
  if (event.key == 'F5') {
    location.reload()
  }
})

//#region Update

const dialogUpdate = document.getElementById('dialogUpdate')

if (dialogUpdate) {
  ipcRenderer.on('update-downloaded', (event, updateInfo, currentVersion) => {
    dialogUpdate.querySelector('input#currentVersion').materialComponent.value = currentVersion
    dialogUpdate.querySelector('input#newVersion').materialComponent.value = updateInfo.version
    dialogUpdate.materialComponent.open()
  })
}

//#endregion

//#region Window Maximize

const maximizeIcon = document.querySelector('.window-action>svg.maximize')
const dragAreas = document.querySelectorAll('.drag-area')

ipcRenderer.on('window-action', (event, action) => {
  switch (action) {
    case 'maximize':
      maximizeIcon.classList.remove('maximize')
      maximizeIcon.classList.add('restore')
      dragAreas.forEach(dragArea => {
        dragArea.classList.remove('ms-1', 'mt-1')
      })
      break
    case 'unmaximize':
      maximizeIcon.classList.add('maximize')
      maximizeIcon.classList.remove('restore')
      dragAreas.forEach(dragArea => {
        dragArea.classList.add('ms-1', 'mt-1')
      })
      break
  }
})

//#endregion

main().catch(error => {
  console.log(error)
  alert(error)
})