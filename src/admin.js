const webview = document.querySelector('webview')
webview.addEventListener('dom-ready', () => {
    webview.openDevTools()
    webview.send('current-user', location.hash.replace('#', ''))
})

ipcRenderer.on('user-update', (event, uid, data) => {
    webview.send('user-update', uid, data)
})

ipcRenderer.on('user-add', event => {
    webview.send('user-add')
})