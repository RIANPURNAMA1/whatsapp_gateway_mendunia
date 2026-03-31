export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

export interface WaSession {
  id: number
  user_id: number
  session_name: string
  phone_number: string | null
  status: 'disconnected' | 'connecting' | 'connected' | 'banned'
  qr_code: string | null
  last_connected: string | null
  created_at: string
}

export interface ContactGroup {
  id: number
  user_id: number
  name: string
  description: string | null
  contact_count: number
  created_at: string
}

export interface Contact {
  id: number
  user_id: number
  name: string | null
  phone_number: string
  group_id: number | null
  is_valid: number
  notes: string | null
  created_at: string
}

export interface MessageTemplate {
  id: number
  user_id: number
  name: string
  content: string
  media_type: 'none' | 'image' | 'video' | 'document'
  media_url: string | null
  created_at: string
}

export interface BlastCampaign {
  id: number
  user_id: number
  session_id: number
  name: string
  message: string
  media_type: 'none' | 'image' | 'video' | 'document'
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed'
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  total_contacts: number
  sent_count: number
  failed_count: number
  delay_min: number
  delay_max: number
  created_at: string
}

export interface BlastLog {
  id: number
  campaign_id: number
  phone_number: string
  contact_name: string | null
  status: 'pending' | 'sent' | 'failed' | 'invalid'
  error_message: string | null
  sent_at: string | null
}

export interface AutoReply {
  id: number
  user_id: number
  session_id: number
  trigger_keyword: string
  match_type: 'exact' | 'contains' | 'starts_with' | 'regex'
  reply_message: string
  is_active: number
  reply_count: number
  created_at: string
}

export interface DashboardStats {
  sessions: { total: number; connected: number }
  contacts: { total: number; groups: number }
  campaigns: { total: number; active: number }
  messages: { sent: number; failed: number }
  chart: Array<{ date: string; count: number }>
  recent_campaigns: BlastCampaign[]
}
