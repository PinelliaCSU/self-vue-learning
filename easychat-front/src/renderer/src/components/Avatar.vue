<template>
  <div>
    <AvatarBase
    :userId="userId"
    :width="width"
    :borderRadius="borderRadius"
    :showDetail="false"
    v-if="userId == 'Urobot' "
    ></AvatarBase>
    <!-- 是机器人才展示上面，否则的话是一个弹窗 -->
    <el-popover
      v-else
      width="280"
      placement="right-start"
      :show-arrow="false"
      trigger="click"
      transition="none"
      :hide-after="0"
      @show="getUserInfo"
      ref="popoverRef"
    >
        <template #reference>
          <AvatarBase
            :userId="userId"
            :width="width"
            :borderRadius="borderRadius"
            :showDetail="false"
          ></AvatarBase>
        </template>
        <template #default>
            <UserBaseInfo :userInfo="userInfo"></UserBaseInfo>
            <div class="op-btn" v-if="userId !== userInfoStore.getInfo().userId">
                <el-button v-if="userInfo.contactStatus == 1" type="primary" @click="sendMessage">发送消息</el-button>
                <el-button v-else type="primary" @click="addContact">添加联系人</el-button>
            </div>
        </template>
    </el-popover>
  </div>

</template>

<script setup>
import AvatarBase from './AvatarBase.vue';

import { ref, reactive, getCurrentInstance, nextTick } from "vue"
import UserBaseInfo from './UserBaseInfo.vue';
const { proxy } = getCurrentInstance();

import {useUserInfoStore} from '@/stores/UserInfoStore.js';
const userInfoStore = useUserInfoStore();

const props = defineProps({
  userId: {
    type: String,
  },
  width: {
    type: Number,
    default: 40
  },
  borderRadius: {
    type: Number,
    default: 0
  },
  groupId:{
    type: String,
  }
})

const userInfo = ref({})
const getUserInfo = async()=>{
    userInfo.value.userId = props.userId;
    if(userInfoStore.getInfo().userId == props.userId){
        userInfo.value = userInfoStore.getInfo();
        return;
    }else{
        let result = await proxy.Request({
            url: proxy.Api.getContactInfo,
            params: {
                contactId: props.userId,
            },
            showLoading: false,
        })
        if(!result){
            return;
        }
        userInfo.value = Object.assign({},result.data);
    }
}

const sendMessage = ()=>{
    //TODO 发送消息
}
const addContact  =()=>{
    //TODO 添加联系人
}

</script>

<style lang="scss" scoped>
.op-btn{
    text-align: center;
    border-top: 1px solid #eaeaea;
    padding-top: 10px;
}
</style>
