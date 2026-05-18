<template>
  <div class="test-page">
    <h1>测试页面</h1>
    <p>如果您能看到这个内容，说明 Vue 基础渲染正常工作！</p>
    <el-button type="primary">Element Plus 按钮</el-button>
  </div>
</template>

<script setup lang="ts">
console.log('Test page loaded');
</script>

<style scoped>
.test-page {
  padding: 20px;
}
h1 {
  color: #409eff;
}
</style>
