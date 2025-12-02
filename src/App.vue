<script setup>
import { RouterView } from "vue-router";
import Header from "./components/Header.vue";
</script>

<template>
  <Header />
  <main class="monitor-main">
    <RouterView />
  </main>
</template>

<style lang="scss">
div#app {
  width: 100%;
  height: 100%;
  .monitor-main {
    height: calc(100% - 66px);
  }
}
</style>
