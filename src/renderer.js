// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

'use strict'

async function main() {
  const { ipcRenderer } = require('electron')

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

main().catch(function (error) {
  console.log(error)
  alert(error)
})