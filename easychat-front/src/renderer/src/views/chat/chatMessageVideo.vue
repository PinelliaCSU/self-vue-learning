<template>
  <ShowLocalImage :fileId="data.messageId" partType="chat" :fileType="data.fileType" :showPlay="true"></ShowLocalImage>
</template>

<script setup>
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
