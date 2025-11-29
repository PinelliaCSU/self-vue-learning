import WebSocket from "ws"
const NODE_ENV = process.env.NODE_ENV;

import store from './store';
import { saveOrUpdateChatSession4Batch ,saveOrUpdate4Message ,selectUserSessionByContactId} from "./db/ChatSessionUserModel";
import { saveMessageBatch, updateMessage } from "./db/ChatMessageModel";
import { updateContactNoReadCount } from "./db/UserSettingModel";

let ws = null;
let maxReconnectTimes = null; //最大重连次数

let wsUrl = null
let sender = null
let needReconnect = null//是否需要重连

let lockReconnect = false;

const initWs = (config,_sender) =>{
    const baseUrl = NODE_ENV !== 'development' 
        ? store.getData("prodMsDomain")  
        : store.getData("devMsDomain");
    
    wsUrl = `${baseUrl}?token=${(config.token)}`;
    sender = _sender;
    needReconnect = true;
    maxReconnectTimes = 5;
    createWs();
}

const closeWs = ()=>{
    needReconnect = false
    ws.close();
}

const createWs = ()=>{
    if(wsUrl == null){
        return;
    }
    ws = new WebSocket(wsUrl);
    ws.onopen = function(){
        console.log("客户端连接成功")
        ws.send("heart beat")
        maxReconnectTimes = 10;
    }

    //从服务器收到消息之后的回调函数
    ws.onmessage = async function(e){
        console.log("收到了服务端的消息",e.data)
        const message = JSON.parse(e.data);
        const messageType = message.messageType;
        switch(messageType){
            case 0: //ws连接成功
                //保存会话信息
                await saveOrUpdateChatSession4Batch(message.extendData.chatSessionList);
                //保存消息
                await saveMessageBatch(message.extendData.chatMessageList);
                //更新联系人申请数量
                await updateContactNoReadCount({userId: store.getUserId(), noReadCount: message.extendData.applyCount});
                sender.send("receiveMessage", {messageType :message.messageType});
                break;
            case 6://文件上传完成
                updateMessage({status:message.status},{messageId:message.messageId})
                sender.send("receiveMessage", message);
                break;
            case 2: //聊天消息
            case 5: //图片，视频消息
                if(message.sendUserId == store.getUserId()){ // 先把后面的&& message.contactType == 1去掉，疑似造成生成与自己的会话列表
                    break;
                }//如果是自己发的消息
                const sessionInfo = {}
                if(message.extendData && typeof message.extendData == "object"){
                    Object.assign(sessionInfo,message.extendData)
                }else{
                    Object.assign(sessionInfo,message)
                    if(message.contactType == 0 && messageType != 1){
                        sessionInfo.contactName = message.sendUserNickName;
                    }
                    sessionInfo.lastReceiveMessage = message.sendTime;
                }

                await saveOrUpdate4Message(store.getUserData("currentSessionId"),sessionInfo);
                //写入本地消息
                await saveMessage(message);
                const dbSessionInfo = await selectUserSessionByContactId(message.contactId);
                message.extendData = dbSessionInfo;
                sender.send("receiveMessage", message);
                break;
        }
    }
    //连接关闭的回调函数
    ws.onclose = function(){
        console.log("关闭客户端连接重连")
        reconnect();
    }

    ws.onerror = function(){
        console.log("客户端连接失败,准备重连")
        reconnect();
    }

    const reconnect = ()=>{
       if(!needReconnect){
            console.log("连接断开,不需要重连")
            return;
       }
       if(ws != null){
            ws.close();
       }
       if(lockReconnect){
            return;
       }
       lockReconnect = true;
       if(maxReconnectTimes > 0){
        console.log("准备重连,剩余重连次数",maxReconnectTimes,new Date().getTime())
        maxReconnectTimes--;
            setTimeout(()=>{
                createWs();
                lockReconnect = false;
            },5000)
       }else{
            console.log("连接超时！")
       }
    }

    setInterval(()=>{
        if( ws != null && ws.readyState == 1){//如果是连接状态
            console.log("发送心跳")
            ws.send("heart beat")//发送心跳
        }
    },5000)
}

export{
    initWs,
    closeWs
}