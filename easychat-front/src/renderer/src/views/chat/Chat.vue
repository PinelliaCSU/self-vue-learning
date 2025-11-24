<template>
  <Layout>
    <template #left-content>
      <div class="drag-panel drag"></div>
      <div class="top-search">
        <el-input clearable placeholder="搜索" v-model="searchKey" size="small" @keyup="search">
          <template #suffix>
            <span class="iconfont icon-search"></span>
          </template>
        </el-input>
      </div>
      <div class="chat-session-list">
        <template v-for="item in chatSessionList">
          <ChatSession :data="item"  @click="chatSessionClickHandler(item)" @contextmenu.stop="onContextMenu(item, $event)" :currentSession="item.contactId == (currentChatSession.contactId || '')">
          </ChatSession>
        </template>
      </div>
    </template>
    <template #right-content>
      <div class="title-panel drag" v-if="Object.keys(currentChatSession).length > 0">
        <div class="title">
          <span>{{ currentChatSession.contactName }}</span>
          <span v-if="currentChatSession.contactType == 1">
            {{ currentChatSession.memberCount }}
          </span>
        </div>
      </div>
      <div v-if="currentChatSession.contactType == 1" class="iconfont icon-more no-drag" @click="showGroupDetail"></div>
      <div class="chat-panel" v-show="Object.keys(currentChatSession).length > 0">
        <div class="message-panel" id="message-panel">
          <div class="message-item" v-for="(data, index) in messageList" :id="'message' + data.messageId">
            <template v-if="data.messageType == 1 || data.messageType == 2 || data.messageType == 5">
              <chatMessage :data="data" :currentChatSession="currentChatSession" @showMediaDetail="showMediaHandler"></chatMessage>
            </template>
          </div>
        </div>
        <MessageSend :currentChatSession="currentChatSession" @sendMessage4Local="sendMessage4LocalHandler"></MessageSend>
      </div>
      
      <div class="chat-blank" v-show="Object.keys(currentChatSession).length == 0">
        <Blank></Blank>
      </div>
    </template>
  </Layout>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick, onMounted, onUnmounted } from "vue"
import Layout from "../../components/layout.vue";
import MessageSend from "./MessageSend.vue";
const { proxy } = getCurrentInstance();
import ChatSession from "./ChatSession.vue";
import ContextMenu from "@imengyu/vue3-context-menu"
import "@imengyu/vue3-context-menu/lib/vue3-context-menu.css"

import chatMessage from "./chatMessage.vue";
import Blank from "../../components/Blank.vue";


const searchKey = ref();
const search = () => {
  
}

const chatSessionList = ref([]);

const onReceiveMessage = () => {
  window.ipcRenderer.on('receiveMessage', (e, message) => {
    console.log("收到消息：", message)

    if(message.messageType == 6){
      const localMessage = messageList.value.find(item => item.messageId == message.messageId);
      if(localMessage != null){
        localMessage.status = 1;
      }
      return;
    }

    let curSession = chatSessionList.value.find(item => item.sessionId == message.sessionId);
    if (curSession == null) {
      chatSessionList.value.push(message.extendData);
    } else {
      Object.assign(curSession, message.extendData);
    }
    //重新排序
    sortChatSessionList(chatSessionList.value);
    if (message.sessionId != currentChatSession.value.sessionId) {
      //TODO 未读消息气泡
    } else {
      Object.assign(currentChatSession.value, message.extendData);
      messageList.value.push(message);
      gotoBottom()
    }
   
  })
}

const onLoadSessionData = ()=>{
    window.ipcRenderer.on('loadSessionDataCallback', (e, dataList) => {
        // 会话排序
        sortChatSessionList(dataList);
        chatSessionList.value = dataList;
        console.log("会话数据：", dataList)
    })
}

const loadChatSession = () =>{
  window.ipcRenderer.send('loadSessionData')
}

const sortChatSessionList = (dataList)=>{
  dataList.sort((a, b) => {
    const topTypeResult = a.topType - b.topType;
    if (topTypeResult == 0) {
      return b["lastReceiveTime"] - a["lastReceiveTime"];
    } else{
      return topTypeResult;
    }
  })
}
//删除会话
const delChatSessionList = (contactId)=>{
  chatSessionList.value = chatSessionList.value.filter(item => item.contactId != contactId);

}

//定义当前选中的会话
const currentChatSession = ref({});

//定义点击之后获取当前会话的方法
const messageList = ref([]);
const messageCountInfo = {
  totalPage : 0,
  pageNo:0,
  maxMessageId:null,
  noData:false,
}
const chatSessionClickHandler = (item)=>{
  currentChatSession.value = Object.assign({},item);
  //TODO 消息记录数清空
  messageList.value = [];
  //分页加载消息
  messageCountInfo.totalPage = 1;
  messageCountInfo.pageNo = 0;
  messageCountInfo.maxMessageId = null;
  messageCountInfo.noData = false;

  loadChatMesssage();
  //设置选中session
  setSessionSelect({contactId:item.contactId,sessionId:item.sessionId})
}

const setSessionSelect = ({contactId,sessionId})=>{
  window.ipcRenderer.send('setSessionSelect', {contactId,sessionId})
}

const loadChatMesssage = ()=>{
  if(messageCountInfo.noData){
    return;
  }
  //改变分页信息
  messageCountInfo.pageNo++;
  // 加载消息
  window.ipcRenderer.send('loadChatMessage', {
    sessionId:currentChatSession.value.sessionId,
    pageNo:messageCountInfo.pageNo,
    maxMessageId:messageCountInfo.maxMessageId,
  })
}

