<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import MonitorPoint from "@/components/MonitorPoint.vue";
import { monitorApi } from '@/api'
import { ElMessage } from 'element-plus'

// 背景图片的原始尺寸
const originalImageSize = {
  width: 1920,
  height: 1044
};

// 监控点数据
const monitorPointData = ref([]);
const containerRef = ref(null);
const imageRef = ref(null);
const componentStyles = ref({});

// 加载状态
const loading = ref(false);
// 轮询定时器
let pollInterval = null;

// 计算所有组件在屏幕上的位置
const calculateAllPositions = () => {
  if (!containerRef.value || !imageRef.value || monitorPointData.value.length === 0) return;
  
  const container = containerRef.value;
  const img = imageRef.value;
  
  const containerRect = container.getBoundingClientRect();
  const containerAspectRatio = containerRect.width / containerRect.height;
  const imageAspectRatio = originalImageSize.width / originalImageSize.height;
  
  let displayedWidth, displayedHeight, offsetX, offsetY;
  
  if (containerAspectRatio > imageAspectRatio) {
    displayedHeight = containerRect.height;
    displayedWidth = displayedHeight * imageAspectRatio;
    offsetX = (containerRect.width - displayedWidth) / 2;
    offsetY = 0;
  } else {
    displayedWidth = containerRect.width;
    displayedHeight = displayedWidth / imageAspectRatio;
    offsetX = 0;
    offsetY = (containerRect.height - displayedHeight) / 2;
  }
  
  const styles = {};
  monitorPointData.value.forEach((point,i) => {
    if (point.x === undefined || point.y === undefined) return;
    
    const scaleX = displayedWidth / originalImageSize.width;
    const scaleY = displayedHeight / originalImageSize.height;
    const x = i ? 1024 : 784
    const y = i ? 500 : 724
    // 写死的坐标
    const screenX = offsetX + x * scaleX;
    const screenY = offsetY + y * scaleY;
    
    styles[point.id] = {
      left: `${screenX}px`,
      top: `${screenY}px`,
      transform: 'translate(-50%, -50%)'
    };
  });
  
  componentStyles.value = styles;
};

// 监听窗口大小变化
const handleResize = () => {
  calculateAllPositions();
};

// 获取所有监测点基本信息
const fetchAllMonitorPoints = async () => {
  try {
    loading.value = true;
    const response = await monitorApi.getMonitorPointAll();
    
    if (response && response.length > 0) {
      // 从经纬度转换为SVG坐标
      // 这里需要根据你的地图实际范围来设置转换规则
      // 假设：经度范围108-110，纬度范围30-31对应到SVG坐标
      const pointsWithCoords = response.map(point => {
        // 经纬度到SVG坐标的转换
        // 你可以根据实际地图范围调整这个转换公式
        const x = ((point.longitude - 108) / (110 - 108)) * originalImageSize.width;
        const y = ((31 - point.latitude) / (31 - 30)) * originalImageSize.height;
        
        return {
          id: point.id,
          name: point.monitoringPointName || point.name,
          pointCode: point.pointCode || point.monitoringPointCode,
          x: Math.max(0, Math.min(x, originalImageSize.width)), // 确保在图片范围内
          y: Math.max(0, Math.min(y, originalImageSize.height)),
          // 初始数据
          wendu: "0",
          shidu: "0",
          up: "0",
          down: "0"
        };
      });
      
      monitorPointData.value = pointsWithCoords;
      
      // 获取监测点详情数据
      await fetchMonitorDetails(pointsWithCoords);
    }
  } catch (error) {
    console.error('获取监测点列表失败:', error);
    ElMessage.error('获取监测点列表失败');
  } finally {
    loading.value = false;
  }
};

// 获取监测点详情数据
const fetchMonitorDetails = async (points) => {
  try {
    if (!points || points.length === 0) return;
    
    const pointCodes = points.map(p => p.pointCode).filter(code => code);
    
    if (pointCodes.length === 0) return;
    
    const response = await monitorApi.getByMonitorPointIds({monitoringPointCodes:pointCodes});
    
    if (response && response.length > 0) {
      // 创建详情数据的映射
      const detailsMap = {};
      response.forEach(detail => {
        detailsMap[detail.monitoringPointCode] = detail;
      });
      
      // 更新监控点数据
      monitorPointData.value = monitorPointData.value.map(point => {
        const detail = detailsMap[point.pointCode];
        if (detail) {
          return {
            ...point,
            wendu: detail.temperature?.toString() || "0",
            shidu: detail.humidity?.toString() || "0",
            up: detail.overIce?.toString() || "0",
            down: detail.underIce?.toString() || "0"
          };
        }
        return point;
      });
      
      // 重新计算位置
      setTimeout(calculateAllPositions, 0);
    }
  } catch (error) {
    console.error('获取监测点详情失败:', error);
    // 这里不显示错误消息，避免频繁弹出
  }
};

