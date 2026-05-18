import { runQuery, getQuery, allQuery } from '../db.js';
import type { Prompt, PromptVersion } from '../types/index.js';

export async function createPrompt(data: Omit<Prompt, 'id' | 'created_at' | 'updated_at'>): Promise<Prompt> {
  const result = await runQuery(
    `INSERT INTO prompts (name, content, variables_json, example_input, scenario, risk_description, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.content, data.variables_json, data.example_input, data.scenario, data.risk_description, data.status, data.created_by]
  );
  
  const prompt = await getQuery('SELECT * FROM prompts WHERE id = ?', [result.lastID]);
  return prompt;
}

export async function getPrompts(page: number = 1, pageSize: number = 20): Promise<{ items: Prompt[], total: number }> {
  const offset = (page - 1) * pageSize;
  const items = await allQuery(
    `SELECT p.*, u.username as creator_name 
     FROM prompts p 
     LEFT JOIN users u ON p.created_by = u.id 
     ORDER BY p.updated_at DESC 
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );
  
  const countResult = await getQuery('SELECT COUNT(*) as total FROM prompts');
  return { items, total: countResult.total };
}

export async function getPromptById(id: number): Promise<Prompt | null> {
  const prompt = await getQuery(
    `SELECT p.*, u.username as creator_name 
     FROM prompts p 
     LEFT JOIN users u ON p.created_by = u.id 
     WHERE p.id = ?`,
    [id]
  );
  return prompt || null;
}

export async function updatePrompt(id: number, data: Partial<Prompt>): Promise<Prompt | null> {
  await runQuery(
    `UPDATE prompts 
     SET name = COALESCE(?, name),
         content = COALESCE(?, content),
         variables_json = COALESCE(?, variables_json),
         example_input = COALESCE(?, example_input),
         scenario = COALESCE(?, scenario),
         risk_description = COALESCE(?, risk_description),
         status = COALESCE(?, status),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [data.name, data.content, data.variables_json, data.example_input, data.scenario, data.risk_description, data.status, id]
  );
  
  return getPromptById(id);
}

export async function createPromptVersion(
  promptId: number, 
  content: string, 
  variablesJson: string | null, 
  changeDescription: string,
  createdBy: number
): Promise<PromptVersion> {
  const versions = await allQuery(
    'SELECT version_number FROM prompt_versions WHERE prompt_id = ? ORDER BY created_at DESC LIMIT 1',
    [promptId]
  );
  
  let versionNumber = 'v1.0';
  if (versions.length > 0) {
    const lastVersion = versions[0].version_number;
    const match = lastVersion.match(/v(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]) + 1;
      versionNumber = `v${major}.${minor}`;
    }
  }

  const result = await runQuery(
    `INSERT INTO prompt_versions (prompt_id, version_number, content, variables_json, change_description, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [promptId, versionNumber, content, variablesJson, changeDescription, createdBy]
  );
  
  const version = await getQuery('SELECT * FROM prompt_versions WHERE id = ?', [result.lastID]);
  return version;
}

export async function getPromptVersions(promptId: number): Promise<PromptVersion[]> {
  return allQuery(
    `SELECT pv.*, u.username as creator_name 
     FROM prompt_versions pv 
     LEFT JOIN users u ON pv.created_by = u.id 
     WHERE pv.prompt_id = ? 
     ORDER BY pv.created_at DESC`,
    [promptId]
  );
}
