import {
    run,
    queryAll,
    queryOne,
    queryCount,
    insertOrReplace,
    insertOrIgnore,
    Update,
    insert
}from './ADB.js'

import store from '../store.js'

const saveOrUpdateChatSession4Batch = (chatSessionList)=>{
    return new Promise(async(resolve, reject)=>{
      try {
        for(let i = 0; i< chatSessionList.length; i++){
            const sessionInfo = chatSessionList[i];
            sessionInfo.status = 1;
            let sessionData = await selectUserSessionByContactId(sessionInfo.contactId);
            if(sessionData){
                await updateChatSession(sessionInfo);
            }else{
                await addChatSession(sessionInfo);
            }
        }
        resolve();
      } catch (error) {
        resolve();
      }
    })
}

const selectUserSessionByContactId = (contactId)=>{
    let sql = `select * from chat_session_user where user_id = ? and contact_id = ?`;
    return queryOne(sql, [store.getUserId(),contactId]);
}

const addChatSession = (sessionInfo)=>{
    sessionInfo.userId = store.getUserId();
    insertOrIgnore("chat_session_user", sessionInfo);
}

const updateChatSession = (sessionInfo)=>{
    const paramData = {
        userId: store.getUserId(),
        contactId: sessionInfo.contactId        
    }

    const updateInfo = Object.assign({}, sessionInfo);
    delete updateInfo.userId;
    delete updateInfo.contactId;

    return Update("chat_session_user", updateInfo, paramData);
}

//更新未读数
const updateNoReadCount = (contactId, noReadCount)=>{
    let sql = `update chat_session_user set no_read_count = no_read_count + ? where user_id =? and contact_id =?`;//这种方式比较安全。避免并发问题
    return run(sql, [noReadCount, store.getUserId(), contactId]);
}

const selectUserSessionList = ()=>{
    let sql = `select * from chat_session_user where user_id = ? and status = 1`;
    return queryAll(sql, [store.getUserId()]);
}
//更新数据库
const delChatSession = (contactId)=>{
    const paramData = {
        userId: store.getUserId(),
        contactId: contactId
    }

    const sessionInfo = {
        status: 0,
    }

    return Update("chat_session_user", sessionInfo, paramData);
}

const topChatSession = (contactId,topType)=>{
    const paramData = {
        contactId: contactId,
        userId: store.getUserId(),
    }

    const sessionInfo = {
        topType,
    }
    return Update("chat_session_user", sessionInfo, paramData);
}

const updateSessionInfo4Message = async(currentSessionId,{sessionId,contactName,lastMessage,lastReceiveTime,contactId,memberCount})=>{
    const paramData  = [lastMessage,lastReceiveTime]
    let sql = `update chat_session_user set last_message =?,last_receive_time =?,status = 1`;
    if(contactName){
        sql += `,contact_name =?`;
        paramData.push(contactName);
    }
    if(memberCount != null){
        sql += `,member_count =?`;
        paramData.push(memberCount);
    }
    if(currentSessionId != sessionId){
        sql += `,no_read_count = no_read_count +1`;
    }
    sql += ` where user_id =? and contact_id =?`;
    paramData.push(store.getUserId());
    paramData.push(contactId);
    return run(sql, paramData);
}

const readAll = (contactId)=>{
    let sql = `update chat_session_user set no_read_count = 0 where user_id =? and contact_id =?`;
    return run(sql, [store.getUserId(),contactId]);
}

const saveOrUpdate4Message = (currentSessionId,sessionInfo)=>{
    return new Promise(async(resolve, reject)=>{
        let sessionData = await selectUserSessionByContactId(sessionInfo.contactId);
        if(sessionData){
            updateSessionInfo4Message(currentSessionId,sessionInfo)
        }else{
            sessionInfo.noReadCount = 1;
            await addChatSession(sessionInfo);
        }
    })
}

const updateGroupName = (contactId,groupName)=>{
    const paramData = {
        userId : store.getUserId(),
        contactId : contactId,
    }

    const sessionInfo = {
        contactName : groupName,
    }

    return Update("chat_session_user", sessionInfo, paramData);
}


const updateStatus = (contactId)=>{
    const paramData = {
        userId : store.getUserId(),
        contactId : contactId,
    }

    const sessionInfo = {
        status : 1,
    }

    return Update("chat_session_user", sessionInfo, paramData);
}
export{
    saveOrUpdateChatSession4Batch,
    updateNoReadCount,
    selectUserSessionList,
    selectUserSessionByContactId,
    delChatSession,
    topChatSession,
    updateSessionInfo4Message,
    readAll,
    saveOrUpdate4Message,
    updateGroupName,
    updateStatus
}