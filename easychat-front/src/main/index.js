import { app, shell, BrowserWindow, ipcMain, Menu ,Tray} from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/favicon.ico?asset'
const NODE_ENV = process.env.NODE_ENV;


import { onLoginOrRegister , onLoginSuccess, winTitleOp ,onSetLocalStore , 
  onGetLocalStore , onLoadSessionData , onDelChatSession , onTopChatSession,
  onLoadChatMessage , onAddLocalMessage ,onSetSessionSelect , onCreateCover,
  onOpenNewWindow , onSaveAs,
  onSaveClipBoardFile ,onLoadContactApply , onUpdateContactNoReadCount,
  onReLogin
} from './ipc';

import { saveWindow } from './windowProxy';

const login_width = 300
const login_height = 370

const register_width = 300
const register_height = 490

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    icon:icon,
    width: login_width,
    height: login_height,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    resizable: false,
    frame:true,
    transparent: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: false,
    }
  })

  saveWindow("main",mainWindow);//对主窗口也进行集中管理

  if(NODE_ENV === 'development'){
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.setTitle("PChat")
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  //托盘操作
  const tray = new Tray(icon);
  const contextMenu = [
    {
      label: '退出EasyChat', click:function(){
        app.exit();
      }
    }
  ]

  const menu  = Menu.buildFromTemplate(contextMenu);
  tray.setToolTip('EasyChat');
  tray.setContextMenu(menu);
  tray.on('click',()=>{
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
  })
  //监听登录注册
  onLoginOrRegister((isLogin)=>{
      console.log("收到渲染进程的信息:",isLogin);
      mainWindow.setResizable(true)
      if(isLogin){
        mainWindow.setSize(login_width,login_height)
      }else{
        mainWindow.setSize(register_width,register_height)
      }//上述操作只是依据是否是登录注册来调整窗口的大小
      mainWindow.setResizable(false)
  })


  //登录成功之后
  onLoginSuccess((config)=>{
      mainWindow.setResizable(true)
      mainWindow.setSize(850,800)
      mainWindow.center()//居中显示
      mainWindow.setMaximizable(true)//使其可以最大化
      mainWindow.setMinimumSize(800,600)//设置最小的窗口大小

      //管理员的操作
      if(config.admin){

      }
      contextMenu.unshift({
        label: "用户" + config.nickName, click:function(){
          
        }
      })
      tray.setContextMenu(Menu.buildFromTemplate(contextMenu));
  })

  winTitleOp((e,{action,data})=>{
    const webContents = e.sender
    const win = BrowserWindow.fromWebContents(webContents)
    switch(action){
      case "close":{
        if(data.closeType == 0){
          win.close();//进程直接退出
        }else{
          win.setSkipTaskbar(true);
          win.hide();//这种情况就是在保持在状态栏
        }
        break;
      }
      case "minimize":{
        win.minimize();
        break;
      }
      case "maximize":{
        win.maximize();
        break;
      }
      case "unmaximize":{
        win.unmaximize();
        break;
      }
      case "top":{
        win.setAlwaysOnTop(data.top);
        break;
      }
    }
  })

  onSetLocalStore();
  onGetLocalStore();
  onLoadSessionData();
  onDelChatSession();
  onTopChatSession();
  onLoadChatMessage();
  onAddLocalMessage();
  onSetSessionSelect();
  onCreateCover();
  onOpenNewWindow();
  onSaveAs();
  onSaveClipBoardFile();
  onLoadContactApply();
  onUpdateContactNoReadCount();
  onReLogin(()=>{
    mainWindow.setResizable(true)
    mainWindow.setMaximumSize(login_width,login_height)
    mainWindow.setSize(login_width,login_height)
    mainWindow.center()//居中显示
    mainWindow.setResizable(false)
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
