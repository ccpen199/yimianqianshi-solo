<template>
  <div class="model-tasks">
    <div class="page-header flex-between">
      <div>
        <h1 class="page-title">模型任务</h1>
        <p class="page-subtitle">管理模型评测任务的执行和状态</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新建任务
      </el-button>
    </div>

    <div class="card-wrapper">
      <el-table
        v-loading="loading"
        :data="tableData"
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="name" label="任务名称" min-width="200" />
        <el-table-column prop="modelName" label="模型名称" width="150" />
        <el-table-column prop="modelVersion" label="模型版本" width="120" />
        <el-table-column label="进度" width="200">
          <template #default="scope">
            <el-progress
              :percentage="getProgress(scope.row)"
              :status="scope.row.status === 'failed' ? 'exception' : undefined"
            />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button link type="primary" size="small" @click.stop="goToDetail(scope.row.id)">
              查看详情
            </el-button>
            <el-button
              v-if="scope.row.status === 'pending'"
              link
              type="success"
              size="small"
              @click.stop="startTask(scope.row)"
            >
              启动
            </el-button>
            <el-button
              v-if="scope.row.status === 'running'"
              link
              type="warning"
              size="small"
              @click.stop="pauseTask(scope.row)"
            >
              暂停
            </el-button>
            <el-button link type="danger" size="small" @click.stop="handleDelete(scope.row)">
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
      title="新建任务"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="form" label-width="120px">
        <el-form-item label="任务名称" required>
          <el-input v-model="form.name" placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="评测集" required>
          <el-select v-model="form.evaluationSetId" style="width: 100%" placeholder="请选择评测集">
            <el-option
              v-for="set in evaluationSets"
              :key="set.id"
              :label="set.name"
              :value="set.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="模型名称" required>
          <el-input v-model="form.modelName" placeholder="请输入模型名称" />
        </el-form-item>
        <el-form-item label="模型版本" required>
          <el-input v-model="form.modelVersion" placeholder="请输入模型版本" />
        </el-form-item>
        <el-form-item label="提示词版本">
          <el-input v-model="form.promptVersion" placeholder="请输入提示词版本" />
        </el-form-item>
        <el-form-item label="并发限制">
          <el-input-number v-model="form.concurrencyLimit" :min="1" :max="100" />
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import { getEvaluationSets, type EvaluationSet } from '@/api/evaluation-sets';
import {
  getModelTasks,
  createModelTask,
  deleteModelTask,
  startModelTask as apiStartTask,
  pauseModelTask as apiPauseTask,
  type ModelTask,
} from '@/api/model-tasks';

const router = useRouter();
const loading = ref(false);
const submitting = ref(false);
const dialogVisible = ref(false);
const tableData = ref<ModelTask[]>([]);
const evaluationSets = ref<EvaluationSet[]>([]);

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
});

const form = reactive({
  name: '',
  evaluationSetId: '',
  modelName: '',
  modelVersion: '',
  promptVersion: '',
  concurrencyLimit: 1,
});

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const getProgress = (row: ModelTask) => {
  if (row.totalSamples === 0) return 0;
  return Math.round(((row.completedSamples || 0) / row.totalSamples) * 100);
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

const loadData = async () => {
  loading.value = true;
  try {
    const result = await getModelTasks({
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

const loadEvaluationSets = async () => {
  try {
    const result = await getEvaluationSets({ page: 1, pageSize: 100 });
    evaluationSets.value = result.items;
  } catch (error) {
    console.error('加载评测集失败', error);
  }
};

const openCreateDialog = () => {
  dialogVisible.value = true;
};

const resetForm = () => {
  form.name = '';
  form.evaluationSetId = '';
  form.modelName = '';
  form.modelVersion = '';
  form.promptVersion = '';
  form.concurrencyLimit = 1;
};

const handleSubmit = async () => {
  if (!form.name || !form.evaluationSetId || !form.modelName || !form.modelVersion) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  submitting.value = true;
  try {
    await createModelTask(form);
    ElMessage.success('创建成功');
    dialogVisible.value = false;
    loadData();
  } catch (error) {
    console.error('创建失败', error);
  } finally {
    submitting.value = false;
  }
};

const handleRowClick = (row: ModelTask) => {
  goToDetail(row.id);
};

const goToDetail = (id: string) => {
  router.push(`/model-tasks/${id}`);
};

const startTask = async (row: ModelTask) => {
  try {
    await apiStartTask(row.id);
    ElMessage.success('任务已启动');
    loadData();
  } catch (error) {
    console.error('启动失败', error);
  }
};

const pauseTask = async (row: ModelTask) => {
  try {
    await apiPauseTask(row.id);
    ElMessage.success('任务已暂停');
    loadData();
  } catch (error) {
    console.error('暂停失败', error);
  }
};

const handleDelete = async (row: ModelTask) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务"${row.name}"吗？`, '提示', {
      type: 'warning',
    });

    await deleteModelTask(row.id);
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
  loadEvaluationSets();
});
</script>

<style lang="scss" scoped>
.model-tasks {
  .pagination-wrapper {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
