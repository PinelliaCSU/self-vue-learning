<template>
    <div class="send-panel">
        <div class="toolbar">
            <el-popover :visible="showEmojiPopover" trigger="click" placement="top" :teleported="false"
                @show="openPopover" @hide="closePopover" :popper-style="{
                    padding: '0px 10px 10px 10px',
                    width: '490px'
                }">
                <template #default>
                    <el-tabs v-model="activeEmoji" @click.stop>
                        <el-tab-pane :label="emoji.name" :name="emoji.name" v-for="emoji in emojiList">
                            <div class="emoji-list">
                                <div class="emoji-item" v-for="item in emoji.emojiList" @click="sendEmoji(item)">
                                    {{ item }}
                                </div>
                            </div>
                        </el-tab-pane>
                    </el-tabs>
                </template>

                <template #reference>
                    <div class="iconfont icon-emoji" @click="showEmojiPopoverHandler"></div>
                </template>
            </el-popover>
            <el-upload ref="uploadRef" name="file" :show-file-list="false" :multiple="true" :limit="fileLimit"
                :http-request="uploadFile" :on-exceed="uploadExceed">
                <div class="iconfont icon-folder"></div>
            </el-upload>
        </div>
        
        <div class="input-area" @drop="dropHandler" @dragover="dragOverHandler">
            <el-input :rows="5" v-model="msgContent" type="textarea" resize="none" maxlength="500" show-word-limit
                spellcheck="false" input-style="background:#f5f5f5;border:none;" @keydown.enter="sendMessage"
                @paste="pasteFile" />
        </div>
        
        <div class="send-btn-panel">
            <el-popover trigger="click" :visible="showSendMsgPopover" :hide-after="1500" placement="top-end"
                :teleported="false" @show="openPopover" @hide="closePopover" :popper-style="{
                    padding: '5px',
                    'min-width': '0px',
                    width: '120px'
                }">
                <template #default>
                    <span class="empty-msg">不能发送空白信息</span>
                </template>

                <template #reference>
                    <span class="send-btn" @click="sendMessage">发送(S)</span>
                </template>
            </el-popover>
        </div>
        <SearchAdd ref="searchAddRef"></SearchAdd>
    </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick, onMounted, onUnmounted } from "vue"
const { proxy } = getCurrentInstance();
import { getFileType } from "@/utils/Constants";
import emojiList from '../../utils/Emoji';
import SearchAdd from '@/views/contact/SearchAdd.vue';

import {useUserInfoStore} from '@/stores/UserInfoStore'
const userInfoStore = useUserInfoStore();

import { useSysSettingStore } from "@/stores/SysSettingStore";
const sysSettingStore = useSysSettingStore();

const props = defineProps({
    currentChatSession: {
        type: Object,
        default:{}
    }
})


const activeEmoji = ref('笑脸');
const msgContent = ref("");
//暂时空置，消除报错
const openPopover = ()=>{
   document.addEventListener("click",hidePopover,false);
}
const closePopover = ()=>{
   document.removeEventListener("click",hidePopover,false);
}

//不可以超过设置的最大文件上传数量
const uploadExceed = (files)=>{
    checkFileLimit(files);
}
//粘贴文件


const pasteFile = async(event)=>{
   let items = event.clipboardData && event.clipboardData.items;

   const fileData = {}

   for(const item of items){
      if(item.kind != 'file'){
        break
      }
      const file = await item.getAsFile();
      if(file.path != ''){
        uploadFileDo(file);
      }else{
        const imageFile = new File([file],file.name);
        let fileReader = new FileReader();
        fileReader.onloadend = function(){
           const byteArray = new Uint8Array(this.result);
           fileData.byteArray = byteArray;
           fileData.name = imageFile.name;
           window.ipcRenderer.send("saveClipBoardFile",fileData);
        }
        fileReader.readAsArrayBuffer(imageFile);
      }
   } 
}



const showEmojiPopover = ref(false);
const showSendMsgPopover = ref(false);
const hidePopover = ()=>{
    showEmojiPopover.value = false;
    showSendMsgPopover.value = false;
}


const sendMessage = (e)=>{
    if (e.shiftKey && e.key === 'Enter') {
        // 保持原有的换行行为
        return;
    }
    e.preventDefault(); // 阻止默认行为，如表单提交
   const messageContent = msgContent.value ? msgContent.value.replace(/\s*$/g,'') : ''
   if(messageContent == ""){
        showSendMsgPopover.value = true;
        return;
   }
   //这个方法去实现真正的发送消息
   sendMessageDo({
        messageContent,
        messageType:2,
   },true);

}

const emit = defineEmits(["sendMessage4Local"])

