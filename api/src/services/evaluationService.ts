import { runQuery, getQuery, allQuery } from '../db.js';
import type { Evaluation, TestCase, PromptVersion } from '../types/index.js';

const SENSITIVE_WORDS = ['敏感词1', '敏感词2', '暴力', '色情', '赌博'];

function checkSensitiveContent(text: string): boolean {
  return SENSITIVE_WORDS.some(word => text.toLowerCase().includes(word.toLowerCase()));
}

function detectMissingVariables(content: string, inputData: string): string[] {
  const variableRegex = /\{(\w+)\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = variableRegex.exec(content)) !== null) {
    variables.push(match[1]);
  }
  
  const input = JSON.parse(inputData || '{}');
  const missingVars = variables.filter(v => !(v in input));
  
  return missingVars;
}

export async function runEvaluation(
  promptVersionId: number,
  testCaseId: number
): Promise<Evaluation> {
  const testCase = await getQuery('SELECT * FROM test_cases WHERE id = ?', [testCaseId]);
  const promptVersion = await getQuery('SELECT * FROM prompt_versions WHERE id = ?', [promptVersionId]);
  
  if (!testCase || !promptVersion) {
    throw new Error('测试用例或 Prompt 版本不存在');
  }
  
  let errorType: string | undefined;
  let errorMessage: string | undefined;
  let status: 'running' | 'success' | 'error' = 'running';
  let actualOutput = '';
  let score = 0;
  
  const missingVars = detectMissingVariables(promptVersion.content, testCase.input_data);
  if (missingVars.length > 0) {
    status = 'error';
    errorType = 'missing_variable';
    errorMessage = `缺少变量: ${missingVars.join(', ')}`;
  } else {
    const input = JSON.parse(testCase.input_data || '{}');
    actualOutput = promptVersion.content.replace(/\{(\w+)\}/g, (match: string, varName: string) => {
      return input[varName] || match;
    });
    
    if (actualOutput.length > 10000) {
      status = 'error';
      errorType = 'too_long';
      errorMessage = '输出内容过长';
    } else if (checkSensitiveContent(actualOutput)) {
      status = 'error';
      errorType = 'sensitive_content';
      errorMessage = '输出包含敏感内容';
    } else {
      status = 'success';
      score = 80 + Math.random() * 20;
    }
  }
  
  const result = await runQuery(
    `INSERT INTO evaluations (prompt_version_id, test_case_id, status, actual_output, score, error_message, error_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [promptVersionId, testCaseId, status, actualOutput, score, errorMessage, errorType]
  );
  
  const evaluation = await getQuery('SELECT * FROM evaluations WHERE id = ?', [result.lastID]);
  return evaluation;
}

export async function runBatchEvaluation(
  promptVersionId: number,
  testCaseIds: number[]
): Promise<Evaluation[]> {
  const evaluations: Evaluation[] = [];
  
  for (const testCaseId of testCaseIds) {
    const evaluation = await runEvaluation(promptVersionId, testCaseId);
    evaluations.push(evaluation);
  }
  
  return evaluations;
}

export async function getEvaluations(promptVersionId?: number, status?: string): Promise<Evaluation[]> {
  let sql = `
    SELECT e.*, tc.name as test_case_name, pv.version_number 
    FROM evaluations e 
    LEFT JOIN test_cases tc ON e.test_case_id = tc.id 
    LEFT JOIN prompt_versions pv ON e.prompt_version_id = pv.id 
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (promptVersionId) {
    sql += ' AND e.prompt_version_id = ?';
    params.push(promptVersionId);
  }
  
  if (status) {
    sql += ' AND e.status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY e.created_at DESC';
  
  return allQuery(sql, params);
}

export async function getEvaluationById(id: number): Promise<Evaluation | null> {
  const evaluation = await getQuery(
    `SELECT e.*, tc.name as test_case_name, pv.version_number 
     FROM evaluations e 
     LEFT JOIN test_cases tc ON e.test_case_id = tc.id 
     LEFT JOIN prompt_versions pv ON e.prompt_version_id = pv.id 
     WHERE e.id = ?`,
    [id]
  );
  return evaluation || null;
}

export async function getErrorEvaluations(promptVersionId?: number): Promise<Evaluation[]> {
  return getEvaluations(promptVersionId, 'error');
}
