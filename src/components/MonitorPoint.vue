<script setup>
import { defineProps } from "vue";

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
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
          <span class="data-value" :title="data.wendu">{{ data.wendu || "24" }}℃</span>
        </div>
      </div>

      <div class="grid-cell top-right">
        <div class="data-item">
          <span class="data-label">湿度：</span>
          <span class="data-value" :title="data.shidu">{{ data.shidu || "86" }}%</span>
        </div>
      </div>

      <div class="grid-cell bottom-left">
        <div class="data-item">
          <span class="data-label">上覆冰：</span>
          <span class="data-value" :title="data.up">{{ data.up || "0.24" }}</span>
        </div>
      </div>

      <div class="grid-cell bottom-right">
        <div class="data-item">
          <span class="data-label">下覆冰：</span>
          <span class="data-value" :title="data.down">{{ data.down || "0.32" }}</span>
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
      font-family: "Microsoft YaHei", sans-serif;
      font-size: 16px;
      font-weight: 500;
      color: #ffffff;
      letter-spacing: 0.5px;
    }
  }

  .monitor-grid {
    display: flex;
    flex-wrap: wrap;
  }

  .grid-cell {
    width: 50%;
    padding: 16px;
    display: flex;
    justify-content: space-between;

    .data-item {
      display: flex;
      align-items: center;
      text-align: center;
      width: 100%;

      .data-label {
        display: block;
        font-family: "Microsoft YaHei", sans-serif;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.95);
        white-space: nowrap;
      }

      .data-value {
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
        width: calc(100% - 56px);
        display: block;
        font-family: "Microsoft YaHei", sans-serif;
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
