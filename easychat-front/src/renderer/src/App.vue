<template>
  <el-config-provider :locale="locale" :message="config">
    <router-view />
  </el-config-provider>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick } from "vue"
const { proxy } = getCurrentInstance();

import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import router from "./router";

const locale = zhCn;
const config = reactive({
  max: 1  //设置消息提示的最大显示数量为 1（即同一时间最多显示一个消息提示）
})
</script>
<style lang="less"></style>