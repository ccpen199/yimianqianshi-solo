<template>
  <div class="evaluation-sets">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">评测集管理</h1>
        <p class="page-subtitle">管理评测题目、参考答案和评分维度</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新建评测集
      </el-button>
    </div>

    <div class="card-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="name" label="评测集名称" min-width="200" />
        <el-table-column prop="businessScenario" label="业务场景" min-width="150">
          <template #default="scope">
            <el-tag v-if="scope.row.businessScenario" size="small" type="info">
              {{ scope.row.businessScenario }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="题目数量" width="120">
          <template #default="scope">
            {{ scope.row._count?.questions || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="关联任务" width="120">
          <template #default="scope">
            {{ scope.row._count?.tasks || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="isFrozen" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.isFrozen ? 'success' : 'info'" size="small">
              {{ scope.row.isFrozen ? '已冻结' : '未冻结' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button link type="primary" size="small" @click.stop="goToDetail(scope.row.id)">
              查看详情
            </el-button>
            <el-button
              v-if="!scope.row.isFrozen"
              link
              type="danger"
              size="small"
              @click.stop="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      title="新建评测集"
      width="600px"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" label-width="100px">
        <el-form-item label="评测集名称" prop="name" required>
          <el-input v-model="form.name" placeholder="请输入评测集名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
        <el-form-item label="业务场景" prop="businessScenario">
          <el-input v-model="form.businessScenario" placeholder="请输入业务场景" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import {
  getEvaluationSets,
  createEvaluationSet,
  deleteEvaluationSet,
  type EvaluationSet,
} from '@/api/evaluation-sets';

const router = useRouter();
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();

const tableData = ref<EvaluationSet[]>([]);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const form = reactive({
  name: '',
  description: '',
  businessScenario: '',
});

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const loadData = async () => {
  loading.value = true;
  try {
    const result = await getEvaluationSets({
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    tableData.value = result.items;
    pagination.total = result.total;
  } catch (error) {
    console.error('加载数据失败', error);
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = () => {
  dialogVisible.value = true;
};

const resetForm = () => {
  form.name = '';
  form.description = '';
  form.businessScenario = '';
  formRef.value?.resetFields();
};

const handleSubmit = async () => {
  if (!form.name) {
    ElMessage.warning('请输入评测集名称');
    return;
  }

  submitting.value = true;
  try {
    await createEvaluationSet(form);
    ElMessage.success('创建成功');
    dialogVisible.value = false;
    loadData();
  } catch (error) {
    console.error('创建失败', error);
  } finally {
    submitting.value = false;
  }
};

const handleRowClick = (row: EvaluationSet) => {
  goToDetail(row.id);
};

const goToDetail = (id: string) => {
  router.push(`/evaluation-sets/${id}`);
};

const handleDelete = async (row: EvaluationSet) => {
  try {
    await ElMessageBox.confirm(`确定要删除评测集"${row.name}"吗？`, '提示', {
      type: 'warning',
    });

    await deleteEvaluationSet(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败', error);
    }
  }
};

onMounted(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.evaluation-sets {
  .pagination-wrapper {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
