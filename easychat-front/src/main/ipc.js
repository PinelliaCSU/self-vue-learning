import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/favicon.ico?asset'
const NOODE_ENV = process.env.NODE_ENV;
import store from './store';

import {initWs , closeWs} from './wsClient'
import {addUserSetting , selectSettingInfo, updateContactNoReadCount} from './db/UserSettingModel'
import { selectUserSessionList, delChatSession ,topChatSession, updateSessionInfo4Message ,readAll} from './db/ChatSessionUserModel';
import { saveMessage, selectMessageList , updateMessage } from './db/ChatMessageModel';
import { saveFile2Local , createCover , saveAs , saveClipBoardFile , closeLocalServer} from './db/file';
import { saveWindow,getWindow,delWindow } from './windowProxy';


const onLoginOrRegister = (callback)=>{
    ipcMain.on('loginOrRegister', (e,isLogin) => {
        console.log("收到登录或者注册的信息:",isLogin);
        callback(isLogin)//相当于在函数中调用另一个函数
    })
}

const onLoginSuccess = (callback)=>{
    ipcMain.on('openChat', (e,config) => {
        console.log("收到登录成功的信息:",config);
        store.initUserId(config.userId)
        store.setUserData("token",config.token)
        // 增加用户配置
        addUserSetting(config.userId,config.email)
        callback(config)//相当于在函数中调用另一个函数
        // 初始化ws连接
        initWs(config,e.sender)
    })
}

const winTitleOp = (callback)=>{
    ipcMain.on('winTitleOp', (e,data) => {
        console.log("收到窗口操作的信息:",data);
        callback(e,data)//相当于在函数中调用另一个函数
    })
}

//通过渲染进程传递到主进程
const onSetLocalStore = ()=>{
    ipcMain.on('setLocalStore', (e,{key,value}) => {
       store.setData(key,value)//储存起来
    })
}

const onGetLocalStore = ()=>{
    ipcMain.on('getLocalStore', (e,key) => {
        console.log("主进程收到了渲染进程的获取事件key: ",key)
        e.sender.send("getLocalStoreCallback",store.getData(key))
    })
}

const onLoadSessionData = ()=>{
    ipcMain.on('loadSessionData', async(e) => {
        const dataList = await selectUserSessionList();
        e.sender.send("loadSessionDataCallback",dataList)
    })
}

const onDelChatSession = ()=>{
    ipcMain.on('delChatSession', (e,contactId) => {
        delChatSession(contactId)
    })
}

const onTopChatSession = ()=>{
    ipcMain.on('topChatSession', (e,{contactId,topType}) => {
        topChatSession(contactId,topType)
    })
}

const onLoadChatMessage = ()=>{
   ipcMain.on('loadChatMessage', async(e,data) => {
        const result = await selectMessageList(data);
        e.sender.send("loadChatMessageCallback",result)
    })
}

const onSetSessionSelect = ()=>{
    ipcMain.on('setSessionSelect', async(e,{contactId,sessionId}) => {
        if(sessionId){
            store.setUserData("currentSessionId",sessionId)
            readAll(contactId);
        }else{
            store.deleteUserData("currentSessionId")
        }
    })
}


const onAddLocalMessage = ()=>{
   ipcMain.on('addLocalMessage', async(e,data) => {
        await saveMessage(data)
        //保存文件
        if(data.messageType == 5){
            await saveFile2Local(data.messageId,data.filePath,data.fileType)

            const updateInfo = {
                status:1,
            }
            await updateMessage(updateInfo,{messageId:data.messageId})
        }
        //更新session
        data.lastReceiveTime = data.sendTime;
        //TODO 更新会话
        updateSessionInfo4Message(store.getUserData("currentSessionId"),data);
        e.sender.send("addLocalMessageCallback",{status:1 , messageId:data.messageId})
    })
}

