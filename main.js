'use strict'

async function main() {
    const { app, BrowserWindow, ipcMain } = require('electron')
    const isDevelopment = require('electron-is-dev')
    const log = require('electron-log')
    const { autoUpdater } = require("electron-updater")

    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.fullChangelog = true
    autoUpdater.logger = log
    autoUpdater.logger.transports.file.level = 'info'
    log.info('App starting...')

    autoUpdater.on('update-available', () => {
        log.info('Update available.')
    })
    autoUpdater.on('update-not-available', () => {
        log.info('Update not available.')
    })
    autoUpdater.on('error', (err) => {
        log.error('Error in auto-updater. ' + err)
    })
    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')'
        log.info(log_message)
    })
    autoUpdater.on('update-downloaded', (updateInfo) => {
        log.info('Update downloaded')
        mainWindow.webContents.send('update-downloaded', updateInfo, app.getVersion())
    })

    app.on('ready', () => {
        autoUpdater.checkForUpdates()
    })

    setInterval(() => {
        autoUpdater.checkForUpdates()
    }, 1000 * 60 * 15)

    ipcMain.on("install-update", () => {
        autoUpdater.quitAndInstall(false, true)
    })

    ipcMain.on("window-action", (event, action) => {
        switch (action) {
            case "minimize":
                event.sender.getOwnerBrowserWindow().minimize()
                break
            case "maximize":
                if (event.sender.getOwnerBrowserWindow().isMaximized()) {
                    event.sender.getOwnerBrowserWindow().unmaximize()
                }
                else {
                    event.sender.getOwnerBrowserWindow().maximize()
                }
                break
            case "exit":
                if (event.sender.getOwnerBrowserWindow() == mainWindow) {
                    app.exit()
                }
                else {
                    event.sender.getOwnerBrowserWindow().close()
                    delete caseWindows[event.sender.getURL().split('#')[1]]
                    delete userWindows[event.sender.getURL().split('#')[1]]
                }
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
            frame: false,
            autoHideMenuBar: true,
            webPreferences: {
                contextIsolation: false,
                nodeIntegration: true,
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
    mainWindow.webContents.send("mainReady")

    if (isDevelopment) {
        mainWindow.webContents.openDevTools()
    }

    mainWindow.on("maximize", () => {
        mainWindow.webContents.send('window-action', 'maximize')
    })

    mainWindow.on("unmaximize", () => {
        mainWindow.webContents.send('window-action', 'unmaximize')
    })

    let caseWindows = {}

    ipcMain.on('case', (event, caseID) => {
        if (caseWindows[caseID] != undefined) {
            caseWindows[caseID].focus()
        }
        else {
            const caseWindow = new BrowserWindow({
                width: 1280,
                height: 720,
                minWidth: 800,
                minHeight: 600,
                frame: false,
                autoHideMenuBar: true,
                webPreferences: {
                    contextIsolation: false,
                    nodeIntegration: true,
                },
            })

            if (caseID != undefined) {
                caseWindows[caseID] = caseWindow
            }

            caseWindow.loadFile(__dirname + '/src/case.html', {
                hash: caseID
            })

            caseWindow.on("maximize", () => {
                caseWindow.webContents.send('window-action', 'maximize')
            })

            caseWindow.on("unmaximize", () => {
                caseWindow.webContents.send('window-action', 'unmaximize')
            })
        }

    })

    let userWindows = {}

    ipcMain.on('user', (event, userUID) => {
        if (userWindows[userUID] != undefined) {
            userWindows[userUID].focus()
        }
        else {
            const userWindow = new BrowserWindow({
                width: 800,
                height: 600,
                minWidth: 800,
                minHeight: 600,
                frame: false,
                autoHideMenuBar: true,
                webPreferences: {
                    contextIsolation: false,
                    nodeIntegration: true,
                },
            })

            if (userUID != undefined) {
                userWindows[userUID] = userWindow
            }

            userWindow.loadFile(__dirname + '/src/user.html', {
                hash: userUID
            })

            userWindow.on("maximize", () => {
                userWindow.webContents.send('window-action', 'maximize')
            })

            userWindow.on("unmaximize", () => {
                userWindow.webContents.send('window-action', 'unmaximize')
            })
        }
    })

    ipcMain.on('user-update', (event, uid, data) => {
        mainWindow.webContents.send('user-update', uid, data)
    })

    ipcMain.on('user-add', (event) => {
        mainWindow.webContents.send('user-add')
    })

    // awaiting terminationPromise here keeps the mainWindow object alive
    await terminationPromise

    app.exit(0)
}

main().catch(error => {
    console.log(error)
    process.exit(1)
})