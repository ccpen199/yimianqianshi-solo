<template>
  <div class="evaluation-set-detail">
    <div class="page-header">
      <div class="flex-between">
        <div>
          <el-button link @click="$router.back()" style="padding: 0; margin-bottom: 8px">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <h1 class="page-title">{{ evaluationSet?.name }}</h1>
          <p class="page-subtitle">{{ evaluationSet?.description || '暂无描述' }}</p>
        </div>
        <div>
          <el-button
            v-if="!evaluationSet?.isFrozen"
            type="success"
            @click="handleFreeze"
          >
            <el-icon><Lock /></el-icon>
            冻结版本
          </el-button>
          <el-button v-else type="warning" @click="handleUnfreeze">
            <el-icon><Unlock /></el-icon>
            解除冻结
          </el-button>
        </div>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="detail-tabs">
      <el-tab-pane label="题目管理" name="questions">
        <div class="card-wrapper">
          <div class="flex-between mb-16">
            <h3>题目列表</h3>
            <el-button
              type="primary"
              size="small"
              :disabled="evaluationSet?.isFrozen"
              @click="openQuestionDialog"
            >
              <el-icon><Plus /></el-icon>
              添加题目
            </el-button>
          </div>
          <el-alert
            v-if="evaluationSet?.isFrozen"
            title="评测集已冻结，无法编辑题目"
            type="info"
            :closable="false"
            class="mb-16"
          />
          <el-empty v-if="!questions.length" description="暂无题目" />
          <div v-else class="question-list">
            <div v-for="question in questions" :key="question.id" class="question-item">
              <div class="question-header flex-between">
                <span class="question-title">{{ question.title }}</span>
                <div class="question-actions">
                  <el-tag size="small" type="info">难度: {{ question.difficulty }}</el-tag>
                  <el-button
                    v-if="!evaluationSet?.isFrozen"
                    link
                    type="danger"
                    size="small"
                    @click="deleteQuestion(question)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
              <div class="question-content">{{ question.content }}</div>
              <div v-if="question.referenceAnswer" class="question-reference">
                <span class="label">参考答案:</span>
                <span class="value">{{ question.referenceAnswer }}</span>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="评分维度" name="dimensions">
        <div class="card-wrapper">
          <div class="flex-between mb-16">
            <h3>评分维度列表</h3>
            <el-button
              type="primary"
              size="small"
              :disabled="evaluationSet?.isFrozen"
              @click="openDimensionDialog"
            >
              <el-icon><Plus /></el-icon>
              添加维度
            </el-button>
          </div>
          <el-alert
            v-if="evaluationSet?.isFrozen"
            title="评测集已冻结，无法编辑评分维度"
            type="info"
            :closable="false"
            class="mb-16"
          />
          <el-empty v-if="!dimensions.length" description="暂无评分维度" />
          <el-table v-else :data="dimensions" style="width: 100%">
            <el-table-column prop="name" label="维度名称" min-width="150" />
            <el-table-column prop="description" label="描述" min-width="200">
              <template #default="scope">
                {{ scope.row.description || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="weight" label="权重" width="100" />
            <el-table-column prop="maxScore" label="最高分" width="100" />
            <el-table-column label="操作" width="120" v-if="!evaluationSet?.isFrozen">
              <template #default="scope">
                <el-button link type="danger" size="small" @click="deleteDimension(scope.row)">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="版本历史" name="versions">
        <div class="card-wrapper">
          <h3>版本历史</h3>
          <el-empty v-if="!versions.length" description="暂无版本记录" />
          <el-timeline v-else>
            <el-timeline-item
              v-for="version in versions"
              :key="version.id"
              :timestamp="formatDate(version.createdAt)"
              placement="top"
            >
              <el-card>
                <h4>{{ version.version }}</h4>
                <p>{{ version.description || '无描述' }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="questionDialogVisible" title="添加题目" width="700px">
      <el-form :model="questionForm" label-width="100px">
        <el-form-item label="题目标题" required>
          <el-input v-model="questionForm.title" placeholder="请输入题目标题" />
        </el-form-item>
        <el-form-item label="题目内容" required>
          <el-input
            v-model="questionForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入题目内容"
          />
        </el-form-item>
        <el-form-item label="参考答案">
          <el-input
            v-model="questionForm.referenceAnswer"
            type="textarea"
            :rows="3"
            placeholder="请输入参考答案"
          />
        </el-form-item>
        <el-form-item label="难度">
          <el-select v-model="questionForm.difficulty" style="width: 100%">
            <el-option label="简单" value="easy" />
            <el-option label="中等" value="medium" />
            <el-option label="困难" value="hard" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="questionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitQuestion">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dimensionDialogVisible" title="添加评分维度" width="600px">
      <el-form :model="dimensionForm" label-width="100px">
        <el-form-item label="维度名称" required>
          <el-input v-model="dimensionForm.name" placeholder="请输入维度名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="dimensionForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>
        <el-form-item label="权重">
          <el-input-number v-model="dimensionForm.weight" :min="0" :max="10" :step="0.1" />
        </el-form-item>
        <el-form-item label="最高分">
          <el-input-number v-model="dimensionForm.maxScore" :min="1" :max="100" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dimensionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitDimension">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="freezeDialogVisible" title="冻结版本" width="500px">
      <el-form :model="freezeForm" label-width="100px">
        <el-form-item label="版本号">
          <el-input v-model="freezeForm.version" placeholder="v1.0.0" />
        </el-form-item>
        <el-form-item label="版本描述">
          <el-input
            v-model="freezeForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入版本描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="freezeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmFreeze">确定冻结</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Plus, Lock, Unlock } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import {
  getEvaluationSet,
  freezeEvaluationSet,
  unfreezeEvaluationSet,
  addQuestion,
  deleteQuestion as apiDeleteQuestion,
  addDimension,
  deleteDimension as apiDeleteDimension,
  type EvaluationSet,
  type Question,
  type Dimension,
} from '@/api/evaluation-sets';

const route = useRoute();
const evaluationSetId = route.params.id as string;

const activeTab = ref('questions');
const evaluationSet = ref<EvaluationSet | null>(null);
const questions = ref<Question[]>([]);
const dimensions = ref<Dimension[]>([]);
const versions = ref<any[]>([]);

const questionDialogVisible = ref(false);
const dimensionDialogVisible = ref(false);
const freezeDialogVisible = ref(false);

const questionForm = reactive({
  title: '',
  content: '',
  referenceAnswer: '',
  difficulty: 'medium',
});

const dimensionForm = reactive({
  name: '',
  description: '',
  weight: 1,
  maxScore: 100,
});

const freezeForm = reactive({
  version: '',
  description: '',
});

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const loadData = async () => {
  try {
    const data = await getEvaluationSet(evaluationSetId);
    evaluationSet.value = data;
    questions.value = data.questions || [];
    dimensions.value = data.dimensions || [];
    versions.value = data.versions || [];
  } catch (error) {
    console.error('加载数据失败', error);
  }
};

const openQuestionDialog = () => {
  questionForm.title = '';
  questionForm.content = '';
  questionForm.referenceAnswer = '';
  questionForm.difficulty = 'medium';
  questionDialogVisible.value = true;
};

const submitQuestion = async () => {
  if (!questionForm.title || !questionForm.content) {
    ElMessage.warning('请填写完整信息');
    return;
  }

  try {
    await addQuestion(evaluationSetId, questionForm);
    ElMessage.success('添加成功');
    questionDialogVisible.value = false;
    loadData();
  } catch (error) {
    console.error('添加失败', error);
  }
};

const deleteQuestion = async (question: Question) => {
  try {
    await ElMessageBox.confirm(`确定要删除题目"${question.title}"吗？`, '提示', {
      type: 'warning',
    });
    await apiDeleteQuestion(question.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败', error);
    }
  }
};

const openDimensionDialog = () => {
  dimensionForm.name = '';
  dimensionForm.description = '';
  dimensionForm.weight = 1;
  dimensionForm.maxScore = 100;
  dimensionDialogVisible.value = true;
};

const submitDimension = async () => {
  if (!dimensionForm.name) {
    ElMessage.warning('请输入维度名称');
    return;
  }

  try {
    await addDimension(evaluationSetId, dimensionForm);
    ElMessage.success('添加成功');
    dimensionDialogVisible.value = false;
    loadData();
  } catch (error) {
    console.error('添加失败', error);
  }
};

const deleteDimension = async (dimension: Dimension) => {
  try {
    await ElMessageBox.confirm(`确定要删除维度"${dimension.name}"吗？`, '提示', {
      type: 'warning',
    });
    await apiDeleteDimension(dimension.id);
    ElMessage.success('删除成功');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败', error);
    }
  }
};

const handleFreeze = () => {
  freezeForm.version = `v${Date.now().toString().slice(-6)}`;
  freezeForm.description = '';
  freezeDialogVisible.value = true;
};

const confirmFreeze = async () => {
  try {
    await freezeEvaluationSet(evaluationSetId, freezeForm);
    ElMessage.success('冻结成功');
    freezeDialogVisible.value = false;
    loadData();
  } catch (error) {
    console.error('冻结失败', error);
  }
};

const handleUnfreeze = async () => {
  try {
    await ElMessageBox.confirm('确定要解除冻结吗？解除后可以编辑评测集', '提示', {
      type: 'warning',
    });
    await unfreezeEvaluationSet(evaluationSetId);
    ElMessage.success('已解除冻结');
    loadData();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('解除冻结失败', error);
    }
  }
};

onMounted(() => {
  loadData();
});
</script>

<style lang="scss" scoped>
.evaluation-set-detail {
  .detail-tabs {
    :deep(.el-tabs__content) {
      padding-top: 0;
    }
  }

  .question-list {
    .question-item {
      padding: 16px;
      border: 1px solid #ebeef5;
      border-radius: 8px;
      margin-bottom: 12px;

      &:last-child {
        margin-bottom: 0;
      }

      .question-header {
        margin-bottom: 12px;

        .question-title {
          font-size: 16px;
          font-weight: 600;
          color: #303133;
        }

        .question-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      }

      .question-content {
        color: #606266;
        line-height: 1.6;
        margin-bottom: 12px;
        padding: 12px;
        background: #f5f7fa;
        border-radius: 4px;
      }

      .question-reference {
        display: flex;
        gap: 8px;
        color: #67c23a;
        font-size: 14px;

        .label {
          font-weight: 500;
        }
      }
    }
  }
}
</style>
