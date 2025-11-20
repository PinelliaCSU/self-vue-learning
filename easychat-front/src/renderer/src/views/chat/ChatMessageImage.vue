<template>
  <ShowLocalImage :fileId="data.messageId" partType="chat" :fileType="data.fileType"></ShowLocalImage>
</template>

<script setup>
//图片点击之后需要展示一个框。因此需要继续封装
import ShowLocalImage from "../../components/ShowLocalImage.vue";

import { ref, reactive, getCurrentInstance, nextTick } from "vue"
const { proxy } = getCurrentInstance();

const props = defineProps({
  data:{
    type:Object,
    default:{}
  }
})

</script>

<style lang="scss" scoped>
</style>
