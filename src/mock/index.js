// 模拟数据，用于本地开发时测试
export const mockData = {
  // 监测点列表模拟数据
  monitorList: {
    code: 200,
    message: 'success',
    data: [
      { id: 1, name: '监测点A', value: 24.5, status: 1 },
      { id: 2, name: '监测点B', value: 26.8, status: 1 },
      { id: 3, name: '监测点C', value: 22.3, status: 0 }
    ]
  },
  
  // 历史数据模拟数据
  historyData: {
    code: 200,
    message: 'success',
    data: Array.from({ length: 24 }, (_, i) => ({
      time: `12/${String(i + 1).padStart(2, '0')} 00:00`,
      value1: Math.floor(Math.random() * 100000) + 20000,
      value2: Math.floor(Math.random() * 100000) + 20000,
      value3: Math.floor(Math.random() * 100000) + 20000
    }))
  }
}

// 模拟请求延迟
export const mockRequest = (data, delay = 500) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data)
    }, delay)
  })
}