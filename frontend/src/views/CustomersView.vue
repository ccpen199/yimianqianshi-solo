<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">客户管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新增客户
      </el-button>
    </div>

    <el-card v-loading="loading">
      <el-table :data="customerList" style="width: 100%">
        <el-table-column prop="name" label="客户名称" />
        <el-table-column prop="industry" label="行业" />
        <el-table-column prop="contact_name" label="联系人" />
        <el-table-column prop="contact_email" label="邮箱" />
        <el-table-column prop="health_score" label="健康分" width="100">
          <template #default="{ row }">
            <el-tag :type="getRiskTagType(row.risk_level)" size="small">
              {{ row.health_score || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '活跃' : '非活跃' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goToDetail(row.id)">查看详情</el-button>
            <el-button link type="primary" size="small" @click="calculateHealth(row.id)">计算健康分</el-button>
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

    <el-dialog v-model="showCreateDialog" title="新增客户" width="500px">
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="客户名称" required>
          <el-input v-model="createForm.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="行业">
          <el-input v-model="createForm.industry" placeholder="请输入行业" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="createForm.contactName" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="createForm.contactEmail" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="createForm.contactPhone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="createForm.address" type="textarea" placeholder="请输入地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { customerAPI } from '@/api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const showCreateDialog = ref(false)
const customerList = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const createForm = reactive({
  name: '',
  industry: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  address: ''
})

const getRiskTagType = (level) => {
  const map = { critical: 'danger', high: 'warning', medium: '', low: 'success' }
  return map[level] || ''
}

const goToDetail = (id) => {
  router.push(`/customers/${id}`)
}

const calculateHealth = async (customerId) => {
  try {
    await customerAPI.calculateHealthScore(customerId)
    ElMessage.success('健康分计算完成')
    fetchData()
  } catch (err) {
    console.error('Calculate health score error:', err)
  }
}

const handleCreate = async () => {
  if (!createForm.name.trim()) {
    ElMessage.warning('请输入客户名称')
    return
  }
  
  submitting.value = true
  try {
    await customerAPI.create(createForm)
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    Object.assign(createForm, {
      name: '',
      industry: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      address: ''
    })
    fetchData()
  } catch (err) {
    console.error('Create customer error:', err)
  } finally {
    submitting.value = false
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await customerAPI.getList({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    customerList.value = res.data || []
    pagination.total = res.pagination?.total || 0
  } catch (err) {
    console.error('Fetch customers error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
