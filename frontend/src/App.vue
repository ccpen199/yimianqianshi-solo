<template>
  <el-container style="height: 100vh">
    <el-aside width="220px" style="background-color: #304156">
      <div style="padding: 20px; text-align: center; color: #fff; font-size: 18px; font-weight: bold; border-bottom: 1px solid #4a5f7a">
        客户成功管理系统
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据看板</span>
        </el-menu-item>
        <el-menu-item index="/customers">
          <el-icon><User /></el-icon>
          <span>客户管理</span>
        </el-menu-item>
        <el-menu-item index="/renewal-calendar">
          <el-icon><Calendar /></el-icon>
          <span>续费日历</span>
        </el-menu-item>
        <el-menu-item index="/risk-alerts">
          <el-icon><Warning /></el-icon>
          <span>风险预警</span>
        </el-menu-item>
        <el-menu-item index="/renewal-records">
          <el-icon><Document /></el-icon>
          <span>续费记录</span>
        </el-menu-item>
        <el-sub-menu index="analysis">
          <template #title>
            <el-icon><TrendCharts /></el-icon>
            <span>客户分析</span>
          </template>
          <el-menu-item index="/high-risk">高风险客户</el-menu-item>
          <el-menu-item index="/churned">已流失客户</el-menu-item>
          <el-menu-item index="/upsell">增购机会</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-main style="background-color: #f5f7fa; overflow-y: auto">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<style scoped>
.el-menu {
  border-right: none;
}
</style>