const onCreateCover = ()=>{
    ipcMain.on('createCover', async(e, localFilePath) => {
       try {
           console.log("收到创建封面请求，文件路径:", localFilePath);
           
           const { avatarStream, coverStream } = await createCover(localFilePath);
           console.log("avatarStream 大小:", avatarStream ? avatarStream.length : 0);
           console.log("coverStream 大小:", coverStream ? coverStream.length : 0);
           
           // 检查数据是否有效
           if (!avatarStream || !coverStream) {
               throw new Error("生成的图像数据为空");
           }
           
           // 直接发送包含两个 Buffer 的对象
           e.sender.send("createCoverCallback", {
               avatarStream: avatarStream,
               coverStream: coverStream
           });
       } catch (error) {
           console.error("创建封面出错:", error);
           // 发送错误信息
           e.sender.send("createCoverCallback", {
               avatarStream: null,
               coverStream: null,
               error: error.message
           });
       }
    });
};
const onOpenNewWindow = ()=>{
    ipcMain.on('newWindow', async(e,config) => {
       openWindow(config);
    })
}

const openWindow = (config) => {
   const { windowId, title = "EasyChat", path, width = 960, height = 720, data } = config;//参数传递按这样写
   
   const localServerPort = store.getUserData("localServerPort");
   data.localServerPort = localServerPort;

   let newWindow = getWindow(windowId);
   if(!newWindow){
        newWindow = new BrowserWindow({
          icon:icon,
          width: width,
          height: height,
          fullscreenable:false,
          fullscreen:false,
          maximizable:false,
          autoHideMenuBar: true,
          titleBarStyle: 'hidden',
          resizable: false,
          frame:true,
          transparent: true,
          hasShadow:false,
          webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: false,
          }
        })
        saveWindow(windowId,newWindow);
        newWindow.setMinimumSize(600,484);
        if(is.dev && process.env['ELECTRON_RENDERER_URL']) {
           newWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html#${path}`)
        }else{
           newWindow.loadFile(join(__dirname, `../renderer/index.html`),{hash:`${path}`})
        }
        if(NOODE_ENV === 'development'){
            newWindow.webContents.openDevTools();
        }
        newWindow.on('ready-to-show', () => {
            newWindow.setTitle(title)
            newWindow.show()
        })
        newWindow.once('show', () => {
            setTimeout(() => {
                newWindow.webContents.send("pageInitData",data);
            }, 500);
        })
        newWindow.on('closed', () => {
            delWindow(windowId);
        })
   }else{
        newWindow.show();
        newWindow.setSkipTaskbar(false);
        newWindow.webContents.send("pageInitData",data);
   }
}

const onSaveAs = ()=>{
   ipcMain.on('saveAs', async(e,data) => {
      saveAs(data)
    })
}

const onSaveClipBoardFile = ()=>{
   ipcMain.on('saveClipBoardFile', async(e,data) => {
      const result = await saveClipBoardFile(data)
      e.sender.send("saveClipBoardFileCallback",result)
    })
}

const onLoadContactApply = ()=>{
   ipcMain.on('loadContactApply', async(e) => {
        const userId = store.getUserId();
        let result = await selectSettingInfo(userId);
        let contactNoRead = 0;
        if(result != null){
           contactNoRead = result.contactNoRead;
        }
        e.sender.send("loadContactApplyCallback",contactNoRead)
    })
}

const onUpdateContactNoReadCount = ()=>{
    ipcMain.on('updateContactNoReadCount', async(e) => {
       updateContactNoReadCount({userId : store.getUserId()})
    })
}

const onReLogin = (callback)=>{
    ipcMain.on('reLogin', async(e) => {
        callback();
        e.sender.send("reLogin")
        closeWs();
        closeLocalServer();
    })
}

export {
    onLoginOrRegister,
    onLoginSuccess,
    winTitleOp,
    onSetLocalStore,
    onGetLocalStore,
    onLoadSessionData,
    onDelChatSession,
    onTopChatSession,
    onLoadChatMessage,
    onAddLocalMessage,
    onSetSessionSelect,
    onCreateCover,
    onOpenNewWindow,
    onSaveAs,
    onSaveClipBoardFile,
    onLoadContactApply,
    onUpdateContactNoReadCount,
    onReLogin
}