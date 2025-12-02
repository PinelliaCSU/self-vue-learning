<template>
    <chatMessageTime :data="data"></chatMessageTime>
    <div class="sys-message">
        {{ dataMessage.messageContent }}
    </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick, computed } from "vue"
const { proxy } = getCurrentInstance();
import chatMessageTime from "./ChatMessageTime.vue";


const props = defineProps({
    data: {
        type: Object,
        default: {}
    },
})

const dataMessage = computed(() => {
    const data = { ...props.data }
    if (data.MessageType == 1) {
        data.messageContent = '已经添加好友，以下是打招呼的内容'
    }
    return data
})

</script>

<style lang="scss" scoped>
.sys-message {
    text-align: center;
    font-size: 12px;
    color: #999999;
    margin-bottom: 20px;
}
</style>