// 轮询获取最新数据
const startPollingData = () => {
  // 先停止已有的轮询
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  
  // 每5分钟刷新一次
  pollInterval = setInterval(async () => {
    if (monitorPointData.value.length > 0) {
      await fetchMonitorDetails(monitorPointData.value);
    }
  }, 5 * 60 * 1000); // 5分钟
};


onMounted(async () => {
  // 初始加载数据
  await fetchAllMonitorPoints();
  
  // 开始轮询
  startPollingData();
  
  // 计算位置
  if (imageRef.value) {
    if (imageRef.value.complete) {
      setTimeout(calculateAllPositions, 100);
    } else {
      imageRef.value.addEventListener('load', () => {
        setTimeout(calculateAllPositions, 100);
      });
    }
  }
  
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  if (imageRef.value) {
    imageRef.value.removeEventListener('load', calculateAllPositions);
  }
});

// 添加一个手动刷新的方法，可以通过按钮调用
// 如果需要，可以添加一个刷新按钮
</script>

<template>
  <div class="home-page" ref="containerRef">
    <div class="home-title">
      <span class="title">XX供电段</span>
      <span class="split">></span>
      <span class="title">XX供电线</span>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
    
    <!-- 无数据提示 -->
    <div v-if="!loading && monitorPointData.length === 0" class="empty-state">
      <el-icon><DataLine /></el-icon>
      <p>暂无监测点数据</p>
    </div>
    
    <!-- 背景图片 -->
    <img 
      ref="imageRef"
      class="background-image"
      src="@/assets/image/map.svg" 
      alt="背景地图"
    />
    
    <!-- 渲染监控点组件 -->
    <MonitorPoint 
      v-for="point in monitorPointData" 
      :key="point.id"
      class="fixed-component" 
      :style="componentStyles[point.id]"
      :data="point"
    />
  </div>
</template>

<style scoped lang="scss">
.home-page {
  position: relative;
  width: 100vw;
  height: calc(100vh - 66px);
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
  
  .background-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    position: absolute;
    top: 0;
    left: 0;
  }
  
  .fixed-component {
    position: absolute;
    z-index: 10;
    pointer-events: auto;
    transition: all 0.3s ease;
  }
  
  .home-title {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 12px;
    
    .split {
      margin: 0 8px;
      font-weight: 700;
      color: #ffffff;
    }
    
    .title {
      font-family: Source Han Sans;
      font-size: 20px;
      font-weight: 500;
      color: #09f7ff;
    }
    
    .refresh-btn {
      margin-left: 20px;
      background-color: rgba(9, 247, 255, 0.2);
      border-color: #09f7ff;
      color: #09f7ff;
      
      &:hover {
        background-color: rgba(9, 247, 255, 0.3);
        border-color: #09f7ff;
      }
    }
  }
  
  .loading-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    z-index: 15;
    color: #09f7ff;
    
    .loading-icon {
      font-size: 32px;
      animation: spin 1.5s linear infinite;
    }
  }
  
  .empty-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 15;
    color: #999;
    
    .el-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }
    
    p {
      font-size: 16px;
    }
  }
  
  .polling-info {
    position: absolute;
    bottom: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #999;
    z-index: 20;
    background-color: rgba(255, 255, 255, 0.8);
    padding: 4px 8px;
    border-radius: 4px;
    
    .polling-icon {
      font-size: 14px;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@media (max-width:1600px) {
  .fixed-component {
    transform:translate(-50%, -50%) scale(0.9)!important;
  }
}
@media (max-width:1400px) {
  .fixed-component {
    transform:translate(-50%, -50%) scale(0.8)!important;
  }
}
@media (max-width:1200px) {
  .fixed-component {
    transform:translate(-50%, -50%) scale(0.7)!important;
  }
}
@media (max-width:1000px) {
  .fixed-component {
    transform:translate(-50%, -50%) scale(0.6)!important;
  }
}
</style>