import { request } from '@/utils/request';

export interface EvaluationSet {
  id: string;
  name: string;
  description?: string;
  businessScenario?: string;
  isFrozen: boolean;
  frozenAt?: string;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
  dimensions?: Dimension[];
  _count?: { questions: number; tasks: number };
}

export interface Question {
  id: string;
  evaluationSetId: string;
  title: string;
  content: string;
  inputData?: string;
  referenceAnswer?: string;
  difficulty: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Dimension {
  id: string;
  evaluationSetId: string;
  name: string;
  description?: string;
  weight: number;
  maxScore: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvaluationSetDto {
  name: string;
  description?: string;
  businessScenario?: string;
  questions?: Partial<Question>[];
  dimensions?: Partial<Dimension>[];
}

export function getEvaluationSets(params: { page?: number; pageSize?: number }) {
  return request<{ items: EvaluationSet[]; total: number; page: number; pageSize: number }>({
    url: '/evaluation-sets',
    method: 'GET',
    params,
  });
}

export function getEvaluationSet(id: string) {
  return request<EvaluationSet>({
    url: `/evaluation-sets/${id}`,
    method: 'GET',
  });
}

export function createEvaluationSet(data: CreateEvaluationSetDto) {
  return request<EvaluationSet>({
    url: '/evaluation-sets',
    method: 'POST',
    data,
  });
}

export function updateEvaluationSet(id: string, data: Partial<CreateEvaluationSetDto>) {
  return request<EvaluationSet>({
    url: `/evaluation-sets/${id}`,
    method: 'PUT',
    data,
  });
}

export function deleteEvaluationSet(id: string) {
  return request({
    url: `/evaluation-sets/${id}`,
    method: 'DELETE',
  });
}

export function freezeEvaluationSet(id: string, data: { version?: string; description?: string }) {
  return request({
    url: `/evaluation-sets/${id}/freeze`,
    method: 'POST',
    data,
  });
}

export function unfreezeEvaluationSet(id: string) {
  return request({
    url: `/evaluation-sets/${id}/unfreeze`,
    method: 'POST',
  });
}

export function addQuestion(evaluationSetId: string, data: Partial<Question>) {
  return request<Question>({
    url: `/evaluation-sets/${evaluationSetId}/questions`,
    method: 'POST',
    data,
  });
}

export function updateQuestion(id: string, data: Partial<Question>) {
  return request<Question>({
    url: `/evaluation-sets/questions/${id}`,
    method: 'PUT',
    data,
  });
}

export function deleteQuestion(id: string) {
  return request({
    url: `/evaluation-sets/questions/${id}`,
    method: 'DELETE',
  });
}

export function addDimension(evaluationSetId: string, data: Partial<Dimension>) {
  return request<Dimension>({
    url: `/evaluation-sets/${evaluationSetId}/dimensions`,
    method: 'POST',
    data,
  });
}

export function updateDimension(id: string, data: Partial<Dimension>) {
  return request<Dimension>({
    url: `/evaluation-sets/dimensions/${id}`,
    method: 'PUT',
    data,
  });
}

export function deleteDimension(id: string) {
  return request({
    url: `/evaluation-sets/dimensions/${id}`,
    method: 'DELETE',
  });
}
