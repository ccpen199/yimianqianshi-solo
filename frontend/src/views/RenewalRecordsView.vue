<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">续费记录</h1>
    </div>

    <el-card v-loading="loading">
      <el-table :data="recordList" style="width: 100%">
        <el-table-column prop="customer_name" label="客户名称" width="150" />
        <el-table-column prop="renewal_amount" label="续费金额" width="120">
          <template #default="{ row }">
            ¥{{ (row.renewal_amount || 0).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="discount_rate" label="折扣率" width="100">
          <template #default="{ row }">
            {{ row.discount_rate || 0 }}%
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="finance_verified" label="财务确认" width="100">
          <template #default="{ row }">
            <el-tag :type="row.finance_verified ? 'success' : 'info'" size="small">
              {{ row.finance_verified ? '已确认' : '待确认' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="churn_reason" label="流失原因" show-overflow-tooltip />
        <el-table-column prop="previous_end_date" label="原到期日" width="120">
          <template #default="{ row }">
            {{ formatDate(row.previous_end_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="new_end_date" label="新到期日" width="120">
          <template #default="{ row }">
            {{ formatDate(row.new_end_date) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'pending_verification'" link type="success" size="small" @click="verifyRenewal(row.id, true)">确认</el-button>
            <el-button v-if="row.status === 'pending_verification'" link type="danger" size="small" @click="verifyRenewal(row.id, false)">驳回</el-button>
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
import { renewalRecordAPI } from '@/api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false)
const recordList = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const getStatusType = (status) => {
  const map = { completed: 'success', pending: 'warning', rejected: 'danger', pending_verification: '', churned: 'info' }
  return map[status] || 'info'
}

const getStatusLabel = (status) => {
  const map = { completed: '已完成', pending: '处理中', rejected: '已拒绝', pending_verification: '待审核', churned: '已流失' }
  return map[status] || status
}

const formatDate = (date) => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

const verifyRenewal = async (id, verified) => {
  try {
    await renewalRecordAPI.verify(id, { verified, notes: verified ? '财务确认通过' : '财务驳回' })
    ElMessage.success(verified ? '已确认续费' : '已驳回续费')
    fetchData()
  } catch (err) {
    console.error('Verify renewal error:', err)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await renewalRecordAPI.getList({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    recordList.value = res.data || []
    pagination.total = res.pagination?.total || 0
  } catch (err) {
    console.error('Fetch renewal records error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
