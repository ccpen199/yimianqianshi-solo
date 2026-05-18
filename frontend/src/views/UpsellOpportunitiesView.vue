<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">增购机会</h1>
    </div>

    <el-card v-loading="loading">
      <el-table :data="customerList" style="width: 100%">
        <el-table-column prop="name" label="客户名称" width="180" />
        <el-table-column prop="industry" label="行业" width="120" />
        <el-table-column prop="health_score" label="健康分" width="100">
          <template #default="{ row }">
            <el-tag :type="getRiskTagType(row.risk_level)" size="small">
              {{ row.health_score || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="arr_amount" label="当前ARR" width="120">
          <template #default="{ row }">
            ¥{{ (row.arr_amount || 0).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="seats_count" label="席位数量" width="100" />
        <el-table-column prop="subscription_version" label="版本" width="100" />
        <el-table-column prop="end_date" label="合同到期日" width="150">
          <template #default="{ row }">
            {{ formatDate(row.end_date) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goToDetail(row.id)">查看详情</el-button>
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
import { dashboardAPI } from '@/api'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const customerList = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const getRiskTagType = (level) => {
  const map = { critical: 'danger', high: 'warning', medium: '', low: 'success' }
  return map[level] || ''
}

const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const goToDetail = (id) => {
  router.push(`/customers/${id}`)
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await dashboardAPI.getUpsellOpportunities({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    customerList.value = res.data || []
    pagination.total = res.pagination?.total || 0
  } catch (err) {
    console.error('Fetch upsell opportunities error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
