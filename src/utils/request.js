import axios from 'axios'
import { ElMessage, ElLoading } from 'element-plus'

// 获取基础URL
const getBaseURL = () => {
  // 开发环境使用相对路径，由vite代理处理
  if (import.meta.env.MODE === 'development') {
    return '' // 使用代理
  }
  // 生产环境使用完整URL
  if (import.meta.env.MODE === 'production') {
    return import.meta.env.VITE_APP_BASE_API
  }
  return ''
}

// 创建axios实例
const service = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 显示loading
    if (config.showLoading !== false) {
      config.loadingInstance = ElLoading.service({
        lock: true,
        text: '加载中...',
        background: 'rgba(0, 0, 0, 0.7)'
      })
    }

    return config
  },
  (error) => {
    if (error.config?.showLoading !== false) {
      error.config?.loadingInstance?.close()
    }
    ElMessage.error('请求发送失败')
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 关闭loading
    if (response.config.showLoading !== false) {
      response.config.loadingInstance?.close()
    }

    // 如果响应是文件流，直接返回
    if (response.config.responseType === 'blob') {
      return response.data
    }

    const { code, message, data } = response.data
    console.log(response.data);
    
    if (code === 200) {
      return data
    } else {
      ElMessage.error(message || '请求失败')
      return Promise.reject(new Error(message || '请求失败'))
    }
  },
  (error) => {
    // 关闭loading
    if (error.config?.showLoading !== false) {
      error.config?.loadingInstance?.close()
    }

    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || '请求失败'

      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          userStore.logout()
          break
        case 403:
          ElMessage.error('拒绝访问')
          break
        case 404:
          ElMessage.error('请求地址不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(message)
      }
    } else if (error.code === 'ECONNABORTED') {
      ElMessage.error('请求超时')
    } else {
      ElMessage.error('网络连接失败')
    }

    return Promise.reject(error)
  }
)

// 封装请求方法
const request = {
  get(url, params = {}, config = {}) {
    return service({
      method: 'get',
      url,
      params,
      ...config
    })
  },

  post(url, data = {}, config = {}) {
    return service({
      method: 'post',
      url,
      data,
      ...config
    })
  },

  put(url, data = {}, config = {}) {
    return service({
      method: 'put',
      url,
      data,
      ...config
    })
  },

  delete(url, params = {}, config = {}) {
    return service({
      method: 'delete',
      url,
      params,
      ...config
    })
  },

  upload(url, formData, config = {}) {
    return service({
      method: 'post',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config.headers
      },
      ...config
    })
  },

  download(url, params = {}, config = {}) {
    return service({
      method: 'get',
      url,
      params,
      responseType: 'blob',
      ...config
    })
  }
}

export default request