<template>
  <div class="task-detail">
    <div class="page-header">
      <el-button link @click="$router.back()" style="padding: 0; margin-bottom: 8px">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h1 class="page-title">{{ task?.name }}</h1>
      <p class="page-subtitle">
        模型: {{ task?.modelName }} v{{ task?.modelVersion }} |
        状态:
        <el-tag :type="getStatusType(task?.status || '')" size="small">
          {{ getStatusText(task?.status || '') }}
        </el-tag>
      </p>
    </div>

    <el-row :gutter="20" class="mb-24">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">总样本数</div>
            <div class="stat-value">{{ task?.totalSamples || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">已完成</div>
            <div class="stat-value text-success">{{ task?.completedSamples || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">失败</div>
            <div class="stat-value text-danger">{{ task?.failedSamples || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">执行进度</div>
            <div class="stat-value text-primary">{{ progress }}%</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <div class="card-wrapper">
      <div class="flex-between mb-16">
        <h3>样本列表</h3>
        <el-button
          v-if="task?.failedSamples"
          type="warning"
          size="small"
          @click="retryAllFailed"
        >
          重试全部失败
        </el-button>
      </div>
      <el-table :data="samples" style="width: 100%">
        <el-table-column prop="id" label="样本ID" width="100" />
        <el-table-column prop="question.title" label="题目标题" min-width="200">
          <template #default="scope">
            {{ scope.row.question?.title || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="retryCount" label="重试次数" width="100" />
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button
              v-if="scope.row.status === 'failed'"
              link
              type="warning"
              size="small"
              @click="retrySample(scope.row)"
            >
              重试
            </el-button>
            <el-button link type="primary" size="small">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowLeft } from '@element-plus/icons-vue';
import {
  getModelTask,
  retryAllFailed as apiRetryAllFailed,
  retrySample as apiRetrySample,
  type ModelTask,
  type TaskSample,
} from '@/api/model-tasks';

const route = useRoute();
const taskId = route.params.id as string;

const task = ref<ModelTask | null>(null);
const samples = ref<TaskSample[]>([]);

const progress = computed(() => {
  if (!task.value || task.value.totalSamples === 0) return 0;
  return Math.round(((task.value.completedSamples || 0) / task.value.totalSamples) * 100);
});

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'info',
    running: 'primary',
    completed: 'success',
    failed: 'danger',
    paused: 'warning',
  };
  return map[status] || 'info';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待执行',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    paused: '已暂停',
  };
  return map[status] || status;
};

const loadData = async () => {
  try {
    const data = await getModelTask(taskId);
    task.value = data;
    samples.value = data.samples || [];
  } catch (error) {
    console.error('加载数据失败', error);
  }
};

const retrySample = async (sample: TaskSample) => {
  try {
    await apiRetrySample(taskId, sample.id);
    ElMessage.success('已提交重试');
    loadData();
  } catch (error) {
    console.error('重试失败', error);
  }
};

const retryAllFailed = async () => {
  try {
    await apiRetryAllFailed(taskId);
    ElMessage.success('已提交全部失败样本重试');
    loadData();
  } catch (error) {
    console.error('重试失败', error);
  }
};

onMounted(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.task-detail {
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

      &.text-success {
        color: #67c23a;
      }

      &.text-danger {
        color: #f56c6c;
      }

      &.text-primary {
        color: #409eff;
      }
    }
  }
}
</style>
