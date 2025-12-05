import request from '@/utils/request'


// 监测点相关接口
export const monitorApi = {
  // 获取部门树
  getDepartmentTree() {
    return request.get('/api/department/tree')
  },
   // 获取所有监测点
  getMonitorPointAll() {
    return request.get('/api/monitoring/point/all')
  },
  
  // 根据部门id查询监测点
  getPointDepartment(id) {
    return request.get(`/api/monitoring/point/department/${id}`)
  },
  
  // 获取指定监测点的最新数据
  getByMonitorPointIds(data) {
    return request.post('/api/ice/data/get/by/monitorPointIds', data)
  },
  
  // 获取趋势曲线 (最多支持最近三个月数据的查询)
  getTrendCurve(data) {
    return request.post('/api/ice/data/get/trend/curve', data)
  },

  // 导出趋势曲线数据
  exportCurve(data) {
    return request.post('/api/export/trendCurve', data,{responseType: 'blob',})
  },

    // 导出趋势曲线数据
  getAllExportColumns() {
    return request.post('/api/export/getAllExportColumns')
  }
}

export default {
  monitorApi
}