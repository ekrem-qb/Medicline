'use strict'

async function main() {
    const { app, BrowserWindow, ipcMain, dialog } = require('electron')
    const log = require('electron-log')
    const { autoUpdater } = require('electron-updater')

    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.fullChangelog = true
    autoUpdater.logger = log
    autoUpdater.logger.transports.file.level = 'info'

    autoUpdater.on('update-available', () => {
        log.info('Update available.')
    })
    autoUpdater.on('update-not-available', () => {
        log.info('Update not available.')
    })
    autoUpdater.on('error', (error) => {
        log.error('Error in auto-updater. ' + error)
    })
    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = 'Download speed: ' + progressObj.bytesPerSecond
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
        log_message = log_message + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
        log.info(log_message)
    })
    autoUpdater.on('update-downloaded', (updateInfo) => {
        log.info('Update downloaded')
        mainWindow.webContents.send('update-downloaded', updateInfo, app.getVersion())
    })

    log.info('App starting...')

    app.on('ready', () => {
        autoUpdater.checkForUpdates()
    })

    if (app.isPackaged) {
        setInterval(() => {
            autoUpdater.checkForUpdates()
        }, 1000 * 60 * 15)
    }

    ipcMain.on('install-update', () => {
        autoUpdater.quitAndInstall(false, true)
    })

    ipcMain.on('window-action', (event, action) => {
        switch (action) {
            case 'minimize':
                event.sender.getOwnerBrowserWindow().minimize()
                break
            case 'maximize':
                if (event.sender.getOwnerBrowserWindow().isMaximized()) {
                    event.sender.getOwnerBrowserWindow().unmaximize()
                }
                else {
                    event.sender.getOwnerBrowserWindow().maximize()
                }
                break
            case 'exit':
                event.sender.getOwnerBrowserWindow().close()
                break
            default:
                break
        }
    })

    async function createMainWindow() {
        let window = new BrowserWindow({
            width: 1280,
            height: 720,
            minWidth: 1280,
            minHeight: 720,
            titleBarStyle: 'hidden',
            show: false,
            webPreferences: {
                contextIsolation: false,
                nodeIntegration: true,
                webviewTag: true
            }
        })

        await new Promise((resolve, reject) => {
            // resolve when when 'did-finish-load' has been fired
            window.webContents.once('did-finish-load', resolve)

            // or reject if it was closed before then
            window.once('closed', () =>
                reject(new Error('Window closed prematurely.')))

            // initiate the loading
            window.loadFile(__dirname + '/src/index.html')

            window.once('ready-to-show', () => { window.show() })
        })

        return window
    }

    // 'ready' will be fired when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    await new Promise(resolve => app.once('ready', resolve))

    // exit when all windows are closed and this promise is resolved
    const terminationPromise = new Promise(resolve =>
        app.once('window-all-closed', resolve))

    // we expect 'rendererReady' notification from Renderer
    const rendererPromise = new Promise(resolve =>
        ipcMain.once('rendererReady', resolve))

    // initiate creating the main window
    const mainWindowPromise = createMainWindow()

    // await both the window to have loaded 
    // and 'rendererReady' notification to have been fired,
    // while observing premature termination
    await Promise.race([
        Promise.all([rendererPromise, mainWindowPromise]),
        terminationPromise.finally(() => {
            throw new Error('All windows closed prematurely.')
        })
    ])

    // keep the mainWindow reference
    const mainWindow = await mainWindowPromise

    // notify the Renderer that Main is ready
    mainWindow.webContents.send('mainReady')

    mainWindow.on('maximize', () => mainWindow.webContents.send('window-action', 'maximize'))

    mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-action', 'unmaximize'))

    mainWindow.on('close', () => app.exit())

    const windows = {}

    ipcMain.on('new-window', (event, type, hash, search) => {
        if (windows[hash] != undefined) {
            windows[hash].focus()
        }
        else if (windows[search + hash] != undefined) {
            windows[search + hash].focus()
        }
        else {
            const options = {
                width: 1280,
                height: 720,
                minWidth: 800,
                minHeight: 600,
                titleBarStyle: 'hidden',
                show: false,
                autoHideMenuBar: true,
                webPreferences: {
                    contextIsolation: false,
                    nodeIntegration: true,
                }
            }
            if (type == 'user' || type == 'institution') {
                options.width = 800
                options.height = 600
            }
            const window = new BrowserWindow(options)

            if (hash != undefined) {
                if (search != undefined) {
                    windows[search + hash] = window
                }
                else {
                    windows[hash] = window
                }
            }

            window.loadFile(__dirname + '/src/' + type + '.html', {
                hash: hash,
                search: search
            })

            window.once('ready-to-show', () => window.show())

            window.on('maximize', () => window.webContents.send('window-action', 'maximize'))

            window.on('unmaximize', () => window.webContents.send('window-action', 'unmaximize'))

            window.on('close', () => {
                if (windows[window.webContents.getURL().split('#')[1]] != undefined) {
                    delete windows[window.webContents.getURL().split('#')[1]]
                }
                else if (window.webContents.getURL().split('?')[1] != undefined) {
                    if (windows[window.webContents.getURL().split('?')[1].split('#')[0] + window.webContents.getURL().split('#')[1]] != undefined) {
                        delete windows[window.webContents.getURL().split('?')[1].split('#')[0] + window.webContents.getURL().split('#')[1]]
                    }
                }
            })
        }
    })

    ipcMain.on('dialog-save', (event, fileName) => {
        dialog.showSaveDialog(event.sender.getOwnerBrowserWindow(), {
            defaultPath: fileName,
            filters: [{ name: 'Excel', extensions: ['xlsx'] }]
        }).then(dialogEvent => {
            if (!dialogEvent.canceled) {
                event.sender.send('file-save', dialogEvent.filePath)
            }
        })
    })

    // awaiting terminationPromise here keeps the mainWindow object alive
    await terminationPromise

    app.exit(0)
}

main().catch(error => {
    console.log(error)
    process.exit(1)
})