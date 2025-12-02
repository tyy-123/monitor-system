<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const menuList = ref([
  { name: "首页", routeName: "home" },
  { name: "历史曲线", routeName: "history" },
]);
const handleClickMenu = (menu) => {
  router.push({
    name: menu.routeName,
  });
};

</script>

<template>
  <div class="header">
    <div class="header-title">
      <img src="@/assets/image/logo.svg" alt="" />
      <span class="title">接触网覆冰监测系统</span>
    </div>
    <div class="menu-list">
      <span
        :class="
          router.currentRoute.value.name === menu.routeName ? 'active' : ''
        "
        @click="handleClickMenu(menu)"
        class="menu-item"
        v-for="(menu, i) in menuList"
        :key="i"
      >
        <span class="title">
          {{ menu.name }}
        </span>
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.header {
  width: 100%;
  height: 66px;
  background-image: url("@/assets/image/header-bg.svg");
  background-repeat: no-repeat;
  background-size: cover;
  background-position: left top;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  .header-title {
    display: flex;
    align-items: center;
    margin-right: 175px;
    .title {
      margin-left: 10px;
      text-wrap: nowrap;
      white-space: nowrap;
      font-size: 28px;
      font-weight: bold;
      line-height: normal;
      letter-spacing: 0em;
      background: linear-gradient(180deg, #ffffff 0%, #3df9ff 99%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-fill-color: transparent;
      text-shadow: 2px 2px 10px rgba(0, 0, 0, 0.12);
    }
  }
  .menu-list {
    display: flex;
    .menu-item {
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 128px;
      height: 40px;
      font-family: Source Han Sans;
      font-size: 16px;
      font-weight: bold;
      line-height: normal;
      color: #3dbbff;
      background-image: url("@/assets/image/menu.svg");
      background-repeat: no-repeat;
      background-size: 100%;
      background-position: left top;
      &.active {
        transition: 0.3s;
        background-image: url("@/assets/image/menu-active.svg");
        .title {
          z-index: 999;
          font-size: 16px;
          font-weight: bold;
          color: #09ffff;
        }
      }
    }
  }
}
</style>
