/* eslint global-require: 0, flowtype-errors/show-errors: 0 */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow } from 'electron'
import MenuBuilder from './menu'
import * as locking from '../app/services/authentication/locking'
import { DATABASE_PATH } from '../app/db/constants'
const { ipcMain } = require('electron')
//import keytar from 'keytar'

var mainWindow = null

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support')
  sourceMapSupport.install()
}

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  require('electron-debug')()
  const path = require('path')
  const p = path.join(__dirname, '..', 'app', 'node_modules')
  require('module').globalPaths.push(p)
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer')
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS
  const extensions = [
    'REACT_DEVELOPER_TOOLS',
    'REDUX_DEVTOOLS'
  ]

  return Promise
    .all(extensions.map(name => installer.default(installer[name], forceDownload)))
    .catch(console.log)
}

const handleCloseWindow = w => e => {
  if (!forceClose) {
    e.preventDefault()

    if (w !== null) {
      w.hide()
    }
  }
}

function createMainWindow() {
  const path = require('path')

  mainWindow = new BrowserWindow({
    show: false,
    width: 790,
    height: 700,
    resizable: process.env.NODE_ENV === 'development' ? true : false,
    titleBarStyle: 'hiddenInset',
    frame: false
  })

  mainWindow.setContentProtection(process.env.NODE_ENV === 'development' ? false : true)

  mainWindow.loadURL(`file://${__dirname}/app.html`)

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined')
    }
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('closed', () => {
    console.log('Main window closed')
    mainWindow = null
  })

  mainWindow.on('close', (event) => {
    console.log('Main window closed')
    event.preventDefault()
    mainWindow.hide()
  })

  mainWindow.on('minimize', function(event){
    event.preventDefault();
    mainWindow.minimize();
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    setImmediate(() => {
      mainWindow.focus()
    })
  })

  return mainWindow
}

/**
 * Add event listeners...
 */
app.on('ready', async () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
    await installExtensions()
  }
  mainWindow = createMainWindow()
  const menuBuilder = new MenuBuilder(mainWindow)
  menuBuilder.buildMenu()
})

app.on('window-all-closed', async () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  console.log('Window All Closed')
  await locking.lock({ password: DATABASE_PATH })
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  console.log('App Quitting')
  mainWindow.removeAllListeners('close')
  mainWindow.close()
})

app.on('activate', () => {
  // On macOS it is common to re-create a window
  // even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow()
  } else {
    mainWindow.show()
  }
})

//app.on('activate', () => { mainWindow.show() })

/*
//TODO: Figure out how to do Production Build with C binding library
//Moved Keytar to Main IPC
ipcMain.on('get-password', (event, serviceName, user) => {
  event.returnValue = keytar.getPassword(serviceName, user);
})

ipcMain.on('set-password', (event, serviceName, user, pass) => {
  event.returnValue = keytar.setPassword(serviceName, user, pass);
})

ipcMain.on('delete-password', (event, serviceName, user) => {
  event.returnValue = keytar.deletePassword(serviceName, user);
})
*/