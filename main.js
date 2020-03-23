const path = require('path')
const url = require('url')
const { app, BrowserWindow } = require('electron')

let win

function createWindow() {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: __dirname + "/img/icon.png",
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'pageTwo.html'),
        protocol: 'file',
        slashes: true
    }))

    //win.webContents.openDevTools()

    win.on('closed', () => {
        win = null
    })

    // Your web app's Firebase configuration

}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    app.quit()
})