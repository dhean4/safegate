export type Verdict = 'ALLOW' | 'BLOCK' | 'REWRITE';

export interface CategoryResult {
  name: string;
  score: number;
  triggered: boolean;
  reason: string;
}

export interface AnalyzeResponse {
  verdict: Verdict;
  risk_score: number;
  categories: CategoryResult[];
  reasoning: string;
  original_prompt: string;
  rewritten_prompt: string | null;
  llm_response: string | null;
  processing_time_ms: number;
  audit_id: number;
}

export interface AuditEntry {
  id: number;
  timestamp: string;
  original_prompt: string;
  rewritten_prompt: string | null;
  verdict: Verdict;
  risk_score: number;
  categories_triggered: string;
  llm_response: string | null;
  processing_time_ms: number;
}

export interface AuditLogResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface TopCategory {
  name: string;
  count: number;
}

export interface AuditStats {
  total_requests: number;
  block_rate: number;
  rewrite_rate: number;
  allow_rate: number;
  avg_risk_score: number;
  top_categories: TopCategory[];
}
