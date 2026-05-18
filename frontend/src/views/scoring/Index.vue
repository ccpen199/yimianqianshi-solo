<template>
  <div class="scoring">
    <div class="page-header">
      <h1 class="page-title">评分复核</h1>
      <p class="page-subtitle">管理人工评分和复核流程</p>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="待复核列表" name="pending">
        <div class="card-wrapper">
          <el-table
            v-loading="loading"
            :data="pendingReviews"
            style="width: 100%"
          >
            <el-table-column prop="id" label="ID" width="100" />
            <el-table-column prop="sample.task.name" label="任务名称" min-width="150">
              <template #default="scope">
                {{ scope.row.sample?.task?.name || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="sample.question.title" label="题目标题" min-width="150">
              <template #default="scope">
                {{ scope.row.sample?.question?.title || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="reviewerName" label="复核人" width="120" />
            <el-table-column prop="originalScore" label="原分数" width="100" />
            <el-table-column prop="newScore" label="新分数" width="100" />
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button link type="success" size="small" @click="approveReview(scope.row)">
                  通过
                </el-button>
                <el-button link type="danger" size="small" @click="rejectReview(scope.row)">
                  拒绝
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="评分规则" name="rules">
        <div class="card-wrapper">
          <div class="flex-between mb-16">
            <h3>评分规则列表</h3>
            <el-button type="primary" size="small">
              <el-icon><Plus /></el-icon>
              新增规则
            </el-button>
          </div>
          <el-table :data="scoringRules" style="width: 100%">
            <el-table-column prop="name" label="规则名称" min-width="150" />
            <el-table-column prop="description" label="描述" min-width="200">
              <template #default="scope">
                {{ scope.row.description || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="version" label="版本" width="100" />
            <el-table-column prop="isActive" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.isActive ? 'success' : 'info'" size="small">
                  {{ scope.row.isActive ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const activeTab = ref('pending');
const loading = ref(false);
const pendingReviews = ref<any[]>([]);
const scoringRules = ref<any[]>([]);

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const approveReview = (row: any) => {
  ElMessage.success('已通过复核');
};

const rejectReview = (row: any) => {
  ElMessage.success('已拒绝复核');
};

onMounted(() => {
  // 加载示例数据
  pendingReviews.value = [
    {
      id: 1,
      reviewerName: '张三',
      originalScore: 85,
      newScore: 90,
      reason: '答案符合要求，给出高分',
      createdAt: new Date().toISOString(),
      sample: {
        task: { name: 'GPT-4 问答评测' },
        question: { title: 'Python编程基础' },
      },
    },
    {
      id: 2,
      reviewerName: '李四',
      originalScore: 70,
      newScore: 75,
      reason: '逻辑正确，提升分数',
      createdAt: new Date().toISOString(),
      sample: {
        task: { name: 'GPT-4 问答评测' },
        question: { title: '算法实现题' },
      },
    },
  ];

  scoringRules.value = [
    {
      id: 1,
      name: '相似度评分规则',
      description: '基于文本相似度计算匹配得分',
      version: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: '关键词匹配规则',
      description: '检查关键词出现情况',
      version: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];
});
</script>
