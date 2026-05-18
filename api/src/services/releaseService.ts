import { runQuery, getQuery, allQuery } from '../db.js';
import type { Release } from '../types/index.js';

export async function createRelease(
  promptVersionId: number,
  usageScope: string
): Promise<Release> {
  const result = await runQuery(
    `INSERT INTO releases (prompt_version_id, status, gray_ratio, usage_scope)
     VALUES (?, 'pending_review', 0, ?)`,
    [promptVersionId, usageScope]
  );
  
  const release = await getQuery('SELECT * FROM releases WHERE id = ?', [result.lastID]);
  return release;
}

export async function getReleases(status?: string): Promise<Release[]> {
  let sql = `
    SELECT r.*, pv.version_number, p.name as prompt_name
    FROM releases r 
    LEFT JOIN prompt_versions pv ON r.prompt_version_id = pv.id 
    LEFT JOIN prompts p ON pv.prompt_id = p.id 
  `;
  
  const params: any[] = [];
  
  if (status) {
    sql += ' WHERE r.status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY r.created_at DESC';
  
  return allQuery(sql, params);
}

export async function getReleaseById(id: number): Promise<Release | null> {
  const release = await getQuery(
    `SELECT r.*, pv.version_number, pv.content, p.name as prompt_name
     FROM releases r 
     LEFT JOIN prompt_versions pv ON r.prompt_version_id = pv.id 
     LEFT JOIN prompts p ON pv.prompt_id = p.id 
     WHERE r.id = ?`,
    [id]
  );
  return release || null;
}

export async function approveRelease(
  id: number,
  approverId: number,
  grayRatio: number
): Promise<Release | null> {
  await runQuery(
    `UPDATE releases 
     SET status = 'approved',
         gray_ratio = ?,
         approver_id = ?,
         approved_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [grayRatio, approverId, id]
  );
  
  return getReleaseById(id);
}

export async function releaseToProduction(id: number): Promise<Release | null> {
  await runQuery(
    `UPDATE releases SET status = 'released' WHERE id = ?`,
    [id]
  );
  
  return getReleaseById(id);
}

export async function rollbackRelease(
  id: number,
  reason: string
): Promise<Release | null> {
  await runQuery(
    `UPDATE releases 
     SET status = 'rolled_back',
         rollback_reason = ?,
         rolled_back_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [reason, id]
  );
  
  return getReleaseById(id);
}

export async function rejectRelease(id: number, reason: string): Promise<Release | null> {
  await runQuery(
    `UPDATE releases 
     SET status = 'rejected',
         rollback_reason = ?
     WHERE id = ?`,
    [reason, id]
  );
  
  return getReleaseById(id);
}

export async function getActiveReleases(): Promise<Release[]> {
  return allQuery(
    `SELECT r.*, pv.version_number, p.name as prompt_name
     FROM releases r 
     LEFT JOIN prompt_versions pv ON r.prompt_version_id = pv.id 
     LEFT JOIN prompts p ON pv.prompt_id = p.id 
     WHERE r.status IN ('approved', 'released')
     ORDER BY r.created_at DESC`
  );
}
