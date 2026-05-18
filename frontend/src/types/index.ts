export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'supervisor' | 'agent' | 'quality' | 'ticket';
  skill_group?: string;
  status?: string;
}

export interface Call {
  id: number;
  call_id: string;
  caller_number: string;
  called_number?: string;
  customer_id?: number;
  queue_id?: number;
  agent_id?: number;
  status: 'waiting' | 'ringing' | 'connected' | 'held' | 'transferred' | 'ended' | 'missed' | 'abandoned';
  direction: 'inbound' | 'outbound';
  priority: number;
  wait_start_time?: string;
  connect_time?: string;
  end_time?: string;
  total_duration?: number;
  recording_url?: string;
  recording_status?: string;
  customer_name?: string;
  customer_level?: string;
  queue_name?: string;
  agent_name?: string;
  created_at: string;
}

export interface Customer {
  id: number;
  phone_number: string;
  name?: string;
  email?: string;
  company?: string;
  level: 'vip' | 'normal' | 'blocked';
  tags?: string;
  notes?: string;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_no: string;
  call_id?: string;
  customer_id: number;
  type: 'complaint' | 'consult' | 'aftersale' | 'suggestion' | 'other';
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'resolved' | 'closed' | 'escalated';
  creator_id: number;
  assignee_id?: number;
  follow_up_required: number;
  follow_up_status?: string;
  follow_up_result?: string;
  customer_name?: string;
  creator_name?: string;
  assignee_name?: string;
  created_at: string;
}

export interface QualityReview {
  id: number;
  call_id: string;
  reviewer_id: number;
  score: number;
  status: 'draft' | 'submitted' | 'appealed' | 'finalized';
  comments?: string;
  caller_number?: string;
  agent_name?: string;
  reviewer_name?: string;
  created_at: string;
}

