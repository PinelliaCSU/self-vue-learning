<template>
  <div class="win-op no-drag">
    <div
        v-if="showSetTop"
        :class="['iconfont icon-top', isTop ? 'win-top' : '']"
        @click="top"
        :title="isTop ? '取消置顶' : '置顶'"
    ></div>
    <div v-if="showMin" class="iconfont icon-min" @click="minimize" title="最小化"></div>
    <div
        v-if="showMax"
        :class="['iconfont', isMax ? 'icon-maximize' : 'icon-max']"
        :title="isMax ? '向下还原' : '最大化'"
        @click="maximize"
    ></div>
    <div v-if="showClose" class="iconfont icon-close" @click="close" title="关闭"></div>
</div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick, onMounted } from "vue"
const { proxy } = getCurrentInstance();

const props = defineProps({
  showSetTop: {
    type: Boolean,
    default: true,
  },
  showMin:{
    type: Boolean,
    default: true,
  },
  showMax:{
    type: Boolean,
    default: true,
  },
  showClose:{
    type: Boolean,
    default: true,
  },
  //关闭类型0：关闭，1：隐藏
  closeType:{
    type: Number,
    default: 1,
  }
})

const emit = defineEmits(['closeCallback'])

const isMax = ref(false)
const isTop = ref(false)
onMounted(() => {
  isMax.value = false
})

const winOp = (action,data)=>{
  window.ipcRenderer.send('winTitleOp', {action,data})
}

const close = () => {
  winOp('close',{closeType:props.closeType})
  emit('closeCallback')
}

const minimize = () => {
  winOp('minimize')
}

const maximize = () => {
  if(isMax.value){
    winOp('unmaximize')
    isMax.value = false
  }else{
    winOp('maximize')
    isMax.value = true
  }
}

const top = () => {
  isTop.value = !isTop.value
  winOp('top',{top:isTop.value})
}

</script>

<style lang="scss" scoped>
.win-op {
  display: flex;
  gap: 2px; /* 减小间距使按钮更紧凑 */
  padding: 4px 8px; /* 减少内边距 */
  align-items: center;
  position: absolute; /* 绝对定位确保在右上角 */
  top: 0; /* 顶部对齐 */
  right: 0; /* 右侧对齐 */
  background: transparent; /* 透明背景融入页面 */
}

.win-op > div {
  width: 28px; /* 减小按钮尺寸 */
  height: 28px;
  border-radius: 4px; /* 保持轻微圆角提升触感 */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px; /* 缩小图标 */
  color: inherit; /* 继承父元素文字颜色 */
  transition: background-color 0.2s ease;
}

/* 更内敛的悬停效果 */
.win-op > div:hover {
  background-color: rgba(0, 0, 0, 0.1); /* 半透明背景更自然 */
}

/* 关闭按钮特殊样式 - 保持功能性但更柔和 */
.win-op > div.icon-close:hover {
  background-color: rgba(255, 59, 48, 0.9);
  color: white;
}

/* 置顶状态样式 - 更微妙的指示 */
.win-op > div.win-top {
  color: #007aff;
  background-color: rgba(0, 122, 255, 0.1);
}
</style>
