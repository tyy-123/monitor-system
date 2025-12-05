<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import MonitorPoint from "@/components/MonitorPoint.vue";
import { monitorApi } from '@/api'
import {  ElMessage } from 'element-plus'

// 背景图片的原始尺寸（需要替换为你的SVG背景图片的实际尺寸）
const originalImageSize = {
  width: 1920, // 替换为你的背景图片实际宽度
  height: 1044 // 替换为你的背景图片实际高度
};

// 监控点数据，包含坐标信息和监控数据
const monitorPointData = ref([
  { 
    id: 1, 
    name: '达州',
    wendu: "24", 
    shidu: "86", 
    up: "0.24", 
    down: "0.32",
    x: 1000, // 在原始图片上的x坐标
    y: 460  // 在原始图片上的y坐标
  },
  { 
    id: 2, 
    name: '广安',
    wendu: "26", 
    shidu: "75", 
    up: "0.18", 
    down: "0.28",
    x: 760, // 在原始图片上的x坐标
    y: 720  // 在原始图片上的y坐标
  }
]);

// 存储每个组件的样式
const componentStyles = ref({});
const containerRef = ref(null);
const imageRef = ref(null);

// 计算所有组件在屏幕上的位置
const calculateAllPositions = () => {
  if (!containerRef.value || !imageRef.value) return;
  
  const container = containerRef.value;
  const img = imageRef.value;
  
  // 获取容器和图片的实际显示尺寸
  const containerRect = container.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();
  
  // 计算图片在容器中的实际显示尺寸（考虑object-fit: cover的效果）
  const containerAspectRatio = containerRect.width / containerRect.height;
  const imageAspectRatio = originalImageSize.width / originalImageSize.height;
  
  let displayedWidth, displayedHeight, offsetX, offsetY;
  
  if (containerAspectRatio > imageAspectRatio) {
    // 容器更宽，图片高度铺满，宽度自适应
    displayedHeight = containerRect.height;
    displayedWidth = displayedHeight * imageAspectRatio;
    offsetX = (containerRect.width - displayedWidth) / 2;
    offsetY = 0;
  } else {
    // 容器更高，图片宽度铺满，高度自适应
    displayedWidth = containerRect.width;
    displayedHeight = displayedWidth / imageAspectRatio;
    offsetX = 0;
    offsetY = (containerRect.height - displayedHeight) / 2;
  }
  
  // 为每个监控点计算位置
  const styles = {};
  monitorPointData.value.forEach(point => {
    // 计算组件在屏幕上的位置（基于原始图片坐标的比例）
    const scaleX = displayedWidth / originalImageSize.width;
    const scaleY = displayedHeight / originalImageSize.height;
    
    const screenX = offsetX + point.x * scaleX;
    const screenY = offsetY + point.y * scaleY;
    
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

const loading = ref(false)
const monitorList = ref([])
// 获取监测点列表
const fetchMonitorList = async () => {
  try {
    loading.value = true
    monitorList.value = await monitorApi.getMonitorList({
      page: 1,
      size: 10,
      keyword: ''
    })
  } catch (error) {
    ElMessage.error('获取监测点列表失败')
    console.error('Error fetching monitor list:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchMonitorList()
  // 等待图片加载完成
  if (imageRef.value.complete) {
    calculateAllPositions();
  } else {
    imageRef.value.addEventListener('load', calculateAllPositions);
  }
  
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (imageRef.value) {
    imageRef.value.removeEventListener('load', calculateAllPositions);
  }
});
</script>

<template>
  <div class="home-page" ref="containerRef">
    <div class="home-title">
      <span class="title">XX供电段</span>
      <span class="split">></span>
      <span class="title">XX供电线</span>
    </div>
    
    <!-- 使用img标签替代背景图，便于获取实际显示尺寸 -->
    <img 
      ref="imageRef"
      class="background-image"
      src="@/assets/image/map.svg" 
      alt="背景地图"
    />
    
    <!-- 循环渲染多个监控点组件 -->
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
  background-color: #f5f5f5; /* 可选的背景色 */
  
  .background-image {
    width: 100%;
    height: 100%;
    object-fit: cover; /* 保持比例完整显示 */
    display: block;
    position: absolute;
    top: 0;
    left: 0;
  }
  
  .fixed-component {
    position: absolute;
    z-index: 10;
    pointer-events: auto; /* 确保组件可以交互 */
    transition: all 0.3s ease; /* 添加平滑过渡效果 */
  }
  
  .home-title {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 20;
    
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
  }
}
</style>