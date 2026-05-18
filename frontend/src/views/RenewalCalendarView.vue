<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">续费日历</h1>
      <el-button type="primary" @click="generateTasks">
        <el-icon><Refresh /></el-icon>
        生成续费任务
      </el-button>
    </div>

    <el-row :gutter="20" v-loading="loading">
      <el-col :span="8">
        <el-card class="calendar-group-card">
          <template #header>
            <div class="group-header critical">
              <span>30天内到期</span>
              <el-badge :value="calendarData?.['0_30_days']?.length || 0" class="item" type="danger" />
            </div>
          </template>
          <div v-if="!calendarData?.['0_30_days']?.length" class="empty-container">
            <el-empty description="暂无数据" :image-size="80" />
          </div>
          <div v-else class="task-list">
            <div v-for="task in calendarData['0_30_days']" :key="task.id" class="task-item" @click="goToCustomer(task.customer_id)">
              <div class="task-customer">{{ task.customer_name }}</div>
              <div class="task-info">
                <span>ARR: ¥{{ (task.arr_amount || 0).toLocaleString() }}</span>
                <span class="days-ago">{{ task.daysUntilExpiry }}天后到期</span>
              </div>
              <el-tag :type="getRiskTagType(task.risk_level)" size="small" style="margin-top: 8px">
                健康分: {{ task.health_score || '-' }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="calendar-group-card">
          <template #header>
            <div class="group-header high">
              <span>31-60天到期</span>
              <el-badge :value="calendarData?.['31_60_days']?.length || 0" class="item" type="warning" />
            </div>
          </template>
          <div v-if="!calendarData?.['31_60_days']?.length" class="empty-container">
            <el-empty description="暂无数据" :image-size="80" />
          </div>
          <div v-else class="task-list">
            <div v-for="task in calendarData['31_60_days']" :key="task.id" class="task-item" @click="goToCustomer(task.customer_id)">
              <div class="task-customer">{{ task.customer_name }}</div>
              <div class="task-info">
                <span>ARR: ¥{{ (task.arr_amount || 0).toLocaleString() }}</span>
                <span class="days-ago">{{ task.daysUntilExpiry }}天后到期</span>
              </div>
              <el-tag :type="getRiskTagType(task.risk_level)" size="small" style="margin-top: 8px">
                健康分: {{ task.health_score || '-' }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="calendar-group-card">
          <template #header>
            <div class="group-header medium">
              <span>61-90天到期</span>
              <el-badge :value="calendarData?.['61_90_days']?.length || 0" class="item" />
            </div>
          </template>
          <div v-if="!calendarData?.['61_90_days']?.length" class="empty-container">
            <el-empty description="暂无数据" :image-size="80" />
          </div>
          <div v-else class="task-list">
            <div v-for="task in calendarData['61_90_days']" :key="task.id" class="task-item" @click="goToCustomer(task.customer_id)">
              <div class="task-customer">{{ task.customer_name }}</div>
              <div class="task-info">
                <span>ARR: ¥{{ (task.arr_amount || 0).toLocaleString() }}</span>
                <span class="days-ago">{{ task.daysUntilExpiry }}天后到期</span>
              </div>
              <el-tag :type="getRiskTagType(task.risk_level)" size="small" style="margin-top: 8px">
                健康分: {{ task.health_score || '-' }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { renewalAPI } from '@/api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const calendarData = ref({
  '0_30_days': [],
  '31_60_days': [],
  '61_90_days': []
})

const getRiskTagType = (level) => {
  const map = { critical: 'danger', high: 'warning', medium: '', low: 'success' }
  return map[level] || ''
}

const goToCustomer = (id) => {
  router.push(`/customers/${id}`)
}

const generateTasks = async () => {
  loading.value = true
  try {
    const res = await renewalAPI.generateTasks()
    ElMessage.success(`已生成 ${res.data?.length || 0} 个续费任务`)
    fetchCalendar()
  } catch (err) {
    console.error('Generate tasks error:', err)
  } finally {
    loading.value = false
  }
}

const fetchCalendar = async () => {
  loading.value = true
  try {
    const res = await renewalAPI.getCalendar()
    calendarData.value = res.data?.grouped || {}
  } catch (err) {
    console.error('Fetch calendar error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCalendar()
})
</script>

<style scoped>
.calendar-group-card {
  min-height: 400px;
}
.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
}
.group-header.critical {
  color: #f56c6c;
}
.group-header.high {
  color: #e6a23c;
}
.group-header.medium {
  color: #409eff;
}
.task-list {
  max-height: 350px;
  overflow-y: auto;
}
.task-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.task-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}
.task-customer {
  font-weight: 500;
  font-size: 14px;
  color: #303133;
  margin-bottom: 8px;
}
.task-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}
.days-ago {
  color: #f56c6c;
  font-weight: 500;
}
</style>