const onLoadChatMessage = ()=>{
 
  window.ipcRenderer.on('loadChatMessageCallback', (e, {dataList,totalPage,pageNo}) => {
    if(pageNo == totalPage){
      messageCountInfo.noData = true;
    }
    //对消息排序
    dataList.sort((a, b) => {
      return a.messageId - b.messageId;
    })
    messageList.value = dataList.concat(messageList.value);
    messageCountInfo.pageNo = pageNo;
    messageCountInfo.totalPage = totalPage;
    if(pageNo == 1){
      messageCountInfo.maxMessageId =  dataList.length > 0 ? dataList[dataList.length-1].messageId : null;
      //滚动条滚动到最底部
      gotoBottom()
    }
    console.log("消息数据：",messageList.value)
  })
}

const onAddLocalMessage = ()=>{
  window.ipcRenderer.on('addLocalMessageCallback', (e, {messageId,status}) => {
    const findMessage = messageList.value.find(item => item.messageId == messageId);
    if(findMessage != null){
      findMessage.status = status;
    }
  })
}


//发送消息之后的处理
const sendMessage4LocalHandler = (messageObj)=>{
  messageList.value.push(messageObj);
  const chatSession = chatSessionList.value.find(item => item.contactId == messageObj.contactId);//找到当前会话
  if(chatSession){
    chatSession.lastMessage = messageObj.messageContent;
    chatSession.lastReceiveTime = messageObj.sendTime;
  }
  sortChatSessionList(chatSessionList.value);
  gotoBottom()
}

//发送消息滚动到最底部
//当然，里面还是有一些实现细节需要注意，这里简单写
const gotoBottom = ()=>{
  nextTick(()=>{
    const items = document.querySelectorAll(".message-item");
  if(items.length > 0){
    setTimeout(()=>{
      items[items.length-1].scrollIntoView({behavior: "smooth"})
    },100)
  }
  })
}


onMounted(()=>{
    onReceiveMessage();
    onLoadSessionData();
    loadChatSession();
    onLoadChatMessage();
    onAddLocalMessage();
})
onUnmounted(()=>{
    window.ipcRenderer.removeAllListeners('receiveMessage');
    window.ipcRenderer.removeAllListeners('loadSessionDataCallback');
    window.ipcRenderer.removeAllListeners('loadChatMessage');
    window.ipcRenderer.removeAllListeners('addLocalMessage');
})

const setTop = (data)=>{
  data.topType = data.topType == 0 ? 1 : 0;
  // 会话排序
  sortChatSessionList(chatSessionList.value);
  window.ipcRenderer.send('topChatSession', {contactId:data.contactId,topType:data.topType})
}

const delChatSession = (contactId,)=>{
  delChatSessionList(contactId);
  currentChatSession.value = {};
  //TODO 从当前列表中删除会话
  window.ipcRenderer.send('delChatSession', contactId)
}


//右键
const onContextMenu = (data, e) => {
  ContextMenu.showContextMenu({
    x: e.x,
    y: e.y,
    items: [

      {
        label: data.topType == 0 ? "置顶" : "取消置顶",
        onclick: () => {
          setTop(data);
        }
      },
      {
        label: "删除",
        onclick: () => {
          proxy.confirm(
            {
              message: `确认删除该聊天【${data.contactName}吗？】`,
              onOk: () => {
                delChatSession(data.contactId);
              }
            })
        }
      }
    ]
  })
}


const showMediaHandler = (messageId)=>{
  let showFileList = messageList.value.filter(item => item.messageType == 5);

  showFileList = showFileList.map(item => {
    return {
      partType:"chat",
      fileId:item.messageId,
      fileType:item.fileType,
      fileName:item.fileName,
      fileSize:item.fileSize,
      forceGet:false,
    }
  });
  window.ipcRenderer.send('newWindow', {
    windowId:"media",
    title:"图片查看",
    path:"/showMedia",
    data:{
      currentFileId:messageId,
      fileList:showFileList,
    }
  })
}

</script>

<style lang="scss" scoped>
.drag-panel {
    height: 25px;
    background: #f7f7f7;
}

.top-search {
    padding: 0px 10px 9px 10px;
    background: #f7f7f7;
    display: flex;
    align-items: center;
    .iconfont {
        font-size: 12px;
    }
}

.chat-session-list {
    height: calc(100vh - 62px);
    overflow: hidden;
    border-top: 1px solid #ddd;
    &:hover {
        overflow: auto;
    }
}
.search-list {
    height: calc(100vh - 62px);
    background: #f7f7f7;
    overflow: hidden;
    &:hover {
        overflow: auto;
    }
}

.title-panel {
    display: flex;
    align-items: center;
    .title {
        height: 60px;
        line-height: 60px;
        padding-left: 10px;
        font-size: 18px;
        color: #000000;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
.icon-more {
    position: absolute;
    z-index: 1;
    top: 30px;
    right: 3px;
    width: 20px;
    font-size: 20px;
    margin-right: 5px;
    cursor: pointer;
}

.chat-panel {
    border-top: 1px solid #ddd;
    background: #f5f5f5;
    .message-panel {
        padding: 10px 30px 0px 30px;
        height: calc(100vh - 200px - 62px);
        overflow-y: auto;
        .message-item {
            margin-bottom: 15px;
            text-align: center;
        }
    }
}
</style>
