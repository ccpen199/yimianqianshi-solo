<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">数据看板</h1>
    </div>

    <div v-if="loading" class="loading-container">
      <el-loading fullscreen-text="加载中..." />
    </div>

    <div v-else-if="error" class="error-container">
      <el-empty description="加载失败">
        <el-button type="primary" @click="fetchData">重试</el-button>
      </el-empty>
    </div>

    <div v-else>
      <el-row :gutter="20" class="mb-4">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">{{ stats?.overview?.totalCustomers || 0 }}</div>
            <div class="stat-label">活跃客户数</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value">¥{{ formatNumber(stats?.overview?.totalARR || 0) }}</div>
            <div class="stat-label">总ARR</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value text-danger">{{ stats?.overview?.openRiskAlerts || 0 }}</div>
            <div class="stat-label">待处理风险预警</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-value text-warning">{{ stats?.overview?.pendingRenewals || 0 }}</div>
            <div class="stat-label">待处理续费任务</div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mb-4">
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-title">即将到期合同</div>
            </template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="0-30天到期">
                <span class="risk-critical">{{ stats?.expiringByPeriod?.['0_30_days']?.count || 0 }}个</span>
                <div style="font-size: 12px; color: #909399">
                  ARR: ¥{{ formatNumber(stats?.expiringByPeriod?.['0_30_days']?.arr || 0) }}
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="31-60天到期">
                <span class="risk-high">{{ stats?.expiringByPeriod?.['31_60_days']?.count || 0 }}个</span>
                <div style="font-size: 12px; color: #909399">
                  ARR: ¥{{ formatNumber(stats?.expiringByPeriod?.['31_60_days']?.arr || 0) }}
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="61-90天到期">
                <span class="risk-medium">{{ stats?.expiringByPeriod?.['61_90_days']?.count || 0 }}个</span>
                <div style="font-size: 12px; color: #909399">
                  ARR: ¥{{ formatNumber(stats?.expiringByPeriod?.['61_90_days']?.arr || 0) }}
                </div>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-title">客户健康度分布</div>
            </template>
            <div v-if="!stats?.healthDistribution" class="empty-container">
              <el-empty description="暂无数据" />
            </div>
            <div v-else style="display: flex; justify-content: space-around; align-items: center; padding: 20px">
              <div v-for="(label, risk) in riskLabels" :key="risk" class="text-center">
                <div :class="`risk-${risk}`" style="font-size: 28px">
                  {{ stats.healthDistribution[risk] || 0 }}
                </div>
                <div style="font-size: 14px; color: #909399; margin-top: 8px">{{ label }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mb-4">
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="flex justify-between items-center">
                <span class="card-title">高风险客户 TOP 10</span>
                <el-button type="primary" link @click="$router.push('/high-risk')">查看全部</el-button>
              </div>
            </template>
            <el-table :data="stats?.topRiskCustomers || []" size="small">
              <el-table-column prop="name" label="客户名称" />
              <el-table-column prop="health_score" label="健康分">
                <template #default="{ row }">
                  <el-tag :type="getRiskTagType(row.risk_level)">{{ row.health_score || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="alert_count" label="风险数" width="80">
                <template #default="{ row }">
                  <el-badge :value="row.alert_count" class="item" type="danger" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="goToCustomer(row.id)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="flex justify-between items-center">
                <span class="card-title">最近续费记录</span>
                <el-button type="primary" link @click="$router.push('/renewal-records')">查看全部</el-button>
              </div>
            </template>
            <el-table :data="stats?.recentRenewals || []" size="small">
              <el-table-column prop="customer_name" label="客户名称" />
              <el-table-column prop="renewal_amount" label="续费金额" formatter="formatCurrency" />
              <el-table-column prop="status" label="状态">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dashboardAPI } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(true)
const error = ref(false)
const stats = ref(null)

const riskLabels = {
  critical: '极高风险',
  high: '高风险',
  medium: '中风险',
  low: '低风险'
}

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString()
}

const getRiskTagType = (level) => {
  const map = { critical: 'danger', high: 'warning', medium: '', low: 'success' }
  return map[level] || ''
}

const getStatusType = (status) => {
  const map = { completed: 'success', pending: 'warning', rejected: 'danger', pending_verification: '' }
  return map[status] || 'info'
}

const getStatusLabel = (status) => {
  const map = { completed: '已完成', pending: '处理中', rejected: '已拒绝', pending_verification: '待审核' }
  return map[status] || status
}

const goToCustomer = (id) => {
  router.push(`/customers/${id}`)
}

const fetchData = async () => {
  loading.value = true
  error.value = false
  try {
    const res = await dashboardAPI.getStats()
    stats.value = res.data
  } catch (err) {
    console.error('Fetch dashboard stats error:', err)
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.text-danger {
  color: #f56c6c;
}
.text-warning {
  color: #e6a23c;
}
</style>