const sendMessageDo = async(messageObj = {
    messageContent,
    messageType,
    localFilePath,
    fileSize,
    fileName,
    filePath,
    fileType
},cleanMsgContent)=>{
    // 判断文件大小
    if(!checkFileSize(messageObj.fileType,messageObj.fileSize,messageObj.fileName)){
        return;
    }

    if(messageObj.fileSize === 0){
        proxy.confirm({
           message:`${messageObj.fileName}是一个空文件无法发送，请重新选择`,
           showCancelButton:false,
        })
        return 
    }
    messageObj.sessionId = props.currentChatSession.sessionId;
    messageObj.sendUserId = userInfoStore.getInfo().userId;

    let result = await proxy.Request({
       url:proxy.Api.sendMessage,
       showLoading:false,
       params:{
        messageContent:messageObj.messageContent,
        contactId:props.currentChatSession.contactId,
        messageType:messageObj.messageType,
        fileSize:messageObj.fileSize,
        fileName:messageObj.fileName,
        filePath:messageObj.filePath,
        fileType:messageObj.fileType,
       },
       showError:false,
       errorCallback:(responseData)=>{
        proxy.confirm({
            message:responseData.info,
            onOk:()=>{
              addContact(props.currentChatSession.contactId,responseData.data);
            },
            okText:'重新申请'
         })
       }
    })
    if(!result){
      return;
    }
    if(cleanMsgContent){
        msgContent.value = '';
    }

    Object.assign(messageObj,result.data);
    emit("sendMessage4Local",messageObj)

    //TODO 更新列表
    //保存消息到本地
    window.ipcRenderer.send('addLocalMessage',messageObj);
}

//发送文件相关
const uploadRef = ref();

const uploadFile = (file)=>{
    uploadFileDo(file.file);
    uploadRef.value.clearFiles();
}

const getFileTypeByName = (fileName)=>{
    const fileSuffix = fileName.substr(fileName.lastIndexOf('.') + 1);
    return getFileType(fileSuffix);
} 

const uploadFileDo = (file)=>{
   const fileType = getFileTypeByName(file.name);
   sendMessageDo({
      messageContent:'['+getFileType(fileType)+']',
      messageType:5,
      fileSize:file.size,
      fileName:file.name,
      filePath:file.path,
      fileType:fileType,
   },false)
}


//添加好友
const searchAddRef = ref();
const addContact = (contactId,code)=>{
   searchAddRef.value.show({
    contactId,
    contactType :code == 902 ? 'USER' : 'GROUP',
   })
}

const showEmojiPopoverHandler = () => {
    showEmojiPopover.value = !showEmojiPopover.value;
}

const sendEmoji = (emoji) => {
    msgContent.value = (msgContent.value || '') + emoji;
    showEmojiPopover.value = false;
}
//检验文件大小
const checkFileSize = (fileType,fileSize,fileName)=>{
   const SIZE_MB = 1024 * 1024; // 1MB 的字节数
   const settingArray = Object.values(sysSettingStore.getSetting());
   const fileSizeNumber = settingArray[fileType];
   if(fileSize > fileSizeNumber * SIZE_MB){
      proxy.confirm({
         message:`${fileName}文件过大，超出${fileSizeNumber}MB限制`,
         showCancelButton:false,
      })
      return false;
   }
   return true;
}
//发送文件数量
const fileLimit = 10;
const checkFileLimit = (files)=>{
   if(files.length > fileLimit){
      proxy.confirm({
         message:`一次最多只能上传${fileLimit}个文件`,
         showCancelButton:false,
      })
      return false;
   }
   return true;
}

//拖入文件
const dragOverHandler = (e) => {
    e.preventDefault(); // 阻止默认行为，如表单提交
}
const dropHandler = (event) => {
   event.preventDefault(); // 阻止默认行为，如表单提交
   const files = event.dataTransfer.files;
   if(!checkFileLimit(files)){
      return;
   }
   for (let i = 0; i < files.length; i++) {
      const file = files[i];
      uploadFileDo(file);
   }
}


onMounted(()=>{
   window.ipcRenderer.on("saveClipBoardFileCallback",(e,file)=>{
    const fileType = 0; 
    sendMessageDo({
        messageContent:'['+getFileType(fileType)+']',
        messageType:5,
        fileSize:file.size,
        fileName:file.name,
        filePath:file.path,
        fileType:fileType,
     },false)
    })    
})

onUnmounted(()=>{
   window.ipcRenderer.removeAllListeners("saveClipBoardFileCallback");
})

</script>

<style lang="scss" scoped>
.emoji-list {
    .emoji-item {
        float: left;
        font-size: 23px;
        padding: 2px;
        text-align: center;
        border-radius: 3px;
        margin-left: 10px;
        margin-top: 5px;
        cursor: pointer;
        
        &:hover {
            background: #ddd;
        }
    }
}

.send-panel {
    height: 200px;
    border-top: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    
    .toolbar {
        height: 40px;
        display: flex;
        align-items: center;
        padding-left: 10px;
        flex-shrink: 0;
        
        .iconfont {
            color: #494949;
            font-size: 20px;
            margin-left: 10px;
            cursor: pointer;
        }
        
        :deep(.el-tabs__header) {
            margin-bottom: 0px;
        }
    }
    
    .input-area {
        padding: 0px 10px;
        outline: none;
        width: 100%;
        height: 115px;
        overflow: auto;
        word-wrap: break-word;
        word-break: break-all;
        flex-shrink: 0;
        
        :deep(.el-textarea__inner) {
            box-shadow: none;
        }
        
        :deep(.el-input_count) {
            background: none;
            right: 12px;
        }
    }
}

.send-btn-panel {
    text-align: right;
    padding-top: 5px;
    margin-right: 22px;
    flex-shrink: 0;
    
    .send-btn {
        cursor: pointer;
        color: #07c160;
        background: #e9e9e9;
        border-radius: 5px;
        padding: 8px 25px;
        display: inline-block;
        
        &:hover {
            background: #d2d2d2;
        }
    }
    
    .empty-msg {
        font-size: 13px;
        color: #ff4d4f;
        background: #fff2f0;
        padding: 5px;
        border-radius: 4px;
    }
}
</style>