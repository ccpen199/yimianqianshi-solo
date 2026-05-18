<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">
        <el-button link @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        {{ customerData?.customer?.name || '客户详情' }}
      </h1>
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
        <el-col :span="8">
          <el-card>
            <template #header>基本信息</template>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="客户名称">{{ customerData?.customer?.name }}</el-descriptions-item>
              <el-descriptions-item label="行业">{{ customerData?.customer?.industry || '-' }}</el-descriptions-item>
              <el-descriptions-item label="联系人">{{ customerData?.customer?.contact_name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ customerData?.customer?.contact_email || '-' }}</el-descriptions-item>
              <el-descriptions-item label="电话">{{ customerData?.customer?.contact_phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="地址">{{ customerData?.customer?.address || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card>
            <template #header>健康度评分</template>
            <div v-if="customerData?.healthScores?.length" class="health-score-container">
              <div class="health-score-main">
                <span :class="`risk-${customerData.healthScores[0].risk_level}`" class="score-value">
                  {{ customerData.healthScores[0].overall_score || 0 }}
                </span>
                <span class="score-label">分</span>
              </div>
              <div class="health-detail">
                <div class="health-item">
                  <span class="label">使用分</span>
                  <span class="value">{{ customerData.healthScores[0].usage_score || 0 }}</span>
                </div>
                <div class="health-item">
                  <span class="label">满意度</span>
                  <span class="value">{{ customerData.healthScores[0].satisfaction_score || 0 }}</span>
                </div>
                <div class="health-item">
                  <span class="label">互动分</span>
                  <span class="value">{{ customerData.healthScores[0].engagement_score || 0 }}</span>
                </div>
              </div>
              <el-button type="primary" size="small" @click="calculateHealth" style="margin-top: 16px">重新计算</el-button>
            </div>
            <div v-else class="empty-container">
              <el-empty description="暂无健康度数据" />
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card>
            <template #header>合同信息</template>
            <div v-if="customerData?.contracts?.length">
              <div v-for="contract in customerData.contracts" :key="contract.id" class="contract-item">
                <div class="contract-header">
                  <span class="contract-no">{{ contract.contract_no || '未编号' }}</span>
                  <el-tag :type="contract.status === 'active' ? 'success' : 'info'" size="small">
                    {{ contract.status === 'active' ? '生效中' : '已终止' }}
                  </el-tag>
                </div>
                <div class="contract-detail">
                  <span>版本: {{ contract.subscription_version || '-' }}</span>
                  <span>ARR: ¥{{ (contract.arr_amount || 0).toLocaleString() }}</span>
                </div>
                <div class="contract-dates">
                  <span>到期: {{ formatDate(contract.end_date) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="empty-container">
              <el-empty description="暂无合同数据" />
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mb-4">
        <el-col :span="12">
          <el-card>
            <template #header>
              <span>风险预警</span>
              <el-badge v-if="openAlertsCount > 0" :value="openAlertsCount" class="item" type="danger" style="margin-left: 8px" />
            </template>
            <el-table :data="customerData?.risk_alerts || []" size="small">
              <el-table-column prop="type" label="类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="getSeverityTagType(row.severity)" size="small">{{ getTypeLabel(row.type) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="title" label="标题" />
              <el-table-column prop="status" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'open' ? 'warning' : 'success'" size="small">
                    {{ row.status === 'open' ? '待处理' : '已解决' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>跟进记录</template>
            <el-timeline>
              <el-timeline-item v-for="record in customerData?.follow_up_records?.slice(0, 10)" :key="record.id" :timestamp="formatDate(record.created_at)">
                <div class="followup-item">
                  <el-tag size="small" style="margin-bottom: 8px">{{ record.contact_type || '其他' }}</el-tag>
                  <p>{{ record.content }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
            <div v-if="!customerData?.follow_up_records?.length" class="empty-container">
              <el-empty description="暂无跟进记录" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { customerAPI } from '@/api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const route = useRoute()
const loading = ref(false)
const error = ref(false)
const customerData = ref(null)

const openAlertsCount = computed(() => {
  return (customerData.value?.risk_alerts || []).filter(a => a.status === 'open').length
})

const typeLabels = {
  low_usage: '使用率低',
  inactivity: '不活跃',
  contract_expiring: '合同到期',
  high_tickets: '工单过多'
}

const getSeverityTagType = (level) => {
  const map = { critical: 'danger', high: 'warning', medium: '', low: 'success' }
  return map[level] || ''
}

const getTypeLabel = (type) => typeLabels[type] || type

const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const calculateHealth = async () => {
  try {
    await customerAPI.calculateHealthScore(route.params.id)
    ElMessage.success('健康分计算完成')
    fetchData()
  } catch (err) {
    console.error('Calculate health score error:', err)
  }
}

const fetchData = async () => {
  loading.value = true
  error.value = false
  try {
    const res = await customerAPI.getDetail(route.params.id)
    customerData.value = res.data
  } catch (err) {
    console.error('Fetch customer detail error:', err)
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
.health-score-container {
  text-align: center;
  padding: 10px 0;
}
.health-score-main {
  margin-bottom: 20px;
}
.score-value {
  font-size: 48px;
  font-weight: bold;
  line-height: 1;
}
.score-label {
  font-size: 14px;
  color: #909399;
  margin-left: 4px;
}
.health-detail {
  display: flex;
  justify-content: space-around;
}
.health-item {
  text-align: center;
}
.health-item .label {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}
.health-item .value {
  font-size: 18px;
  font-weight: 500;
}
.contract-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 12px;
}
.contract-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.contract-no {
  font-weight: 500;
}
.contract-detail {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}
.contract-dates {
  font-size: 12px;
  color: #f56c6c;
}
.followup-item p {
  margin: 0;
  font-size: 14px;
  color: #606266;
}
</style>
