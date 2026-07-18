// Shared TypeScript types for Bond Covenant Analyzer

export type ClauseType =
  | 'financial'
  | 'operational'
  | 'event_of_default'
  | 'reporting'
  | 'negative_pledge'
  | 'change_of_control'
  | 'cross_default'
  | 'other'

export type DocumentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export type RiskLevel = 'low' | 'medium' | 'high'

export interface Document {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  status: DocumentStatus
  total_pages: number | null
  extraction_model: string | null
  processing_time_seconds: number | null
  created_at: string
  updated_at: string
  error_message: string | null
  risk_level: RiskLevel | null
  total_covenants: number | null
  summary: string | null
}

export interface Covenant {
  id: string
  document_id: string
  clause_type: ClauseType
  category: string
  raw_text: string
  normalized_value: string | null
  confidence_score: number
  page_number: number | null
  section_reference: string | null
  is_verified: boolean
  created_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  sources: CovenantSource[]
  tokens_used: number | null
  model_used: string | null
  created_at: string
}

export interface CovenantSource {
  covenant_id: string
  clause_type: ClauseType
  section_reference: string | null
  page_number: number | null
  confidence: number
}

export interface DashboardKPIs {
  totalDocuments: number
  processingDocuments: number
  totalCovenants: number
  avgCovenantsPerDoc: number
  highRiskDocuments: number
  avgConfidenceScore: number
}

export interface ExtractionJobStatus {
  documentId: string
  status: DocumentStatus
  progress: number
  message: string | null
}
