<template>
  <div class="report-detail">
    <div class="page-header">
      <el-button link @click="$router.back()" style="padding: 0; margin-bottom: 8px">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h1 class="page-title">{{ report?.name }}</h1>
      <p class="page-subtitle">
        状态:
        <el-tag :type="report?.isPublished ? 'success' : 'info'" size="small">
          {{ report?.isPublished ? '已发布' : '草稿' }}
        </el-tag>
      </p>
    </div>

    <el-row :gutter="20" class="mb-24">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">准确率</div>
            <div class="stat-value text-primary">{{ report?.accuracy || 0 }}%</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">平均延迟</div>
            <div class="stat-value">{{ report?.avgLatencyMs || 0 }}ms</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">Token成本</div>
            <div class="stat-value">¥{{ report?.totalTokenCost || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">样本总数</div>
            <div class="stat-value">{{ report?.totalSamples || 0 }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="card-wrapper mb-24">
      <h3>报告结论</h3>
      <el-empty v-if="!conclusions.length" description="暂无结论" />
      <div v-else class="conclusion-list">
        <div v-for="conclusion in conclusions" :key="conclusion.id" class="conclusion-item">
          <h4>{{ conclusion.title }}</h4>
          <p>{{ conclusion.content }}</p>
          <div class="conclusion-meta">
            <span>作者: {{ conclusion.author }}</span>
            <span>{{ formatDate(conclusion.createdAt) }}</span>
            <el-tag v-if="conclusion.isFrozen" type="success" size="small">已冻结</el-tag>
          </div>
        </div>
      </div>
    </div>

    <div class="card-wrapper">
      <div class="flex-between mb-16">
        <h3>低分样本分析</h3>
        <el-input
          v-model="searchText"
          placeholder="搜索题目"
          style="width: 250px"
          clearable
        />
      </div>
      <el-table :data="lowScoreSamples" style="width: 100%">
        <el-table-column prop="question.title" label="题目标题" min-width="200">
          <template #default="scope">
            {{ scope.row.question?.title || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'failed' ? 'danger' : 'warning'" size="small">
              {{ scope.row.status === 'failed' ? '失败' : '低分' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button link type="primary" size="small">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';
import dayjs from 'dayjs';

const route = useRoute();
const reportId = route.params.id as string;

const searchText = ref('');
const report = ref<any>(null);
const conclusions = ref<any[]>([]);
const lowScoreSamples = ref<any[]>([]);

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

onMounted(() => {
  report.value = {
    id: reportId,
    name: 'GPT-4 中文问答评测报告',
    accuracy: 89.5,
    avgLatencyMs: 1250,
    totalTokenCost: 45.8,
    totalSamples: 100,
    isPublished: true,
  };

  conclusions.value = [
    {
      id: '1',
      title: '整体表现评估',
      content: 'GPT-4在中文问答任务中表现优异，整体准确率达到89.5%，在复杂推理场景中表现突出。',
      author: '评测专家',
      isFrozen: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: '改进建议',
      content: '建议在数学计算和代码生成场景中优化提示词设计，提升此类场景的准确率。',
      author: '算法工程师',
      isFrozen: false,
      createdAt: new Date().toISOString(),
    },
  ];

  lowScoreSamples.value = [
    {
      id: '1',
      status: 'low_score',
      question: { title: '复杂数学推理题' },
    },
    {
      id: '2',
      status: 'failed',
      question: { title: '多语言翻译题' },
    },
  ];
});
</script>

<style lang="scss" scoped>
.report-detail {
  .stat-item {
    text-align: center;

    .stat-label {
      font-size: 14px;
      color: #909399;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 600;
      color: #303133;

      &.text-primary {
        color: #409eff;
      }
    }
  }

  .conclusion-list {
    .conclusion-item {
      padding: 16px;
      border: 1px solid #ebeef5;
      border-radius: 8px;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      h4 {
        margin: 0 0 8px 0;
        color: #303133;
      }

      p {
        margin: 0 0 12px 0;
        color: #606266;
        line-height: 1.6;
      }

      .conclusion-meta {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #909399;
      }
    }
  }
}
</style>
