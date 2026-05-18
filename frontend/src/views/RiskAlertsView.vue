<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">风险预警</h1>
      <el-select v-model="filterStatus" placeholder="状态筛选" style="width: 150px" @change="fetchData">
        <el-option label="全部" value="" />
        <el-option label="待处理" value="open" />
        <el-option label="已解决" value="resolved" />
      </el-select>
    </div>

    <el-card v-loading="loading">
      <el-table :data="alertList" style="width: 100%">
        <el-table-column prop="type" label="风险类型" width="150">
          <template #default="{ row }">
            <el-tag :type="getSeverityTagType(row.severity)" size="small">{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="customer_name" label="客户名称" width="150" />
        <el-table-column prop="severity" label="严重程度" width="100">
          <template #default="{ row }">
            <el-tag :type="getSeverityTagType(row.severity)" size="small">{{ getSeverityLabel(row.severity) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'open' ? 'warning' : 'success'" size="small">
              {{ row.status === 'open' ? '待处理' : '已解决' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goToCustomer(row.customer_id)">查看客户</el-button>
            <el-button v-if="row.status === 'open'" link type="success" size="small" @click="resolveAlert(row.id)">标记解决</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-if="pagination.total > 0"
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        style="margin-top: 20px; justify-content: flex-end"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { riskAlertAPI } from '@/api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const filterStatus = ref('')
const alertList = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const typeLabels = {
  low_usage: '使用率低',
  inactivity: '长期不活跃',
  contract_expiring: '合同即将到期',
  high_tickets: '工单过多'
}

const severityLabels = {
  critical: '极高',
  high: '高',
  medium: '中',
  low: '低'
}

const getTypeLabel = (type) => typeLabels[type] || type
const getSeverityLabel = (level) => severityLabels[level] || level
const getSeverityTagType = (level) => {
  const map = { critical: 'danger', high: 'warning', medium: '', low: 'success' }
  return map[level] || ''
}

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

const goToCustomer = (id) => {
  router.push(`/customers/${id}`)
}

const resolveAlert = async (id) => {
  try {
    await riskAlertAPI.resolve(id, { resolutionNotes: '已处理' })
    ElMessage.success('已标记为解决')
    fetchData()
  } catch (err) {
    console.error('Resolve alert error:', err)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await riskAlertAPI.getList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filterStatus.value || undefined
    })
    alertList.value = res.data || []
    pagination.total = res.pagination?.total || 0
  } catch (err) {
    console.error('Fetch alerts error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
