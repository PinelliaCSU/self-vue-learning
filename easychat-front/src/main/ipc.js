import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/favicon.ico?asset'
const NOODE_ENV = process.env.NODE_ENV;
import store from './store';

import {initWs} from './wsClient'
import  {addUserSetting} from './db/UserSettingModel'
import { selectUserSessionList, delChatSession ,topChatSession, updateSessionInfo4Message ,readAll} from './db/ChatSessionUserModel';
import { saveMessage, selectMessageList , updateMessage } from './db/ChatMessageModel';
import { saveFile2Local , createCover } from './db/file';


const onLoginOrRegister = (callback)=>{
    ipcMain.on('loginOrRegister', (e,isLogin) => {
        callback(isLogin)//相当于在函数中调用另一个函数
    })
}

const onLoginSuccess = (callback)=>{
    ipcMain.on('openChat', (e,config) => {
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
    ipcMain.on('createCover', async(e,localFilePath) => {
       const stream = await createCover(localFilePath);
       e.sender.send("createCoverCallback",stream)
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
    onCreateCover
}