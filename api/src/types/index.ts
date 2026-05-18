export interface User {
  id: number;
  username: string;
  role: 'admin' | 'engineer' | 'product' | 'viewer';
  created_at: string;
}

export interface Prompt {
  id: number;
  name: string;
  content: string;
  variables_json?: string;
  example_input?: string;
  scenario?: string;
  risk_description?: string;
  status: 'draft' | 'testing' | 'ready' | 'archived';
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface PromptVersion {
  id: number;
  prompt_id: number;
  version_number: string;
  content: string;
  variables_json?: string;
  change_description?: string;
  created_by: number;
  created_at: string;
}

export interface TestCase {
  id: number;
  name: string;
  input_data: string;
  expected_output?: string;
  prompt_id?: number;
  created_by: number;
  created_at: string;
}

export interface Evaluation {
  id: number;
  prompt_version_id: number;
  test_case_id: number;
  status: 'pending' | 'running' | 'success' | 'error';
  actual_output?: string;
  score?: number;
  error_message?: string;
  error_type?: 'missing_variable' | 'too_long' | 'sensitive_content' | 'other';
  created_at: string;
}

export interface Release {
  id: number;
  prompt_version_id: number;
  status: 'pending_review' | 'approved' | 'released' | 'rolled_back' | 'rejected';
  gray_ratio: number;
  usage_scope?: string;
  approver_id?: number;
  approved_at?: string;
  rollback_reason?: string;
  rolled_back_at?: string;
  created_at: string;
}

export interface MonitoringLog {
  id: number;
  release_id: number;
  event_type: string;
  call_count: number;
  failure_count: number;
  avg_score?: number;
  complaint_count: number;
  log_date: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
