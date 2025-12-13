<template>
    <ContentPanel>
        <div class="user-info">
            <UserBaseInfo :userInfo="userInfo"></UserBaseInfo>
            <div class="more-op">
                <el-dropdown placement="bottom-end" trigger="click">
                    <span class="el-dropdown-link">
                        <div class="iconfont icon-more"></div>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item @click="addContact2BlackList">加入黑名单</el-dropdown-item>
                            <el-dropdown-item @click="delContact">删除联系人</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            </div>
            <div class="part-item">
                <div class="part-title">个性签名</div>
                <div class="part-content">{{ userInfo.personalSignature || '-' }}</div>
            </div>
            <div class="send-message" @click="sendMessage">
                <div class="iconfont icon-chat2"></div>
                <div class="text">发消息</div>
            </div>
        </div>
    </ContentPanel>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick, watch } from "vue"
const { proxy } = getCurrentInstance();//proxy 是组件实例的代理对象，通过它可以访问组件实例的所有属性和方法

import UserBaseInfo from '../../components/UserBaseInfo.vue';

const userInfo = ref({});

import {useRoute,useRouter} from 'vue-router';
const route = useRoute();
const router = useRouter();

const contactId = route.query.contactId;
import {useContactStateStore} from '@/stores/ContactStateStore';
const contactStateStore = useContactStateStore();

const loadUserDetail = async(contactId)=>{
  let result = await proxy.Request({
    url: proxy.Api.getContactUserInfo,
    params:{
        contactId:contactId
    } 
  })
  if(!result){
    return;
  }
  userInfo.value = result.data;
}

//加入黑名单
const addContact2BlackList = ()=>{
    proxy.confirm({
        message : '确定将该联系人加入黑名单吗？',
        okfun:  async()=>{
        let result = await proxy.Request({
            url:proxy.Api.addContact2BlackList,
            params:{
                contactId:contactId
            }
        })
        if(!result){
            return;
        }
        delContactData()
    }
    })
}

//删除用户
const delContact = ()=>{
   proxy.confirm({
        message : '确定将该联系人删除吗？',
        okfun:  async()=>{
        let result = await proxy.Request({
            url:proxy.Api.delContact,
            params:{
                contactId:contactId
            }
        })
        if(!result){
            return;
        }
        delContactData()
    }
    })
}

const delContactData = () =>{
    contactStateStore.setContactReload('REMOVE_USER')
}
const sendMessage = ()=>{
    router.push({
      path: "/chat",
      query: {
        chatId: userInfo.value.userId,
        timestamp: new Date().getTime(),
      }
    })
}

watch(
    ()=> route.query.contactId,
    (newVal,oldVal)=>{
        if(newVal){
            loadUserDetail(newVal);
        }
    },
    {immediate:true,deep:true}
)

</script>

<style lang="scss" scoped>
        .user-info {
            position: relative;
        }
    
        .user-info .more-op {
            position: absolute;
            right: 0px;
            top: 20px;
        }
    
        .user-info .more-op .icon-more {
            color: #9e9e9e;
        }
    
        .user-info .more-op .icon-more:hover {
            background: #dddddd;
        }
    
        .part-item {
            display: flex;
            border-bottom: 1px solid #eaeaea;
            padding: 20px 0px;
        }
    
        .part-item .part-title {
            width: 60px;
            color: #9e9e9e;
        }
    
        .part-item .part-content {
            flex: 1;
            margin-left: 15px;
            color: #161616;
        }
    
        .send-message {
            width: 80px;
            margin: 0px auto;
            text-align: center;
            margin-top: 20px;
            color: #7d8cac;
            padding: 5px;
        }
    
        .send-message .icon-chat2 {
            font-size: 23px;
        }
    
        .send-message .text {
            font-size: 12px;
            margin-top: 5px;
        }
    
        .send-message:hover {
            background: #e9e9e9;
            cursor: pointer;
        }
</style>
