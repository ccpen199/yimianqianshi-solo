import { runQuery, getQuery, allQuery } from '../db.js';
import bcrypt from 'bcryptjs';
import type { User } from '../types/index.js';

export async function getUsers(): Promise<User[]> {
  return allQuery('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
}

export async function getUserById(id: number): Promise<User | null> {
  const user = await getQuery('SELECT id, username, role, created_at FROM users WHERE id = ?', [id]);
  return user || null;
}

export async function createUser(username: string, password: string, role: string): Promise<User> {
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await runQuery(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, passwordHash, role]
  );
  const user = await getUserById(result.lastID);
  return user!;
}

export async function updateUser(id: number, data: { username?: string; role?: string }): Promise<User | null> {
  const updates: string[] = [];
  const params: any[] = [];
  
  if (data.username) {
    updates.push('username = ?');
    params.push(data.username);
  }
  if (data.role) {
    updates.push('role = ?');
    params.push(data.role);
  }
  
  if (updates.length === 0) {
    return getUserById(id);
  }
  
  params.push(id);
  await runQuery(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  return getUserById(id);
}

export async function deleteUser(id: number): Promise<boolean> {
  const result = await runQuery('DELETE FROM users WHERE id = ?', [id]);
  return result.changes > 0;
}
