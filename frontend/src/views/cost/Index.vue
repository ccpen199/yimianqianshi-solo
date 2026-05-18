<template>
  <div class="cost">
    <div class="page-header">
      <h1 class="page-title">成本统计</h1>
      <p class="page-subtitle">统计和分析模型评测的Token消耗和成本</p>
    </div>

    <el-row :gutter="20" class="mb-24">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">总消耗Token</div>
            <div class="stat-value">{{ summary.totalInputTokens + summary.totalOutputTokens }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">总成本</div>
            <div class="stat-value text-danger">¥{{ summary.totalCost.toFixed(2) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="stat-item">
            <div class="stat-label">平均每样本成本</div>
            <div class="stat-value">¥{{ (summary.totalCost / 100).toFixed(2) }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="16">
        <div class="card-wrapper">
          <h3>消耗明细</h3>
          <el-table :data="consumptions" style="width: 100%">
            <el-table-column prop="task.name" label="任务名称" min-width="180">
              <template #default="scope">
                {{ scope.row.task?.name || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="modelName" label="模型名称" width="150" />
            <el-table-column prop="inputTokens" label="输入Token" width="120" />
            <el-table-column prop="outputTokens" label="输出Token" width="120" />
            <el-table-column prop="cost" label="成本" width="120">
              <template #default="scope">
                ¥{{ scope.row.cost.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="consumedAt" label="消耗时间" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.consumedAt) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="card-wrapper">
          <h3>按模型统计</h3>
          <div class="model-breakdown">
            <div v-for="item in modelBreakdown" :key="item.modelName" class="breakdown-item">
              <div class="breakdown-header">
                <span class="model-name">{{ item.modelName }}</span>
                <span class="cost">¥{{ item.totalCost.toFixed(2) }}</span>
              </div>
              <el-progress
                :percentage="(item.totalCost / summary.totalCost) * 100"
                :stroke-width="8"
                :show-text="false"
              />
              <div class="stats">
                <span>任务: {{ item.taskCount }}</span>
                <span>Token: {{ item.totalInputTokens + item.totalOutputTokens }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import dayjs from 'dayjs';

const summary = ref({
  totalInputTokens: 523400,
  totalOutputTokens: 186200,
  totalCost: 106.44,
});

const consumptions = ref<any[]>([]);
const modelBreakdown = ref<any[]>([]);

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

onMounted(() => {
  consumptions.value = [
    {
      id: '1',
      modelName: 'GPT-4',
      inputTokens: 12500,
      outputTokens: 3200,
      cost: 23.55,
      consumedAt: new Date().toISOString(),
      task: { name: 'GPT-4 中文问答评测' },
    },
    {
      id: '2',
      modelName: 'Claude 3',
      inputTokens: 8900,
      outputTokens: 2100,
      cost: 16.5,
      consumedAt: new Date().toISOString(),
      task: { name: 'Claude 代码评测' },
    },
    {
      id: '3',
      modelName: 'GPT-3.5',
      inputTokens: 15600,
      outputTokens: 4800,
      cost: 30.6,
      consumedAt: new Date().toISOString(),
      task: { name: 'GPT-3.5 基础评测' },
    },
  ];

  modelBreakdown.value = [
    {
      modelName: 'GPT-4',
      totalCost: 66.44,
      totalInputTokens: 320000,
      totalOutputTokens: 120000,
      taskCount: 5,
    },
    {
      modelName: 'Claude 3',
      totalCost: 25.0,
      totalInputTokens: 120000,
      totalOutputTokens: 45000,
      taskCount: 3,
    },
    {
      modelName: 'GPT-3.5',
      totalCost: 15.0,
      totalInputTokens: 83400,
      totalOutputTokens: 21200,
      taskCount: 4,
    },
  ];
});
</script>

<style lang="scss" scoped>
.cost {
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

      &.text-danger {
        color: #f56c6c;
      }
    }
  }

  .model-breakdown {
    .breakdown-item {
      padding: 16px 0;
      border-bottom: 1px solid #ebeef5;

      &:last-child {
        border-bottom: none;
      }

      .breakdown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .model-name {
          font-weight: 600;
          color: #303133;
        }

        .cost {
          color: #f56c6c;
          font-weight: 600;
        }
      }

      .stats {
        margin-top: 8px;
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #909399;
      }
    }
  }
}
</style>
