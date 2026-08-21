import { ApiError, parseApiError, parseJsonResponse, type ApiErrorBody } from "@/lib/api";

async function adminCall<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await parseJsonResponse<T | ApiErrorBody>(res);
  if (!res.ok) {
    throw new ApiError(parseApiError(body as ApiErrorBody, res.status), res.status);
  }
  return body as T;
}

async function adminDownload(path: string, fallbackFilename: string): Promise<void> {
  const res = await fetch(`/api/admin${path}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const body = await parseJsonResponse<ApiErrorBody>(res);
      message = parseApiError(body, res.status);
    } catch {
      /* keep status message */
    }
    throw new ApiError(message, res.status);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const filename = match?.[1]?.trim() || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function putFileToRailway(
  uploadUrl: string,
  file: File,
  contentType: string,
  ticket: string,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": contentType,
        "X-Upload-Ticket": ticket,
      },
    });
  } catch {
    throw new ApiError(
      "Could not reach the API to upload audio. Confirm Railway CORS allows this admin origin.",
      0,
    );
  }
  if (!res.ok) {
    let message = `Audio upload failed (${res.status}).`;
    try {
      const body = await parseJsonResponse<ApiErrorBody>(res);
      message = parseApiError(body, res.status);
    } catch {
      /* keep status message */
    }
    throw new ApiError(message, res.status);
  }
}

async function adminMultipartCall<T>(path: string, formData: FormData): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
    cache: "no-store",
  });
  const body = await parseJsonResponse<T | ApiErrorBody>(res);
  if (!res.ok) {
    throw new ApiError(parseApiError(body as ApiErrorBody, res.status), res.status);
  }
  return body as T;
}

export function defaultListeningAudioKey(mockId: string, part: number): string {
  return `listening/${mockId}/part-${part}/full.mp3`;
}

export type DashboardMetrics = {
  total_users: number;
  active_users_7d: number;
  new_signups_7d: number;
  mock_attempts_7d: number;
  speaking_pending: number;
  writing_pending?: number;
  total_mocks?: number;
  published_mocks?: number;
  users_trend_pct?: number | null;
  signups_trend_pct?: number | null;
  mocks_trend_pct?: number | null;
};

export type DailyActivityPoint = {
  label: string;
  date: string;
  active_users: number;
  signups: number;
  mock_attempts: number;
};

export type RecentActivityItem = {
  id: string;
  message: string;
  created_at: string;
  kind: string;
};

export type DashboardOverview = {
  metrics: DashboardMetrics;
  weekly_activity: DailyActivityPoint[];
  recent_activity: RecentActivityItem[];
};

export type AdminUserListItem = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  mock_attempt_count: number;
  completed_mock_count: number;
  last_activity_at: string | null;
  best_band: number | null;
};

export type AdminUserDetail = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  mock_attempt_count: number;
  completed_mock_count: number;
  target_band: number | null;
};

export type AdminUserActivityStats = {
  total_attempts: number;
  completed_attempts: number;
  in_progress_attempts: number;
  average_band: number | null;
  best_band: number | null;
  last_activity_at: string | null;
  current_streak: number;
  longest_streak: number;
};

export type AdminUserInProgressItem = {
  id: string;
  module: string;
  started_at: string;
  mock_test_id: string;
  mock_title: string;
  catalog_number: number | null;
};

export type AdminUserModuleAttemptItem = {
  id: string;
  module: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  band: number | null;
  raw_score: number | null;
  total_count: number | null;
  mock_test_id: string;
  mock_title: string;
  catalog_number: number | null;
};

export type AdminUserMockSessionItem = {
  mock_attempt_id: string;
  mock_test_id: string;
  mock_title: string | null;
  catalog_number: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  listening_band: number | null;
  reading_band: number | null;
  writing_band: number | null;
  speaking_band: number | null;
  aggregate_band: number | null;
};

export type AdminUserDiagnosticItem = {
  id: string;
  client_attempt_id: string;
  status: string;
  listening_band: number | null;
  reading_band: number | null;
  writing_band: number | null;
  speaking_band: number | null;
  aggregate_band: number | null;
  review: Record<string, unknown> | null;
  pack_version: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type AdminUserSpeakingReviewItem = {
  id: string;
  attempt_id: string;
  status: string;
  human_band: number | null;
  created_at: string;
  mock_title: string | null;
};

export type AdminUserOverview = {
  profile: AdminUserDetail;
  stats: AdminUserActivityStats;
  in_progress: AdminUserInProgressItem[];
  recent_modules: AdminUserModuleAttemptItem[];
  mock_sessions: AdminUserMockSessionItem[];
  diagnostics: AdminUserDiagnosticItem[];
  speaking_reviews: AdminUserSpeakingReviewItem[];
};

export type SectionStatus = {
  part: number;
  question_count: number;
  has_audio: boolean;
};

export type ModuleSectionStatus = {
  module: string;
  sections: SectionStatus[];
};

export type AdminMockListItem = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  is_published: boolean;
  is_free?: boolean;
  catalog_number: number | null;
  /** Writing-track taxonomy. NULL = unclassified. */
  exam_module?: "academic" | "general_training" | "both" | null;
  created_at: string;
  total_questions: number;
  attempt_count?: number;
  configured_listening_parts?: number;
  configured_reading_passages?: number;
  configured_writing_tasks?: number;
  modules: {
    module: string;
    sequence_order: number;
    duration_minutes: number;
    is_enabled: boolean;
    question_count: number;
    parts: number[];
    part_counts?: { part: number; question_count: number }[];
  }[];
};

export type AdminMockDetail = AdminMockListItem & {
  section_status?: ModuleSectionStatus[];
  publish_blockers?: string[];
};

export type SpeakingReviewListItem = {
  id: string;
  attempt_id: string;
  student_name: string | null;
  student_email: string | null;
  status: string;
  human_band: number | null;
  ai_overall_band?: number | null;
  created_at: string;
};

export type SpeakingSubmissionMeta = {
  part?: number | null;
  part_label?: string | null;
  cue_card?: string | null;
  prompt_title?: string | null;
  manifest_hash?: string | null;
  response_count?: number | null;
  responses?: SpeakingSubmissionResponse[];
  parts?: number[];
};

export type SpeakingFluencyMetrics = {
  words_per_minute?: number | null;
  total_speaking_seconds?: number | null;
  long_pauses?: number | null;
  response_count?: number | null;
  questions_asked?: number | null;
  word_count?: number | null;
};

export type SpeakingSubmissionResponse = {
  response_id: string;
  question_id: string;
  part: number;
  sequence_number: number;
  duration_sec: number;
  audio_url: string;
  audio_play_url?: string | null;
  transcription_status?: string | null;
  transcript?: string | null;
  fluency_metrics?: SpeakingFluencyMetrics | null;
  /** Forward-compatible: the backend currently does not expose prompt text per response. */
  prompt?: string | null;
  prompt_title?: string | null;
};

export type SpeakingResponseMetrics = SpeakingFluencyMetrics & {
  response_id: string;
  part: number;
  sequence_number: number;
};

export type SpeakingTranscriptionProgress = {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
};

export type SpeakingEvidenceQuote = {
  response_id: string;
  question_id: string;
  quote: string;
  criterion: "FC" | "LR" | "GRA" | "P";
  polarity: "strength" | "weakness";
  part: number;
  issue?: string | null;
  title?: string | null;
  explanation?: string | null;
  suggestion?: string | null;
};

export type SpeakingPartPerformance = {
  part: number;
  note: string;
  band_estimate: number;
};

export type SpeakingAiEvaluation = {
  band_scores?: {
    FC?: number;
    LR?: number;
    GRA?: number;
    P?: number;
    P_confidence?: number;
    overall?: number;
  };
  part_performance?: SpeakingPartPerformance[];
  evidence_quotes?: SpeakingEvidenceQuote[];
  recurring_patterns?: Array<{
    pattern: string;
    criterion: string;
    frequency: string;
    examples: string[];
  }>;
  strengths?: string[];
  improvements?: string[];
  vocabulary_highlights?: string[];
  reviewer_flags?: string[];
  next_band_advice?: string;
};

export type SpeakingReviewDetail = {
  id: string;
  attempt_id: string;
  status: string;
  human_band: number | null;
  human_criteria_scores: {
    fluency: number;
    lexical: number;
    grammar: number;
    pronunciation: number;
  } | null;
  submission_meta: SpeakingSubmissionMeta | null;
  reviewer_notes: string | null;
  transcript: string | null;
  audio_url: string | null;
  audio_play_url: string | null;
  ai_scores: Record<string, unknown> | null;
  part_metrics: Record<string, SpeakingFluencyMetrics>;
  attempt_metrics: SpeakingFluencyMetrics | null;
  response_metrics: SpeakingResponseMetrics[];
  transcription_progress: SpeakingTranscriptionProgress | null;
  student_name: string | null;
  student_email: string | null;
  student_target_band: number | null;
  student_current_band: number | null;
  queue_pending_count: number;
  created_at: string;
  reviewed_at: string | null;
};

export type WritingReviewListItem = {
  id: string;
  source: "mock" | "diagnostic";
  student_name: string | null;
  student_email: string | null;
  status: string;
  human_band: number | null;
  ai_overall_band?: number | null;
  ai_status?: string | null;
  task_label?: string | null;
  created_at: string;
};

export type WritingReviewDetail = {
  id: string;
  source: "mock" | "diagnostic";
  attempt_id: string | null;
  client_attempt_id: string | null;
  status: string;
  human_band: number | null;
  human_criteria_scores: {
    task_achievement: number;
    coherence: number;
    lexical_resource: number;
    grammar: number;
  } | null;
  essay: string | null;
  question: string | null;
  word_count: number | null;
  reviewer_notes: string | null;
  ai_scores: Record<string, unknown> | null;
  ai_feedback: Record<string, unknown> | null;
  ai_status?: string | null;
  ai_error?: string | null;
  student_name: string | null;
  student_email: string | null;
  student_target_band: number | null;
  student_current_band: number | null;
  task_label: string | null;
  mock_title: string | null;
  queue_pending_count: number;
  created_at: string;
  reviewed_at: string | null;
};

export type DiagnosticQueueItem = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  goal_label: string | null;
  target_band: number | null;
  listening_band: number | null;
  reading_band: number | null;
  writing_band: number | null;
  speaking_band: number | null;
  speaking_human_band: number | null;
  aggregate_band: number | null;
  status: string;
  report_email_sent_at: string | null;
  created_at: string;
};

export type DiagnosticSpeakingSummary = {
  part1: { question_id: string; duration_sec: number; completed: boolean }[];
  part2_prep_sec: number | null;
  part2_record_sec: number | null;
  part2_completed: boolean;
};

export type DiagnosticWritingSummary = {
  task_part: number | null;
  overall_band: number | null;
  essay_preview: string | null;
  word_count: number | null;
  ai_feedback: Record<string, unknown> | null;
};

export type DiagnosticDetail = {
  id: string;
  client_attempt_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  goal_label: string | null;
  target_band: number | null;
  listening_band: number | null;
  reading_band: number | null;
  writing_band: number | null;
  writing_human_band: number | null;
  speaking_band: number | null;
  speaking_human_band: number | null;
  aggregate_band: number | null;
  status: string;
  speaking_human_criteria_scores: {
    fluency: number;
    lexical: number;
    grammar: number;
    pronunciation: number;
  } | null;
  speaking_reviewer_notes: string | null;
  speaking_reviewed_at: string | null;
  report_email_sent_at: string | null;
  writing_review_id: string | null;
  writing: DiagnosticWritingSummary | null;
  speaking: DiagnosticSpeakingSummary | null;
  created_at: string;
  reviewed_at: string | null;
};

export type AuditLogItem = {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

export type ReviewHistoryItem = {
  id: string;
  action: string;
  admin_email: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ReviewAnalyticsResponse = {
  module: string;
  days: number;
  completed: number;
  with_ai: number;
  without_ai: number;
  agreement_rate: number | null;
  override_rate: number | null;
  overall_mae: number | null;
  criterion_mae: Array<{
    key: string;
    label: string;
    mae: number | null;
    sample_count: number;
  }>;
};

export type AdminPaymentItem = {
  id: string;
  student_name: string | null;
  student_email: string | null;
  plan_name: string | null;
  amount: number;
  currency: string;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
};

export type AdminSubscriptionItem = {
  id: string;
  student_name: string | null;
  student_email: string | null;
  plan_name: string | null;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
};

export type AdminPaymentMetrics = {
  revenue_total: number;
  revenue_30d: number;
  paid_count: number;
  active_subscriptions: number;
};

export type AiBudgetSnapshot = {
  ok: boolean;
  daily_used: number;
  daily_limit: number;
  monthly_used: number;
  monthly_limit: number;
  warning: boolean;
  reason: string | null;
};

export type AiCircuitSnapshot = {
  open: boolean;
  failures: number;
  open_until: number | null;
  reason: string | null;
};

export type AiFailureItem = {
  provider: string;
  reason: string;
  at: string;
};

export type AiMetricsResponse = {
  period: string;
  day: string;
  calls: number;
  success: number;
  errors: number;
  retries: number;
  stub_calls: number;
  cache_hits: number;
  cache_misses: number;
  tokens_in: number;
  tokens_out: number;
  estimated_cost_usd: number;
  avg_latency_ms: number;
  success_rate_pct: number;
  retry_rate_pct: number;
  redis_status: string;
  generated_at: string;
  budget: AiBudgetSnapshot;
  circuit: AiCircuitSnapshot;
  recent_failures: AiFailureItem[];
  speaking_pending: number;
  speaking_failed: number;
};

export type AiHealthResponse = {
  redis_status: string;
  claude_configured: boolean;
  groq_configured: boolean;
  writing_eval_stub: boolean;
  budget_ok: boolean;
  circuit_open: boolean;
  speaking_pending: number;
  speaking_failed: number;
};

export type ReliabilityLatencyStat = {
  n: number;
  p50_ms: number | null;
  p95_ms: number | null;
};

export type ReliabilityEvent = {
  ts?: string;
  kind?: string;
  detail?: string;
  meta?: Record<string, unknown>;
  event?: string;
};

export type ReliabilitySnapshot = {
  day: string;
  counters: {
    empty_hub_assignment: number;
    scoring_failure: number;
    planner_failure: number;
    task_done: number;
    hub_complete: number;
    tasks_assigned_today: number;
    [key: string]: number;
  };
  completion_rate: number | null;
  latency: Record<string, ReliabilityLatencyStat>;
  recent_events: ReliabilityEvent[];
  practice?: {
    hubs_by_skill: Record<string, number>;
    hub_completions_7d: number;
  };
  notifications?: {
    queued: number;
    failed_24h: number;
    by_channel: Record<string, number>;
  };
};

export type ReadingBuilderQuestionIn = {
  question_type: string;
  prompt: string;
  options?: Array<{ label: string; text: string }> | null;
  correct_answer: string;
  alt_answers: string[];
  skill_tag?: string | null;
  difficulty?: "easy" | "medium" | "hard";
};

export type ReadingBuilderQuestionOut = {
  id: string;
  question_number: number;
  question_type: string;
  prompt: string;
  passage_text?: string | null;
  options?: Array<{ label: string; text: string }> | null;
  correct_answer: string;
  alt_answers: string[];
  skill_tag?: string | null;
  difficulty?: "easy" | "medium" | "hard";
};

export type ReadingPassageResponse = {
  mock_test_id: string;
  part: number;
  passage_text: string | null;
  questions: ReadingBuilderQuestionOut[];
};

export type ListeningBuilderQuestionIn = {
  question_type: string;
  prompt: string;
  options?: Array<{ label: string; text: string }> | null;
  correct_answer: string;
  alt_answers: string[];
  skill_tag?: string | null;
  instructions?: string | null;
  choose_two?: boolean;
  difficulty?: "easy" | "medium" | "hard";
};

export type ListeningBuilderQuestionOut = {
  id: string;
  question_number: number;
  question_type: string;
  prompt: string;
  instructions?: string | null;
  options?: Array<{ label: string; text: string }> | null;
  correct_answer: string;
  alt_answers: string[];
  skill_tag?: string | null;
  choose_two?: boolean;
  difficulty?: "easy" | "medium" | "hard";
};

export type ListeningPartResponse = {
  mock_test_id: string;
  part: number;
  audio_key: string | null;
  instructions: string | null;
  questions: ListeningBuilderQuestionOut[];
};

export type QuestionBankSectionSummary = {
  part: number;
  question_count: number;
  has_content: boolean;
};

export type QuestionBankSetItem = {
  set_id: string;
  set_number: number;
  title: string;
  difficulty: string;
  bank_id: string;
  bank_number: number;
  bank_title: string;
  skill: string;
  hub_id: string | null;
  hub_slug: string | null;
  description?: string | null;
  status?: string;
  is_custom?: boolean;
  /** Writing only: academic | general_training | both. ``both`` = both tracks. */
  exam_module?: "academic" | "general_training" | "both" | null;
  created_at?: string | null;
  sections: QuestionBankSectionSummary[];
  total_questions: number;
};

export type QuestionBankListResponse = {
  skill: string;
  sets: QuestionBankSetItem[];
};

export type QuestionBankDraftQueueItem = {
  set_id: string;
  skill: string;
  title: string;
  set_number: number;
  bank_number: number;
  status: string;
  hub_id: string | null;
};

export type QuestionBankDraftQueueResponse = {
  items: QuestionBankDraftQueueItem[];
  total: number;
};

export type QuestionBankCreateSetResponse = {
  set_id: string;
  skill: string;
  title: string;
  hub_id: string;
  parts: number;
  bank_number: number;
  set_number: number;
  status: string;
  exam_module?: "academic" | "general_training" | "both" | null;
};

export type BankListeningPartResponse = {
  practice_set_id: string;
  part: number;
  audio_key: string | null;
  instructions: string | null;
  questions: ListeningBuilderQuestionOut[];
};

export type BankReadingPartResponse = {
  practice_set_id: string;
  part: number;
  passage_text: string;
  questions: ReadingBuilderQuestionOut[];
};

export type BankWritingPartResponse = {
  practice_set_id: string;
  part: number;
  question_id: string | null;
  question_type: string;
  prompt: string;
  options: Record<string, unknown>;
  image_url: string | null;
  image_preview_url: string | null;
};

export type BankSpeakingPartResponse = {
  practice_set_id: string;
  part: number;
  questions: Array<{
    id: string;
    question_number: number;
    prompt: string;
    speak_time_sec: number;
    min_skip_sec: number;
    prep_sec: number;
    record_sec: number;
    video_url: string | null;
    video_preview_url: string | null;
  }>;
};

export type WritingPartResponse = {
  mock_test_id: string;
  part: number;
  question_id: string | null;
  question_type: string;
  prompt: string;
  options: Record<string, unknown>;
  image_url: string | null;
  image_preview_url: string | null;
  image_name: string | null;
};

export type SpeakingBuilderQuestion = {
  id?: string;
  question_number?: number;
  prompt: string;
  speak_time_sec: number;
  min_skip_sec: number;
  prep_sec: number;
  record_sec: number;
  video_url: string | null;
  video_preview_url?: string | null;
  video_name?: string | null;
};

export type SpeakingPartResponse = {
  mock_test_id: string;
  part: number;
  questions: SpeakingBuilderQuestion[];
};

export type StreamVideoTag =
  | "bandforge-intro"
  | "ielts-intro"
  | "hero-intro"
  | "listening-intro"
  | "reading-intro"
  | "writing-intro"
  | "speaking-intro";

export type StreamVideoItem = {
  id?: string | null;
  tag: StreamVideoTag | string;
  title: string;
  stream_uid: string;
  playback_url: string;
  duration_min: number;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  hubs_updated?: number | null;
};

export type StreamDirectUploadResponse = {
  uid: string;
  uploadURL: string;
};

export type StreamLibraryItem = {
  uid: string;
  name: string;
  duration_sec: number;
  status: string;
  thumbnail: string;
  require_signed_urls: boolean;
  assigned_tag: string | null;
  created?: string | null;
};

export const adminApi = {
  metrics() {
    return adminCall<DashboardMetrics>("/dashboard/metrics");
  },

  aiMetrics() {
    return adminCall<AiMetricsResponse>("/ai/metrics");
  },

  aiHealth() {
    return adminCall<AiHealthResponse>("/ai/health");
  },

  reliability() {
    return adminCall<ReliabilitySnapshot>("/reliability");
  },

  dashboardOverview() {
    return adminCall<DashboardOverview>("/dashboard/overview");
  },

  listUsers(params?: { q?: string; page?: number; page_size?: number }) {
    const q = new URLSearchParams();
    if (params?.q) q.set("q", params.q);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const suffix = q.toString() ? `?${q}` : "";
    return adminCall<{
      items: AdminUserListItem[];
      total: number;
      page: number;
      page_size: number;
    }>(`/users${suffix}`);
  },

  getUser(id: string) {
    return adminCall<AdminUserDetail>(`/users/${id}`);
  },

  getUserOverview(id: string) {
    return adminCall<AdminUserOverview>(`/users/${id}/overview`);
  },

  getUserAttempts(id: string) {
    return adminCall<AdminUserModuleAttemptItem[]>(`/users/${id}/attempts`);
  },

  patchUser(id: string, body: { is_active?: boolean; role?: string }) {
    return adminCall(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  listMocks() {
    return adminCall<AdminMockListItem[]>("/mocks");
  },

  createMock(body: {
    title: string;
    description?: string;
    catalog_number?: number;
    listening_parts?: number;
    reading_passages?: number;
    writing_tasks?: number;
    exam_module?: "academic" | "general_training" | "both" | null;
  }) {
    return adminCall<AdminMockListItem>("/mocks", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getMock(id: string) {
    return adminCall<AdminMockDetail>(`/mocks/${id}`);
  },

  patchMock(
    id: string,
    body: {
      title?: string;
      description?: string;
      catalog_number?: number;
      listening_parts?: number;
      reading_passages?: number;
      writing_tasks?: number;
      is_free?: boolean;
      exam_module?: "academic" | "general_training" | "both" | null;
    },
  ) {
    return adminCall<AdminMockListItem>(`/mocks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  patchMockStatus(id: string, status: string) {
    return adminCall(`/mocks/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  deleteMock(id: string) {
    return adminCall<{ ok: boolean; deleted_id: string }>(`/mocks/${id}`, {
      method: "DELETE",
    });
  },

  validateIngest(
    mockId: string,
    body: {
      module: string;
      part: number;
      data: Record<string, unknown>;
      audio_key?: string;
    },
  ) {
    return adminCall(`/mocks/${mockId}/ingest/validate`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async uploadListeningAudio(mockId: string, part: number, file: File) {
    const session = await adminCall<{
      ok: boolean;
      audio_key: string;
      upload_url: string;
      ticket: string;
      content_type: string;
    }>(`/mocks/${mockId}/ingest/audio-upload-url?part=${part}`, {
      method: "POST",
      body: JSON.stringify({
        size_bytes: file.size,
        content_type: file.type || "audio/mpeg",
      }),
    });
    if (!session.ticket || !session.upload_url) {
      throw new ApiError("Upload session is missing a Railway ticket. Redeploy the API.", 500);
    }
    await putFileToRailway(
      session.upload_url,
      file,
      session.content_type || "audio/mpeg",
      session.ticket,
    );
    return { ok: true as const, audio_key: session.audio_key };
  },

  checkListeningAudio(mockId: string, part: number, key?: string) {
    const q = new URLSearchParams({ part: String(part) });
    if (key?.trim()) q.set("key", key.trim());
    return adminCall<{
      audio_key: string;
      exists_in_r2: boolean;
      playable?: boolean;
      size_bytes?: number;
      part: number;
    }>(`/mocks/${mockId}/ingest/audio?${q}`);
  },

  publishIngest(
    mockId: string,
    body: {
      module: string;
      part: number;
      data: Record<string, unknown>;
      audio_key?: string;
    },
  ) {
    return adminCall(`/mocks/${mockId}/ingest/publish`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  loadReadingPassage(mockId: string, part: number) {
    return adminCall<ReadingPassageResponse>(
      `/mocks/${mockId}/reading/${part}`,
    );
  },

  saveReadingPassage(
    mockId: string,
    part: number,
    body: {
      passage_text: string;
      questions: ReadingBuilderQuestionIn[];
    },
  ) {
    return adminCall<{ ok: boolean; questions_written: number; part: number }>(
      `/mocks/${mockId}/reading/${part}/save`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  loadListeningPart(mockId: string, part: number) {
    return adminCall<ListeningPartResponse>(
      `/mocks/${mockId}/listening/${part}`,
    );
  },

  saveListeningPart(
    mockId: string,
    part: number,
    body: {
      audio_key: string;
      instructions?: string | null;
      questions: ListeningBuilderQuestionIn[];
    },
  ) {
    return adminCall<{
      ok: boolean;
      questions_written: number;
      part: number;
      audio_key: string;
    }>(`/mocks/${mockId}/listening/${part}/save`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  loadWritingPart(mockId: string, part: number) {
    return adminCall<WritingPartResponse>(`/mocks/${mockId}/writing/${part}`);
  },

  saveWritingPart(
    mockId: string,
    part: number,
    body: {
      prompt: string;
      question_type?: string | null;
      options?: Record<string, unknown> | null;
      image_url?: string | null;
    },
  ) {
    return adminCall<{
      ok: boolean;
      part: number;
      question_type: string;
      image_url: string | null;
    }>(`/mocks/${mockId}/writing/${part}/save`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  uploadWritingImage(mockId: string, part: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return adminMultipartCall<{
      ok: boolean;
      image_url: string;
      image_preview_url: string | null;
      image_name: string;
    }>(`/mocks/${mockId}/writing/${part}/image`, formData);
  },

  loadSpeakingPart(mockId: string, part: number) {
    return adminCall<SpeakingPartResponse>(`/mocks/${mockId}/speaking/${part}`);
  },

  saveSpeakingPart(
    mockId: string,
    part: number,
    body: {
      questions: Array<{
        prompt: string;
        speak_time_sec?: number | null;
        min_skip_sec?: number | null;
        prep_sec?: number | null;
        record_sec?: number | null;
        video_url?: string | null;
      }>;
    },
  ) {
    return adminCall<{
      ok: boolean;
      questions_written: number;
      part: number;
    }>(`/mocks/${mockId}/speaking/${part}/save`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  uploadSpeakingVideo(mockId: string, part: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return adminMultipartCall<{
      ok: boolean;
      video_url: string;
      video_preview_url: string | null;
      video_name: string;
      size_bytes: number;
      part: number;
    }>(`/mocks/${mockId}/speaking/${part}/video`, formData);
  },

  checkSpeakingVideo(mockId: string, part: number, key: string) {
    const q = new URLSearchParams({ key });
    return adminCall<{
      video_url: string;
      exists_in_r2: boolean;
      playable?: boolean;
      size_bytes?: number | null;
      part: number;
    }>(`/mocks/${mockId}/speaking/${part}/video?${q}`);
  },

  createQuestion(body: {
    mock_test_id: string;
    module: string;
    part: number;
    question_type: string;
    question_number: number;
    prompt: string;
    passage_text?: string;
    options?: Array<{ label: string; text: string }>;
    correct_answer?: string;
    skill_tag?: string;
  }) {
    return adminCall<{ id: string; question_number: number; question_type: string; prompt: string }>(
      "/questions",
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  updateQuestion(
    id: string,
    body: {
      question_type?: string;
      prompt?: string;
      options?: Array<{ label: string; text: string }> | null;
      correct_answer?: string;
      alt_answers?: string[];
      skill_tag?: string | null;
    },
  ) {
    return adminCall<{ id: string; question_number: number; question_type: string; prompt: string }>(
      `/questions/${id}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
  },

  deleteQuestion(id: string) {
    return adminCall<{ ok: boolean; deleted_id: string }>(`/questions/${id}`, {
      method: "DELETE",
    });
  },

  questionTree(mockId: string) {
    return adminCall<{ modules: unknown[] }>(`/mocks/${mockId}/questions`);
  },

  getQuestion(id: string) {
    return adminCall<Record<string, unknown>>(`/questions/${id}`);
  },

  patchQuestion(
    id: string,
    body: {
      prompt?: string;
      correct_answer?: string;
      explanation?: string;
      options?: Array<{ label: string; text: string }>;
    },
  ) {
    return adminCall(`/questions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  listSpeaking(params?: { status?: string; page?: number; page_size?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const suffix = q.toString() ? `?${q}` : "";
    return adminCall<{
      items: SpeakingReviewListItem[];
      total: number;
      page: number;
      page_size: number;
      pending_count: number;
    }>(`/speaking${suffix}`);
  },

  getSpeaking(id: string) {
    return adminCall<SpeakingReviewDetail>(`/speaking/${id}`);
  },

  patchSpeaking(
    id: string,
    body: {
      human_criteria_scores?: {
        fluency: number;
        lexical: number;
        grammar: number;
        pronunciation: number;
      };
      reviewer_notes?: string;
      status?: "in_review";
    },
  ) {
    return adminCall<SpeakingReviewDetail>(`/speaking/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  approveSpeaking(
    id: string,
    body: {
      human_criteria_scores: {
        fluency: number;
        lexical: number;
        grammar: number;
        pronunciation: number;
      };
      reviewer_notes?: string;
      audio_confirmed: boolean;
      confirmation: "confirm_final_approval";
      idempotency_key: string;
      ai_override_note?: string;
    },
  ) {
    return adminCall<SpeakingReviewDetail>(`/speaking/${id}/approve`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  listWriting(params?: { status?: string; page?: number; page_size?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const suffix = q.toString() ? `?${q}` : "";
    return adminCall<{
      items: WritingReviewListItem[];
      total: number;
      page: number;
      page_size: number;
      pending_count: number;
    }>(`/writing${suffix}`);
  },

  getWriting(id: string, source: "mock" | "diagnostic") {
    return adminCall<WritingReviewDetail>(
      `/writing/${id}?source=${encodeURIComponent(source)}`,
    );
  },

  patchWriting(
    id: string,
    source: "mock" | "diagnostic",
    body: {
      human_criteria_scores?: {
        task_achievement: number;
        coherence: number;
        lexical_resource: number;
        grammar: number;
      };
      reviewer_notes?: string;
      status?: "in_review";
    },
  ) {
    return adminCall<WritingReviewDetail>(
      `/writing/${id}?source=${encodeURIComponent(source)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
  },

  approveWriting(
    id: string,
    source: "mock" | "diagnostic",
    body: {
      human_criteria_scores: {
        task_achievement: number;
        coherence: number;
        lexical_resource: number;
        grammar: number;
      };
      reviewer_notes?: string;
    },
  ) {
    return adminCall<WritingReviewDetail>(
      `/writing/${id}/approve?source=${encodeURIComponent(source)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
  },

  retryWritingAi(id: string, source: "mock" | "diagnostic" = "mock") {
    return adminCall<WritingReviewDetail>(
      `/writing/${id}/retry-ai?source=${encodeURIComponent(source)}`,
      { method: "POST" },
    );
  },

  listDiagnostics(params?: {
    status?: string;
    q?: string;
    page?: number;
    page_size?: number;
  }) {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.q) q.set("q", params.q);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const suffix = q.toString() ? `?${q}` : "";
    return adminCall<{
      items: DiagnosticQueueItem[];
      total: number;
      page: number;
      page_size: number;
      pending_count: number;
    }>(`/diagnostics${suffix}`);
  },

  getDiagnostic(id: string) {
    return adminCall<DiagnosticDetail>(`/diagnostics/${id}`);
  },

  patchDiagnosticSpeaking(
    id: string,
    body: {
      human_criteria_scores: {
        fluency: number;
        lexical: number;
        grammar: number;
        pronunciation: number;
      };
      reviewer_notes?: string;
    },
  ) {
    return adminCall<DiagnosticDetail>(`/diagnostics/${id}/speaking`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  sendDiagnosticReport(id: string) {
    return adminCall<{ ok: boolean; sent_at: string; recipient: string }>(
      `/diagnostics/${id}/send-report`,
      { method: "POST" },
    );
  },

  listPayments(params?: { status?: string; page?: number; page_size?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const suffix = q.toString() ? `?${q}` : "";
    return adminCall<{
      items: AdminPaymentItem[];
      total: number;
      page: number;
      page_size: number;
    }>(`/payments${suffix}`);
  },

  paymentMetrics() {
    return adminCall<AdminPaymentMetrics>("/payments/metrics");
  },

  listSubscriptions(params?: { status?: string; page?: number; page_size?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page) q.set("page", String(params.page));
    if (params?.page_size) q.set("page_size", String(params.page_size));
    const suffix = q.toString() ? `?${q}` : "";
    return adminCall<{
      items: AdminSubscriptionItem[];
      total: number;
      page: number;
      page_size: number;
    }>(`/subscriptions${suffix}`);
  },

  listAuditLogs(page = 1) {
    return adminCall<{
      items: AuditLogItem[];
      total: number;
    }>(`/audit?page=${page}`);
  },

  getSpeakingHistory(reviewId: string) {
    return adminCall<{ items: ReviewHistoryItem[] }>(
      `/speaking/${reviewId}/history`,
    );
  },

  getWritingHistory(reviewId: string, source: "mock" | "diagnostic" = "mock") {
    return adminCall<{ items: ReviewHistoryItem[] }>(
      `/writing/${reviewId}/history?source=${source}`,
    );
  },

  reviewAnalytics(params?: { module?: "speaking" | "writing" | "all"; days?: number }) {
    const q = new URLSearchParams();
    if (params?.module) q.set("module", params.module);
    if (params?.days) q.set("days", String(params.days));
    const suffix = q.toString() ? `?${q}` : "";
    return adminCall<ReviewAnalyticsResponse>(`/review-analytics${suffix}`);
  },

  downloadReviewAnalyticsCsv(params?: {
    module?: "speaking" | "writing" | "all";
    days?: number;
  }) {
    const q = new URLSearchParams();
    if (params?.module) q.set("module", params.module);
    if (params?.days) q.set("days", String(params.days));
    const suffix = q.toString() ? `?${q}` : "";
    return adminDownload(
      `/exports/review-analytics.csv${suffix}`,
      "review-analytics.csv",
    );
  },

  downloadUsersOverviewCsv() {
    return adminDownload("/exports/users-overview.csv", "users-overview.csv");
  },

  listQuestionBank(skill: string) {
    return adminCall<QuestionBankListResponse>(
      `/question-bank?skill=${encodeURIComponent(skill)}`,
    );
  },

  listQuestionBankDraftQueue() {
    return adminCall<QuestionBankDraftQueueResponse>(
      "/question-bank/draft-queue",
    );
  },

  createQuestionBankSet(body: {
    skill: string;
    title: string;
    description?: string | null;
    status?: "draft" | "published" | "archived";
    difficulty?: "easy" | "medium" | "hard";
    exam_module?: "academic" | "general_training" | "both" | null;
  }) {
    return adminCall<QuestionBankCreateSetResponse>(`/question-bank/sets`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  patchQuestionBankSet(
    setId: string,
    body: { exam_module: "academic" | "general_training" | "both" },
  ) {
    return adminCall<{
      set_id: string;
      skill: string;
      exam_module: "academic" | "general_training" | "both" | null;
      ok: boolean;
    }>(`/question-bank/sets/${setId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  patchQuestionBankSetStatus(
    setId: string,
    status: "draft" | "published" | "archived",
  ) {
    return adminCall<{
      set_id: string;
      skill: string;
      status: string;
      ok: boolean;
    }>(`/question-bank/sets/${setId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  deleteQuestionBankSet(setId: string) {
    return adminCall<{ ok: boolean; deleted_id: string }>(
      `/question-bank/sets/${setId}`,
      { method: "DELETE" },
    );
  },

  getQuestionBankSet(setId: string) {
    return adminCall<QuestionBankSetItem>(`/question-bank/sets/${setId}`);
  },

  loadBankListeningPart(setId: string, part: number) {
    return adminCall<BankListeningPartResponse>(
      `/question-bank/sets/${setId}/listening/${part}`,
    );
  },

  saveBankListeningPart(
    setId: string,
    part: number,
    body: {
      audio_key: string;
      instructions?: string | null;
      questions: ListeningBuilderQuestionIn[];
    },
  ) {
    return adminCall<{
      ok: boolean;
      questions_written: number;
      part: number;
      audio_key: string;
    }>(`/question-bank/sets/${setId}/listening/${part}/save`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async uploadBankListeningAudio(setId: string, part: number, file: File) {
    const session = await adminCall<{
      ok: boolean;
      audio_key: string;
      upload_url: string;
      ticket: string;
      content_type: string;
      part: number;
    }>(`/question-bank/sets/${setId}/listening/${part}/audio-upload-url`, {
      method: "POST",
      body: JSON.stringify({
        size_bytes: file.size,
        content_type: file.type || "audio/mpeg",
      }),
    });
    if (!session.ticket || !session.upload_url) {
      throw new ApiError("Upload session is missing a Railway ticket. Redeploy the API.", 500);
    }
    await putFileToRailway(
      session.upload_url,
      file,
      session.content_type || "audio/mpeg",
      session.ticket,
    );
    return {
      ok: true as const,
      audio_key: session.audio_key,
      part: session.part ?? part,
    };
  },

  checkBankListeningAudio(setId: string, part: number, audioKey?: string) {
    const q = audioKey
      ? `?audio_key=${encodeURIComponent(audioKey)}`
      : "";
    return adminCall<{
      audio_key: string;
      exists_in_r2: boolean;
      playable: boolean;
      size_bytes: number;
      part: number;
    }>(`/question-bank/sets/${setId}/listening/${part}/audio-status${q}`);
  },

  bankListeningPlayUrl(setId: string, part: number, audioKey?: string, cacheBust?: number) {
    const params = new URLSearchParams();
    if (audioKey) params.set("audio_key", audioKey);
    if (cacheBust) params.set("v", String(cacheBust));
    const q = params.toString();
    return `/api/admin/question-bank/sets/${setId}/listening/${part}/audio-play${q ? `?${q}` : ""}`;
  },

  mockListeningPlayUrl(mockId: string, part: number, audioKey?: string, cacheBust?: number) {
    const params = new URLSearchParams();
    if (audioKey) params.set("audio_key", audioKey);
    if (cacheBust) params.set("v", String(cacheBust));
    const q = params.toString();
    return `/api/admin/mocks/${mockId}/listening/${part}/audio-play${q ? `?${q}` : ""}`;
  },

  bankWritingImagePlayUrl(setId: string, part: number, imageKey?: string, cacheBust?: number) {
    const params = new URLSearchParams();
    if (imageKey) params.set("image_key", imageKey);
    if (cacheBust) params.set("v", String(cacheBust));
    const q = params.toString();
    return `/api/admin/question-bank/sets/${setId}/writing/${part}/image-play${q ? `?${q}` : ""}`;
  },

  mockWritingImagePlayUrl(mockId: string, part: number, imageKey?: string, cacheBust?: number) {
    const params = new URLSearchParams();
    if (imageKey) params.set("image_key", imageKey);
    if (cacheBust) params.set("v", String(cacheBust));
    const q = params.toString();
    return `/api/admin/mocks/${mockId}/writing/${part}/image-play${q ? `?${q}` : ""}`;
  },

  createBankWatchVideoDirectUpload(
    setId: string,
    body: { upload_length: number; title?: string },
  ) {
    const q = new URLSearchParams({
      upload_length: String(body.upload_length),
      title: body.title || "Set Watch explainer",
    });
    return adminCall<{ uid: string; uploadURL: string; set_id: string }>(
      `/question-bank/sets/${setId}/watch-video/direct-upload?${q}`,
      { method: "POST" },
    );
  },

  completeBankWatchVideo(
    setId: string,
    body: { stream_uid: string; title?: string; duration_min?: number },
  ) {
    const q = new URLSearchParams({
      stream_uid: body.stream_uid,
      title: body.title || "Set Watch explainer",
      duration_min: String(body.duration_min ?? 0),
    });
    return adminCall<{
      ok: boolean;
      intro_stream_uid: string;
      preview_url: string;
      status: string;
      locked: boolean;
      provider: string;
    }>(`/question-bank/sets/${setId}/watch-video/complete?${q}`, {
      method: "POST",
    });
  },

  checkBankWatchVideo(setId: string) {
    return adminCall<{
      intro_stream_uid: string | null;
      exists: boolean;
      playable: boolean;
      preview_url: string | null;
      status: string | null;
      locked: boolean;
      provider: string;
    }>(`/question-bank/sets/${setId}/watch-video-status`);
  },

  loadBankReadingPart(setId: string, part: number) {
    return adminCall<BankReadingPartResponse>(
      `/question-bank/sets/${setId}/reading/${part}`,
    );
  },

  saveBankReadingPart(
    setId: string,
    part: number,
    body: { passage_text: string; questions: ReadingBuilderQuestionIn[] },
  ) {
    return adminCall<{ ok: boolean; questions_written: number; part: number }>(
      `/question-bank/sets/${setId}/reading/${part}/save`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  loadBankWritingPart(setId: string, part: number) {
    return adminCall<BankWritingPartResponse>(
      `/question-bank/sets/${setId}/writing/${part}`,
    );
  },

  saveBankWritingPart(
    setId: string,
    part: number,
    body: {
      prompt: string;
      question_type?: string | null;
      options?: Record<string, unknown> | null;
      image_url?: string | null;
      exam_module?: "academic" | "general_training" | "both" | null;
    },
  ) {
    return adminCall<{
      ok: boolean;
      part: number;
      question_type: string;
      image_url: string | null;
    }>(`/question-bank/sets/${setId}/writing/${part}/save`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  uploadBankWritingImage(setId: string, part: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return adminMultipartCall<{
      ok: boolean;
      image_url: string;
      image_preview_url?: string | null;
      image_name?: string;
    }>(`/question-bank/sets/${setId}/writing/${part}/image`, formData);
  },

  loadBankSpeakingPart(setId: string, part: number) {
    return adminCall<BankSpeakingPartResponse>(
      `/question-bank/sets/${setId}/speaking/${part}`,
    );
  },

  saveBankSpeakingPart(
    setId: string,
    part: number,
    body: {
      questions: Array<{
        prompt: string;
        speak_time_sec?: number | null;
        min_skip_sec?: number | null;
        prep_sec?: number | null;
        record_sec?: number | null;
        video_url?: string | null;
      }>;
    },
  ) {
    return adminCall<{ ok: boolean; questions_written: number; part: number }>(
      `/question-bank/sets/${setId}/speaking/${part}/save`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  uploadBankSpeakingVideo(setId: string, part: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return adminMultipartCall<{
      ok: boolean;
      video_url: string;
      video_preview_url?: string | null;
      video_name?: string;
    }>(`/question-bank/sets/${setId}/speaking/${part}/video`, formData);
  },

  listStreamVideos() {
    return adminCall<{ items: StreamVideoItem[] }>("/stream/videos");
  },

  listStreamLibrary() {
    return adminCall<{ items: StreamLibraryItem[] }>("/stream/library");
  },

  createStreamDirectUpload(body: {
    tag: StreamVideoTag;
    title: string;
    max_duration_seconds?: number;
    upload_length?: number;
  }) {
    return adminCall<StreamDirectUploadResponse>("/stream/direct-upload", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  completeStreamVideo(body: {
    tag: StreamVideoTag;
    title: string;
    stream_uid: string;
    duration_min?: number;
  }) {
    return adminCall<StreamVideoItem>("/stream/videos/complete", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  deleteStreamLibraryVideo(uid: string) {
    return adminCall<{
      ok: boolean;
      uid: string;
      unassigned_tag: string | null;
      hubs_updated: number;
    }>(`/stream/library/${encodeURIComponent(uid)}`, {
      method: "DELETE",
    });
  },
};

export function defaultBankListeningAudioKey(setId: string, part: number): string {
  return `bank/${setId}/listening/part${part}/audio.mp3`;
}
