<template>
  <el-container class="main-container">
    <el-aside width="240px" class="sidebar">
      <div class="logo">
        <el-icon :size="28" color="#409eff"><DataAnalysis /></el-icon>
        <span class="logo-text">AI 评测平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>数据概览</span>
        </el-menu-item>
        <el-menu-item index="/evaluation-sets">
          <el-icon><Collection /></el-icon>
          <span>评测集管理</span>
        </el-menu-item>
        <el-menu-item index="/model-tasks">
          <el-icon><Files /></el-icon>
          <span>模型任务</span>
        </el-menu-item>
        <el-menu-item index="/scoring">
          <el-icon><Edit /></el-icon>
          <span>评分复核</span>
        </el-menu-item>
        <el-menu-item index="/reports">
          <el-icon><Document /></el-icon>
          <span>评测报告</span>
        </el-menu-item>
        <el-menu-item index="/cost">
          <el-icon><Money /></el-icon>
          <span>成本统计</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.meta.title">{{ currentRoute.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-avatar :size="32" icon="UserFilled" />
          <span class="username">管理员</span>
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import {
  DataAnalysis,
  DataLine,
  Collection,
  Files,
  Edit,
  Document,
  Money,
} from '@element-plus/icons-vue';

const route = useRoute();
const activeMenu = computed(() => route.path);
const currentRoute = computed(() => route);
</script>

<style lang="scss" scoped>
.main-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  height: 100%;
  overflow: hidden;

  .logo {
    display: flex;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    .logo-text {
      margin-left: 12px;
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }
  }

  .sidebar-menu {
    border: none;
    height: calc(100% - 80px);
  }
}

.header {
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #e6e6e6;

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;

    .username {
      color: #606266;
      font-size: 14px;
    }
  }
}

.main-content {
  background: #f5f7fa;
  padding: 24px;
}

.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
