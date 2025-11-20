import axios from 'axios'
import { ElLoading } from 'element-plus'
import Message from '../utils/Message'
import Api from '../utils/Api'

const contentTypeForm = 'application/x-www-form-urlencoded; charset=UTF-8'
const contentTypeJson = 'application/json'
const responseTypeJson = 'json'
let loading = null;

const instance = axios.create({
  withCredentials: true,
  baseURL: (import.meta.env.PROD ? Api.prodDomain : "") + "/api",
  timeout: 10 * 1000,
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    if (config.showLoading) {
      loading = ElLoading.service({
        lock: true,
        text: '加载中......',
        background: 'rgba(0, 0, 0, 0.7)',
      });
    }
    return config;
  },
  (error) => {
    if (error.config?.showLoading && loading) {
      loading.close();
    }
    Message.error("请求发送失败");
    return Promise.reject("请求发送失败");
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const { showLoading, errorCallback, showError = true, responseType } = response.config;
    if (showLoading && loading) {
      loading.close();
    }
    const responseData = response.data;
    
    if (responseType === "arraybuffer" || responseType === "blob") {
      return responseData;
    }
    
    if (responseData.code === 200) {
      return responseData;
    } else if (responseData.code === 901) {
      // 登录超时处理
      setTimeout(() => {
        window.ipcRenderer.send('reLogin');
      }, 2000);
      return Promise.reject({ showError: true, msg: "登录超时" });
    } else {
      // 其他错误处理
      if (errorCallback) {
        errorCallback(responseData);
      }
      return Promise.reject({ showError: showError, msg: responseData.info });
    }
  },
  (error) => {
    if (error.config?.showLoading && loading) {
      loading.close();
    }
    return Promise.reject({ showError: true, msg: "网络异常" });
  }
);

// 封装请求方法
const request = (config) => {
  const { url, params, dataType, showLoading = true, responseType = responseTypeJson, showError = true } = config;
  let contentType = contentTypeForm;
  let formData = new FormData();
  
  // 构建FormData
  for (let key in params) {
    formData.append(key, params[key] == undefined ? "" : params[key]);
  }
  
  // JSON数据处理
  if (dataType != null && dataType === 'json') {
    contentType = contentTypeJson;
  }
  
  // 设置请求头
  const token = localStorage.getItem('token');//采用token记录信息
  let headers = {
    'Content-Type': contentType,
    'X-Requested-With': 'XMLHttpRequest',
    "token": token
  };
  
  // 发送请求并处理异常
  return instance.post(url, formData, {
    headers: headers,
    showLoading: showLoading,
    errorCallback: config.errorCallback,
    showError: showError,
    responseType: responseType
  }).catch(error => {
    if (error?.showError) {
      Message.error(error.msg);
    }
    return null;
  });
};

export default request;