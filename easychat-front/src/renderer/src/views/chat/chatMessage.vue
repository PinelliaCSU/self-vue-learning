<template>
    <div class="message-content-my" v-if="data.sendUserId == userInfoStore.getInfo().userId">
        <div :class="['content-panel', data.messageType == 5 ? 'content-panel-media' : '']">
            <div class="sending" v-if="data.status == 0">
                <el-skeleton :animated="true">
                    <template #template>
                        <el-skeleton-item class="skeleton-item" variant="image" />
                    </template>
                </el-skeleton>
            </div>
            <template v-else>
                <div class="content" v-html="data.messageContent" v-if="data.messageType != 5"></div>
                <div class="content" v-else>
                    <template v-if="data.fileType == 0">
                        <ChatMessageImage :data="data"></ChatMessageImage>
                    </template>
                    <template v-if="data.fileType == 1">
                        <chatMessageVideo :data="data"></chatMessageVideo>
                    </template>
                    <template v-if="data.fileType == 2">
                        <chatMessageFile :data="data"></chatMessageFile>
                    </template>
                </div>
            </template>
        </div>
        <Avatar :width="35" :userId="userInfoStore.getInfo().userId"></Avatar>
    </div>

    <div class="message-content-other" v-else>
        <div class="user-avatar">
            <Avatar :width="35" :userId="data.sendUserId"></Avatar>
        </div>
        <div :class="[
            'content-panel',
            data.contactType == 1 ? 'group-content' : '',
            data.messageType == 5 ? 'content-panel-media' : ''
        ]">
            <div class="nick-name" v-if="data.contactType == 1">
                {{ data.sendUserNickName }}
            </div>
            <div class="sending" v-if="data.status == 0">
                <el-skeleton :animated="true">
                    <template #template>
                        <el-skeleton-item class="skeleton-item" variant="image" />
                    </template>
                </el-skeleton>
            </div>
            <template v-else>
                <div class="content" v-html="data.messageContent" v-if="data.messageType != 5"></div>
                <div class="content" v-else>
                    <template v-if="data.fileType == 0">
                        <ChatMessageImage :data="data"></ChatMessageImage>
                    </template>
                    <template v-if="data.fileType == 1">
                        <chatMessageVideo :data="data"></chatMessageVideo>
                    </template>
                    <template v-if="data.fileType == 2">
                        <chatMessageFile :data="data"></chatMessageFile>
                    </template>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick } from "vue"
const { proxy } = getCurrentInstance();

import  {useUserInfoStore} from "@/stores/UserInfoStore.js"
const userInfoStore = useUserInfoStore();

import ChatMessageImage from "./ChatMessageImage.vue";
import chatMessageVideo from "./chatMessageVideo.vue";
import chatMessageFile from "./chatMessageFile.vue";
const props = defineProps({
    data:{
        type:Object,
        default:{}
    },
    currentChatSession:{
        type:Object,
        default:{}
    }
})

</script>

<style lang="scss" scoped>
/* 发送中状态样式 */
.sending {
    width: 170px;
    height: 170px;
    overflow: hidden;
    float: right;
    margin-right: 5px;
    border-radius: 5px;
}

.sending .skeleton-item {
    width: 170px;
    height: 170px;
}

/* 消息内容通用样式 */
.content {
    display: inline-block;
    padding: 8px;
    color: "#474747";
    border-radius: 5px;
    text-align: left;
    font-size: 14px;
}

.content :deep(.emoji) {
    font-size: 20px;
}

/* 内容面板基础样式 */
.content-panel {
    flex: 1;
    position: relative;
}

.content-panel::after {
    content: '';
    position: absolute;
    display: block;
    width: 10px;
    height: 10px;
    background: #95ec69;
    transform: rotate(45deg);
    border-radius: 2px;
    top: 13px;
}

/* 媒体内容面板样式 */
.content-panel-media .content {
    border-radius: 5px;
    background: none !important;
    overflow: hidden;
    padding: 0px;
}

.content-panel-media::after {
    display: none;
}

/* 自己发送的消息样式 */
.message-content-my {
    display: flex;
}

.message-content-my .content-panel {
    margin-right: 10px;
    text-align: right;
    padding-left: 32%;
}

.message-content-my .content {
    background: #95ec69;
}

.message-content-my .content-panel::after {
    right: -4px;
}

/* 他人发送的消息样式 */
.message-content-other {
    display: flex;
    padding-right: 32%;
}

.message-content-other .user-avatar {
    margin-right: 10px;
    width: 35px;
    height: 35px;
}

.message-content-other .content-panel {
    flex: 1;
    position: relative;
    text-align: left;
}

.message-content-other .nick-name {
    font-size: 12px;
    color: #b2b2b2;
}

.message-content-other .content {
    background: #fff;
}

.message-content-other .sending {
    float: left;
}

.message-content-other .content-panel::after {
    left: -4px;
    background: #fff;
}

/* 媒体内容面板在他人消息中的对齐 */
.message-content-other .content-panel-media {
    justify-content: flex-start;
}

/* 群组消息样式 */
.group-content {
    margin-top: -6px;
}

.group-content .content {
    margin-top: 6px;
}

.group-content .content-panel::after {
    left: -4px;
    top: 35px;
    background: #fff;
}
</style>
