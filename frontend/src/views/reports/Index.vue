<template>
  <div class="reports">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">评测报告</h1>
        <p class="page-subtitle">查看和管理模型评测结果报告</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        生成报告
      </el-button>
    </div>

    <div class="card-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="name" label="报告名称" min-width="200" />
        <el-table-column prop="task.name" label="关联任务" min-width="150">
          <template #default="scope">
            {{ scope.row.task?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="accuracy" label="准确率" width="120">
          <template #default="scope">
            {{ scope.row.accuracy ? `${scope.row.accuracy}%` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="totalSamples" label="样本数" width="100" />
        <el-table-column prop="lowScoreSamples" label="低分样本" width="100" />
        <el-table-column prop="isPublished" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.isPublished ? 'success' : 'info'" size="small">
              {{ scope.row.isPublished ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button link type="primary" size="small" @click.stop="goToDetail(scope.row.id)">
              查看详情
            </el-button>
            <el-button
              v-if="!scope.row.isPublished"
              link
              type="success"
              size="small"
              @click.stop="publishReport(scope.row)"
            >
              发布
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const router = useRouter();
const loading = ref(false);
const tableData = ref<any[]>([]);

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const openCreateDialog = () => {
  ElMessage.info('生成报告功能开发中');
};

const handleRowClick = (row: any) => {
  goToDetail(row.id);
};

const goToDetail = (id: string) => {
  router.push(`/reports/${id}`);
};

const publishReport = (row: any) => {
  ElMessage.success('报告已发布');
  row.isPublished = true;
};

onMounted(() => {
  // 加载示例数据
  tableData.value = [
    {
      id: '1',
      name: 'GPT-4 中文问答评测报告',
      accuracy: 89.5,
      totalSamples: 100,
      lowScoreSamples: 5,
      isPublished: true,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      task: { name: 'GPT-4 问答评测任务' },
    },
    {
      id: '2',
      name: 'Claude 代码生成评测报告',
      accuracy: 85.2,
      totalSamples: 80,
      lowScoreSamples: 8,
      isPublished: false,
      createdAt: new Date().toISOString(),
      task: { name: 'Claude 代码评测任务' },
    },
  ];
});
</script>
