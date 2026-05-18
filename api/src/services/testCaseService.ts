import { runQuery, getQuery, allQuery } from '../db.js';
import type { TestCase } from '../types/index.js';

export async function createTestCase(data: Omit<TestCase, 'id' | 'created_at'>): Promise<TestCase> {
  const result = await runQuery(
    `INSERT INTO test_cases (name, input_data, expected_output, prompt_id, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.input_data, data.expected_output, data.prompt_id, data.created_by]
  );
  
  const testCase = await getQuery('SELECT * FROM test_cases WHERE id = ?', [result.lastID]);
  return testCase;
}

export async function getTestCases(promptId?: number): Promise<TestCase[]> {
  if (promptId) {
    return allQuery(
      `SELECT tc.*, u.username as creator_name 
       FROM test_cases tc 
       LEFT JOIN users u ON tc.created_by = u.id 
       WHERE tc.prompt_id = ? 
       ORDER BY tc.created_at DESC`,
      [promptId]
    );
  }
  
  return allQuery(
    `SELECT tc.*, u.username as creator_name 
     FROM test_cases tc 
     LEFT JOIN users u ON tc.created_by = u.id 
     ORDER BY tc.created_at DESC`
  );
}

export async function getTestCaseById(id: number): Promise<TestCase | null> {
  const testCase = await getQuery(
    `SELECT tc.*, u.username as creator_name 
     FROM test_cases tc 
     LEFT JOIN users u ON tc.created_by = u.id 
     WHERE tc.id = ?`,
    [id]
  );
  return testCase || null;
}

export async function updateTestCase(id: number, data: Partial<TestCase>): Promise<TestCase | null> {
  await runQuery(
    `UPDATE test_cases 
     SET name = COALESCE(?, name),
         input_data = COALESCE(?, input_data),
         expected_output = COALESCE(?, expected_output),
         prompt_id = ?
     WHERE id = ?`,
    [data.name, data.input_data, data.expected_output, data.prompt_id, id]
  );
  
  return getTestCaseById(id);
}

export async function deleteTestCase(id: number): Promise<boolean> {
  const result = await runQuery('DELETE FROM test_cases WHERE id = ?', [id]);
  return result.changes > 0;
}
