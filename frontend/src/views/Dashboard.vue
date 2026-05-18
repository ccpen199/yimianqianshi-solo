<template>
  <div class="dashboard">
    <div class="page-header">
      <h1 class="page-title">数据概览</h1>
      <p class="page-subtitle">实时监控平台运行数据</p>
    </div>

    <el-row :gutter="20" class="mb-24">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon icon-blue">
            <el-icon :size="28"><Collection /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.evaluationSets }}</div>
            <div class="stat-label">评测集数量</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon icon-green">
            <el-icon :size="28"><Files /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.tasks }}</div>
            <div class="stat-label">模型任务数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon icon-orange">
            <el-icon :size="28"><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.reports }}</div>
            <div class="stat-label">评测报告数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon icon-purple">
            <el-icon :size="28"><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">¥{{ stats.totalCost.toFixed(2) }}</div>
            <div class="stat-label">总消耗成本</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20">
      <el-col :span="12">
        <div class="card-wrapper">
          <h3 class="card-title">任务状态分布</h3>
          <div ref="taskStatusChartRef" class="chart-container"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="card-wrapper">
          <h3 class="card-title">近期成本趋势</h3>
          <div ref="costTrendChartRef" class="chart-container"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-24">
      <el-col :span="12">
        <div class="card-wrapper">
          <h3 class="card-title">最近任务</h3>
          <el-table :data="recentTasks" style="width: 100%">
            <el-table-column prop="name" label="任务名称" />
            <el-table-column prop="modelName" label="模型名称" />
            <el-table-column prop="status" label="状态">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)">
                  {{ getStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="card-wrapper">
          <h3 class="card-title">评测集列表</h3>
          <el-table :data="recentSets" style="width: 100%">
            <el-table-column prop="name" label="评测集名称" />
            <el-table-column prop="isFrozen" label="状态">
              <template #default="scope">
                <el-tag :type="scope.row.isFrozen ? 'success' : 'info'">
                  {{ scope.row.isFrozen ? '已冻结' : '未冻结' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { Collection, Files, Document, Money } from '@element-plus/icons-vue';
import { getEvaluationSets } from '@/api/evaluation-sets';
import { getModelTasks } from '@/api/model-tasks';

const stats = ref({
  evaluationSets: 0,
  tasks: 0,
  reports: 0,
  totalCost: 0,
});

const recentTasks = ref<any[]>([]);
const recentSets = ref<any[]>([]);

const taskStatusChartRef = ref<HTMLElement>();
const costTrendChartRef = ref<HTMLElement>();

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

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

const initTaskStatusChart = () => {
  if (!taskStatusChartRef.value) return;

  const chart = echarts.init(taskStatusChartRef.value);
  chart.setOption({
    tooltip: {
      trigger: 'item',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
    },
    series: [
      {
        name: '任务状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: [
          { value: 3, name: '待执行', itemStyle: { color: '#909399' } },
          { value: 2, name: '运行中', itemStyle: { color: '#409eff' } },
          { value: 5, name: '已完成', itemStyle: { color: '#67c23a' } },
          { value: 1, name: '失败', itemStyle: { color: '#f56c6c' } },
        ],
      },
    ],
  });
};

const initCostTrendChart = () => {
  if (!costTrendChartRef.value) return;

  const chart = echarts.init(costTrendChartRef.value);
  chart.setOption({
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    },
    yAxis: {
      type: 'value',
      name: '成本(元)',
    },
    series: [
      {
        name: '消耗成本',
        type: 'line',
        stack: 'Total',
        data: [120, 190, 150, 220, 180, 250, 200],
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
          ]),
        },
      },
    ],
  });
};

const loadData = async () => {
  try {
    const [setsData, tasksData] = await Promise.all([
      getEvaluationSets({ page: 1, pageSize: 5 }),
      getModelTasks({ page: 1, pageSize: 5 }),
    ]);

    stats.value.evaluationSets = setsData.total;
    stats.value.tasks = tasksData.total;
    stats.value.reports = 8;
    stats.value.totalCost = 1310.5;

    recentSets.value = setsData.items;
    recentTasks.value = tasksData.items;
  } catch (error) {
    console.error('加载数据失败', error);
  }
};

onMounted(() => {
  loadData();
  setTimeout(() => {
    initTaskStatusChart();
    initCostTrendChart();
  }, 100);
});
</script>

<style lang="scss" scoped>
.dashboard {
  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 20px;
  }

  .stat-card {
    display: flex;
    align-items: center;
    padding: 20px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20px;

      &.icon-blue {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #fff;
      }

      &.icon-green {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: #fff;
      }

      &.icon-orange {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: #fff;
      }

      &.icon-purple {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: #fff;
      }
    }

    .stat-content {
      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: #303133;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: #909399;
      }
    }
  }

  .chart-container {
    height: 300px;
    width: 100%;
  }

  .mt-24 {
    margin-top: 24px;
  }
}
</style>
