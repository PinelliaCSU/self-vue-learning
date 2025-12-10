<template>
  <div class="main">
    <div class="left-slider">
      <div>
        <Avatar :userId="userInfoStore.getInfo().userId" :width="35" :showDetail="false"></Avatar>
      </div>
      <div class="menu-list">
        <template v-for="item in menuList">
          <div :class="['tab-item iconfont' , item.icon ,item.path == currentMenu.path ?'active' : '']" v-if="item.position == 'top'" 
          @click="changeMenu(item)" >
            <template v-if="item.name == 'chat' || item.name == 'contact'">
              <Badge :count="messageCountStore.getCount(item.countKey)" :top="3" :left="15"></Badge>
            </template>
          </div>
        </template>
      </div>
      <div class="menu-list menu-buttom">
        <template v-for="item in menuList">
          <div :class="['tab-item iconfont' , item.icon ,item.path == currentMenu.path ?'active' : '']" v-if="item.position == 'bottom'"
          @click="changeMenu(item)"></div>
        </template>
      </div>
    </div>
    <div class="right-container">
      <router-view v-slot="{Component}">
        <keep-alive include="chat">
          <component :is="Component" ref="componentRef"></component>
        </keep-alive>
      </router-view>

      <!--<keep-alive> 是Vue的内置组件，用于缓存组件实例，避免组件的反复创建和销毁
          include="chat" 属性指定只缓存name为"chat"的组件
          使用keep-alive可以保持组件的状态，提高性能，特别是对于聊天界面这种需要保持状态的场景非常有用 
      -->
    </div>
  </div>
  <WinOp></WinOp> <!--  窗口操作组件 -->
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick, onMounted } from "vue"
const { proxy } = getCurrentInstance();

import {useRouter} from 'vue-router';
import WinOp from "../components/WinOp.vue";
const router = useRouter()

import {useUserInfoStore} from '@/stores/UserInfoStore';
const userInfoStore = useUserInfoStore();//确保状态管理与组件生命周期正确关联

import { useGlobalInfoStore } from "@/stores/GlobalInfoStore";
const globalInfoStore = useGlobalInfoStore();

import { useSysSettingStore } from "@/stores/SysSettingStore";
const sysSettingStore = useSysSettingStore();

import { useMessageCountStore } from '@/stores/MessageCountStore';
import Badge from '@/components/Badge.vue';
const messageCountStore = useMessageCountStore();


const menuList = ref([
  {
    name:'chat',
    icon:'icon-chat',
    path:'/chat',
    countKey:'chatCount',
    position:'top'
  },

  {
    name:'contact',
    icon:'icon-user',
    path:'/contact',
    countKey:'contactApplyCount',
    position:'top'
  },
  {
    name:'mysetting',
    icon:'icon-more2',
    path:'/setting',
    position:'bottom'
  }
])

const currentMenu = ref(menuList.value[0])

const changeMenu = (item) => {
  currentMenu.value = item;
  router.push(item.path)
}

const getLoginInfo = async()=>{
  let result = await proxy.Request({
    url: proxy.Api.getUserInfo,
  })
  if(!result){
    return;
  }
  userInfoStore.setInfo(result.data);
  window.ipcRenderer.send("getLocalStore",result.data.userId + "localServerPort")
}

const getSysSetting = async()=>{
  let result = await proxy.Request({
    url: proxy.Api.getSysSetting,
  })
  if(!result){
    return;
  }
  sysSettingStore.setSetting(result.data);//从服务端取出系统设置并将其设置
}


onMounted(()=>{
  getSysSetting();
  getLoginInfo();
  window.ipcRenderer.on("getLocalStoreCallback",(e,serverPort)=>{
    globalInfoStore.setInfo("localServerPort",serverPort);
  })

  window.ipcRenderer.on("reLogin",(e)=>{
    router.push("/login");
  })
})

</script>

<style lang="scss" scoped>
    .main {
      background: #ddd;
      display: flex;
      border-radius: 0px 3px 3px 0px;
      overflow: hidden;
            
      .left-slider {
        width: 55px;
        background: #2e2e2e;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-top: 35px;
        border: 1px solid #2e2e2e;
        border-right: none;
        padding-bottom: 10px;

        .menu-list {
          width: 100%;
          flex: 1;
                    
          .tab-item {
            color: #d3d3d3;
            font-size: 20px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 10px;
            cursor: pointer;
            font-size: 22px;
            position: relative;
          }          
          .active {
            color: #07c160;
          }
        }
    
                
        .menu-buttom {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
      }
            
      .right-container {
          flex: 1;
          overflow: hidden;
          border: 1px solid #ddd;
          border-left: none;
      }
    }
        
    .popover-user-panel {
        padding: 10px;
            
        .popover-user {
            display: flex;
            border-bottom: 1px solid #ddd;
            padding-bottom: 20px;
        }
            
        .send-message {
            margin-top: 10px;
            text-align: center;
            padding: 20px 0px 0px 0px;
          }
    }    
</style>