<template>
  <WinOp :showSetTop="false" :show-min="false" :showMax="false" :closeType="0"></WinOp>
  <div class="login-panel">
    <div class="title drag">EasyChat</div>
    <div v-if="showLoading" class="loading-panel">
      <img src="../assets/img/loading.gif"></img>
    </div>
    <div class="login-form" v-else>
      <div class="error-msg">{{ errorMsg }}</div>

      <el-form :model="formData" :rules="rules" ref="formDataRef" label-width="0px" @submit.prevent>

        <el-form-item prop="email">
          <el-input size="large" clearable placeholder="请输入邮箱" maxLength="30" v-model.trim="formData.email"
            @focus="clearVerify">
            <template #prefix>
              <span class="iconfont icon-email"></span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="nickName" v-if="!isLogin">
          <el-input size="large" clearable placeholder="请输入昵称" maxLength="15" v-model.trim="formData.nickName"
            @focus="clearVerify">
            <template #prefix>
              <span class="iconfont icon-user-nick"></span>
            </template>
          </el-input>
        </el-form-item>


        <el-form-item prop="password">
          <el-input size="large" show-password clearable placeholder="请输入密码" v-model.trim="formData.password"
            @focus="clearVerify">
            <template #prefix>
              <span class="iconfont icon-password"></span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="rePassword" v-if="!isLogin">
          <el-input size="large" show-password clearable placeholder="请再次输入密码" v-model.trim="formData.rePassword"
            @focus="clearVerify">
            <template #prefix>
              <span class="iconfont icon-password"></span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="checkCode">
          <div class="check-code-panel">
            <el-input size="large" clearable placeholder="请输入验证码" v-model.trim="formData.checkCode"
              @focus="clearVerify">
              <template #prefix>
                <span class="iconfont icon-checkcode"></span>
              </template>
            </el-input>
            <img :src="checkCodeUrl" class="check-code" @click="changeCheckCode"></img>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" class="login-btn" @click="submit">{{ isLogin ? '登录' : '注册' }}</el-button>
        </el-form-item>

        <div class="bottom-link">
          <span class="a-link" @click="changeOpType">{{ isLogin ? '没有账号?' : '已有账号?' }}</span>
        </div>

      </el-form>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, nextTick, onMounted } from "vue"
const { proxy } = getCurrentInstance();

import md5 from 'js-md5'
import { useUserInfoStore } from '@/stores/UserInfoStore';
import { useRouter } from 'vue-router';
import WinOp from "../components/WinOp.vue";



const router = useRouter()
const userInfoStore = useUserInfoStore()

const formData = ref({});
const formDataRef = ref();
const rules = {

};

const isLogin = ref(true)

const changeOpType = () => {
  window.ipcRenderer.send('loginOrRegister', !isLogin.value);
  isLogin.value = !isLogin.value;
  nextTick(() => {
    formDataRef.value.resetFields()
    formData.value = {}
    clearVerify()
    changeCheckCode()
  })
}
//获取验证码

const checkCodeUrl = ref(null);

const showLoading = ref(false) //全局的一个showloading

const changeCheckCode = async () => {
  let result = await proxy.Request({
    url: proxy.Api.checkCode,
  })
  if (!result) {
    return;
  }
  checkCodeUrl.value = result.data.checkCode
  localStorage.setItem("checkCodeKey", result.data.checkCodeKey);
}

changeCheckCode();

const errorMsg = ref(null)

const submit = async () => {
  clearVerify()

  if (!checkValue('checkEmail', formData.value.email, '请输入正确的邮箱')) {
    return
  }
  if (!isLogin.value && !checkValue(null, formData.value.nickName, '请输入昵称')) {
    return
  }

  if (!checkValue('checkPassword', formData.value.password, '密码只能是数字，字母，特殊字符8-18位')) {
    return
  }

  if (!isLogin.value && formData.value.rePassword != formData.value.password) {
    errorMsg.value = '两次输入的密码不一致！'
    return
  }

  if (!checkValue(null, formData.value.checkCode, '请输入验证码')) {
    return
  }

  if (isLogin.value) {
    showLoading.value = true
  }

  let result = await proxy.Request({
    url: isLogin.value ? proxy.Api.login : proxy.Api.register,
    showLoading: isLogin.value ? false : true,
    showError: false,
    params: {
      email: formData.value.email,
      password: isLogin.value ? md5(formData.value.password) : formData.value.password,
      checkCode: formData.value.checkCode,
      nickName: formData.value.nickName,
      checkCodeKey: localStorage.getItem('checkCodeKey')
    },
    errorCallback: (response) => {
      showLoading.value = false
      changeCheckCode()
      errorMsg.value = response.info
    }
  })
  if (!result) {
    return;
  }

  if (isLogin.value) {
    userInfoStore.setInfo(result.data)
    localStorage.setItem('token', result.data.token)
   
    router.push('/main') //页面跳转

    const screenWidth = window.screen.width
    const screenHeight = window.screen.height

    window.ipcRenderer.send('openChat', {
      email: formData.value.email,
      token: result.data.token,
      userId: result.data.userId,
      nickName: result.data.nickName,
      admin: result.data.admin,
      screenHeight: screenHeight,
      screenWidth: screenWidth
    })

    window.ipcRenderer.send('setLocalStore', { key: "devMsDomain", value: proxy.Api.devMsDomain })
    window.ipcRenderer.send('getLocalStore', "devMsDomain")
  } else {
    proxy.Message.success('注册成功')
    changeOpType()
  }

}

const init = () => {
  //在初始化的时候传递给主进程
  window.ipcRenderer.send("setLocalStore", { key: 'prodDomain', value: proxy.Api.prodDomain })
  window.ipcRenderer.send("setLocalStore", { key: 'devDomain', value: proxy.Api.devDomain })
  window.ipcRenderer.send("setLocalStore", { key: 'devMsDomain', value: proxy.Api.devMsDomain })
  window.ipcRenderer.send("setLocalStore", { key: 'prodMsDomain', value: proxy.Api.prodMsDomain })
}

onMounted(() => {
  init()
})

const checkValue = (type, value, msg) => {
  if (proxy.Utils.isEmpty(value)) {
    errorMsg.value = msg
    return false
  }
  if (type && !proxy.Verify[type](value)) {
    errorMsg.value = msg
    return false;
  }
  return true
}

const clearVerify = () => {
  errorMsg.value = null
}

</script>

<style lang="scss" scoped>
.login-panel {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);

  .title {
    font-size: 32px;
    color: #2c3e50;
    margin: 80px 0 40px;
    user-select: none;
  }

  .login-form {
    width: 400px;
    padding: 40px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 12px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);

    .error-msg {
      color: #ff4444;
      margin-bottom: 20px;
      min-height: 22px;
    }

    .el-form-item {
      margin-bottom: 28px;

      :deep(.el-input__wrapper) {
        padding: 0 15px;
        border-radius: 8px;

        .iconfont {
          color: #a0a0a0;
          margin-right: 8px;
        }
      }
    }

    .login-btn {
      width: 100%;
      margin-top: 10px;
      font-size: 16px;
      letter-spacing: 2px;
      border-radius: 8px;
    }

    .bottom-link {
      text-align: center;
      margin-top: 20px;

      .a-link {
        color: #909399;
        cursor: pointer;
        transition: color 0.3s;

        &:hover {
          color: #409eff;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .login-from {
    width: 90% !important;
    padding: 20px !important;
  }
}
</style>