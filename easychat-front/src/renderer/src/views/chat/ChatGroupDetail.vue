<template>
    <div class="group-panel">
        <el-drawer v-model="showDrawer" modal-class="mask-style" :size="300" ref="drawerRef">
            <div class="group-panel-body">
                <div class="member-list">
                    <div class="member-item" v-for="item in memberList">
                        <Avatar :userId="item.userId" :width="30" @closeDrawer="closeDrawerHandler"></Avatar>
                        <div class="nick-name" :title="item.contactName">{{ item.contactName }}</div>
                        <div class="owner-tag" v-if="item.userId == groupInfo.groupOwnerId">群主</div>
                    </div>
                    <template v-if="userInfoStore.getInfo().userId == groupInfo.groupOwnerId">
                        <div class="member-item" @click="addUser">
                            <div class="iconfont icon-add icon-op"></div>
                            <div class="nick-name">添加</div>
                        </div>
                        <div class="member-item" @click="removeUser">
                            <div class="iconfont icon-min icon-op"></div>
                            <div class="nick-name">移除</div>
                        </div>
                    </template>
                </div>
            </div>
            <div class="line"></div>
            <div class="part-content">
                <AvatarBase :userId="groupInfo.groupId" :width="60" :borderRadius="5" :showDetail="true" />
                <div class="part-title">群号</div>
                <div class="part-content">{{ groupInfo.groupId }}</div>
                <div class="part-title">群聊名称</div>
                <div class="part-content">{{ groupInfo.groupId }}</div>
                <div class="part-title">群公告</div>
                <div class="part-content">{{ groupInfo.groupNotice || '-' }}</div>
                <div class="line"></div>
                <a href="javascript:void(0)" class="leave-btn" @click="dissolutionGroup"
                    v-if="userInfoStore.getInfo().userId == groupInfo.groupOwnerId">解散群聊</a>
                <a href="javascript:void(0)" class="leave-btn" @click="leaveGroup" v-else>退出群聊</a>
            </div>
        </el-drawer>
        <UserSelect ref="userSelectRef" @callback="addOrRemoveUserCallback"></UserSelect>
    </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick } from "vue"
const { proxy } = getCurrentInstance();

import UserSelect from "./UserSelect.vue";
import Avatar from "@/components/Avatar.vue";
import AvatarBase from "@/components/AvatarBase.vue";


const showDrawer = ref(false);
const memberList = ref([]);
const groupInfo = ref({});

const show = async (groupId) => {
    let result = await proxy.Request({
        url: proxy.Api.getGroupInfo4Chat,
        params: { groupId },
        showError:false,
        errorCallback: (response) => {
            proxy.confrim({
                message: response.info,
                showCancelButton: false,
            })
        }
    })
    if (!result) {
        return;
    }
    showDrawer.value = true;
    memberList.value = result.data.userContactList;
    groupInfo.value = result.data.groupInfo;
}

defineExpose(
    {
        show,
    }
)
const drawerRef = ref();
const closeDrawerHandler = () => {
    drawerRef.value.close();
}


const userSelectRef = ref();
const addUser = async() => {
    let result = await proxy.Request({
        url: proxy.Api.loadContact,
        params: { 
            contactType : 'USER'
        },
    })
    if (!result) {
        return;
    }
    const contactIds = memberList.value.map((item) => item['userId']);
    let contactList = result.data
    contactList.forEach((element)=>{
        if(contactIds.includes(element.contactId)){
            element.disabled = true;
        }
    });

    userSelectRef.value.show({
        contactList,
        groupId: groupInfo.value.groupId,
        onType: 1,
    })
}


const removeUser = async() => {
    let contactList = memberList.value.map((item) => item);
    contactList.forEach((element)=>{
        element.contactId = element.userId;
    })
    contactList.splice(0,1)
    userSelectRef.value.show({
        contactList,
        groupId: groupInfo.value.groupId,
        onType: 0,
    })

}

const addOrRemoveUserCallback = ()=>{
    showDrawer.value = false;
}

</script>

<style lang="scss" scoped>
group-panel {
    color: #000000;

    :deep(.mask-style) {
        top: 1px;
        right: 1px;
        height: calc(100vh - 2px);
    }

    :deep(.el-drawer) {
        -webkit-app-region: no-drag;
    }

    :deep(.el-drawer__header) {
        margin-bottom: 10px;
    }

    :deep(.el-drawer__body) {
        padding: 10px;
    }
}

group-panel-body {
    .member-list {
        display: flex;
        flex-wrap: wrap;

        .member-item {
            width: 20%;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 5px;
            padding: 5px;
            position: relative;

            .owner-tag {
                position: absolute;
                left: 0px;
                top: 0px;
                font-size: 12px;
                background: #07c160;
                color: #fff;
                border-radius: 3px;
            }

            .nick-name {
                margin-top: 3px;
                width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 13px;
                text-align: center;
            }
        }
    }
}

.icon-op {
    cursor: pointer;
    width: 30px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #dbdbdb;
    color: #6e6e6e;
}

.line {
    margin-bottom: 10px;
    border-top: 1px solid #ddd;
    height: 1px;
}

.part-title {
    margin-top: 10px;
}

.part-content {
    color: #757575;
    margin-bottom: 10px;
}

.leave-btn {
    color: #f45454;
    text-decoration: none;
    text-align: center;
    display: block;
    margin-top: 10px;
}
</style>
