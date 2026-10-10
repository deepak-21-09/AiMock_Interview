export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
  profile?: CandidateProfile;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  full_name?: string;
  education?: string;
  years_of_experience: number;
  current_role?: string;
  target_role?: string;
  bio?: string;
  updated_at: string;
}

export interface Project {
  name: string;
  technologies: string[];
  description: string;
}

export interface JobMatch {
  matched_skills: string[];
  missing_skills: string[];
  match_percentage: number;
}

export interface Resume {
  id: string;
  file_name: string;
  file_size_bytes: number;
  confidence_score: number;
  is_scanned: boolean;
  parsed_skills: string[];
  parsed_projects: Project[];
  parsed_experience: any[];
  parsed_education: any[];
  job_match: JobMatch;
  created_at: string;
}

export interface PlannedQuestion {
  id: string;
  order_index: number;
  round_type: string;
  difficulty: number;
  question_text: string;
  competency_focus: string;
  expected_concepts: string[];
  source_reference?: string;
}

export interface InterviewPlan {
  session_id: string;
  target_role: string;
  rounds: string[];
  total_questions: number;
  duration_minutes: number;
  starting_difficulty: number;
  questions: PlannedQuestion[];
  resume_summary?: any;
}

export interface QuestionDetail {
  id: string;
  order_index: number;
  round_type: string;
  difficulty: number;
  question_text: string;
  competency_focus?: string;
  is_followup: boolean;
  status: string;
}

export interface TurnActionResponse {
  action: 'next_question' | 'follow_up' | 'repeat' | 'clarify' | 'skip' | 'concluded' | 'repeat_prompt_unreliable';
  message: string;
  current_difficulty: number;
  next_question?: QuestionDetail;
  follow_up_count: number;
  transcript?: string;
  is_concluded: boolean;
  session_status: string;
  report_id?: string;
  evaluation_preview?: any;
}

export interface DimensionScores {
  technical: number;
  relevance: number;
  completeness: number;
  problem_solving: number;
  communication: number;
  overall: number;
}

export interface QuestionReview {
  question_id: string;
  question_text: string;
  round_type: string;
  difficulty: number;
  is_followup: boolean;
  status: string;
  transcript?: string;
  scores?: Record<string, number>;
  justifications?: Record<string, string>;
  evidence_quotes: string[];
  missing_concepts: string[];
  unsupported_claims: string[];
  insufficient_evidence: boolean;
}

export interface InterviewReport {
  id: string;
  session_id: string;
  target_role: string;
  created_at: string;
  overall_score: number;
  dimension_scores: DimensionScores;
  strengths: string[];
  weaknesses: string[];
  missing_concepts: string[];
  revision_topics: string[];
  practice_exercises: string[];
  summary: string;
  disclaimer: string;
  pdf_download_url: string;
  questions: QuestionReview[];
}

export interface HistoryItem {
  session_id: string;
  target_role: string;
  status: string;
  starting_difficulty: number;
  final_difficulty: number;
  overall_score?: number;
  total_questions: number;
  created_at: string;
  has_report: boolean;
}

export interface PracticeComparison {
  attempt_id: string;
  question_id: string;
  attempt_number: number;
  original_scores: Record<string, number>;
  new_scores: Record<string, number>;
  score_change: Record<string, number>;
  transcript: string;
  feedback: string;
  created_at: string;
}
