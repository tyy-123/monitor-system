<script setup>
import { defineProps } from "vue";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});
</script>

<template>
  <div class="component-monitor-point">
    <div class="monitor-header">
      <span class="monitor-title">{{ data.name }}</span>
    </div>
    
    <div class="monitor-grid">
      <div class="grid-cell top-left">
        <div class="data-item">
          <span class="data-label">温度：</span>
          <span class="data-value">{{ data.wendu || '24' }}℃</span>
        </div>
      </div>
      
      <div class="grid-cell top-right">
        <div class="data-item">
          <span class="data-label">湿度：</span>
          <span class="data-value">{{ data.shidu || '86' }}%</span>
        </div>
      </div>
      
      <div class="grid-cell bottom-left">
        <div class="data-item">
          <span class="data-label">上覆冰：</span>
          <span class="data-value">{{ data.up || '0.24' }}</span>
        </div>
      </div>
      
      <div class="grid-cell bottom-right">
        <div class="data-item">
          <span class="data-label">下覆冰：</span>
          <span class="data-value">{{ data.down || '0.32' }}</span>
        </div>
      </div>
      
      <!-- 分割线 -->
      <div class="divider vertical"></div>
      <div class="divider horizontal"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.component-monitor-point {
  width: 330px;
  height: 200px;
  background-image: url("@/assets/image/point-bg.svg");
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
  
  .monitor-header {
    height: 66px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .monitor-title {
      font-family: 'Microsoft YaHei', sans-serif;
      font-size: 16px;
      font-weight: 500;
      color: #ffffff;
      letter-spacing: 0.5px;
    }
  }
  
  .monitor-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    height: calc(100% - 66px);
    position: relative;
  }
  
  .grid-cell {
    display: flex;
    justify-content: center;
    
    .data-item {
      display: flex;
      align-items: center;
      text-align: center;
      
      .data-label {
        display: block;
        font-family: 'Microsoft YaHei', sans-serif;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.95);
      }
      
      .data-value {
        display: block;
        font-family: 'Microsoft YaHei', sans-serif;
        font-size: 18px;
        font-weight: 600;
        color: #ffffff;
      }
    }
  }
}

// 响应式调整
@media (max-width: 768px) {
  .component-monitor-point {
    width: 280px;
    height: 160px;
    
    .monitor-header .monitor-title {
      font-size: 14px;
    }
    
    .grid-cell {
      padding: 12px;
      
      .data-item {
        .data-label {
          font-size: 12px;
          margin-bottom: 4px;
        }
        
        .data-value {
          font-size: 16px;
        }
      }
    }
  }
}
</style>