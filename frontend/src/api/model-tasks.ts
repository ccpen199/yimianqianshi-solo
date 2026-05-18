import { request } from '@/utils/request';
import type { EvaluationSet } from './evaluation-sets';

export interface ModelTask {
  id: string;
  name: string;
  modelName: string;
  modelVersion: string;
  promptVersion?: string;
  parameters?: string;
  concurrencyLimit: number;
  status: string;
  progress: number;
  totalSamples: number;
  completedSamples: number;
  failedSamples: number;
  startedAt?: string;
  completedAt?: string;
  failedReason?: string;
  evaluationSetId: string;
  evaluationSet?: EvaluationSet;
  createdAt: string;
  updatedAt: string;
  samples?: TaskSample[];
  _count?: { samples: number };
}

export interface TaskSample {
  id: string;
  taskId: string;
  questionId: string;
  modelOutput?: string;
  status: string;
  latencyMs?: number;
  startedAt?: string;
  completedAt?: string;
  failedReason?: string;
  retryCount: number;
  lastRetryAt?: string;
  inputTokenCount: number;
  outputTokenCount: number;
  createdAt: string;
  updatedAt: string;
  question?: any;
  scores?: any[];
  reviews?: any[];
}

export interface CreateModelTaskDto {
  name: string;
  modelName: string;
  modelVersion: string;
  promptVersion?: string;
  parameters?: string;
  concurrencyLimit?: number;
  evaluationSetId: string;
}

export function getModelTasks(params: { page?: number; pageSize?: number; status?: string }) {
  return request<{ items: ModelTask[]; total: number; page: number; pageSize: number }>({
    url: '/model-tasks',
    method: 'GET',
    params,
  });
}

export function getModelTask(id: string) {
  return request<ModelTask>({
    url: `/model-tasks/${id}`,
    method: 'GET',
  });
}

export function createModelTask(data: CreateModelTaskDto) {
  return request<ModelTask>({
    url: '/model-tasks',
    method: 'POST',
    data,
  });
}

export function updateModelTask(id: string, data: Partial<CreateModelTaskDto>) {
  return request<ModelTask>({
    url: `/model-tasks/${id}`,
    method: 'PUT',
    data,
  });
}

export function deleteModelTask(id: string) {
  return request({
    url: `/model-tasks/${id}`,
    method: 'DELETE',
  });
}

export function startModelTask(id: string) {
  return request({
    url: `/model-tasks/${id}/start`,
    method: 'POST',
  });
}

export function pauseModelTask(id: string) {
  return request({
    url: `/model-tasks/${id}/pause`,
    method: 'POST',
  });
}

export function resumeModelTask(id: string) {
  return request({
    url: `/model-tasks/${id}/resume`,
    method: 'POST',
  });
}

export function retrySample(taskId: string, sampleId: string) {
  return request({
    url: `/model-tasks/${taskId}/retry-sample`,
    method: 'POST',
    data: { sampleId },
  });
}

export function retryAllFailed(taskId: string) {
  return request({
    url: `/model-tasks/${taskId}/retry-all-failed`,
    method: 'POST',
  });
}

export function getTaskSample(sampleId: string) {
  return request<TaskSample>({
    url: `/model-tasks/samples/${sampleId}`,
    method: 'GET',
  });
}
