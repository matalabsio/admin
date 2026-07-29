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

  uploadListeningAudio(mockId: string, part: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return adminMultipartCall<{ ok: boolean; audio_key: string }>(
      `/mocks/${mockId}/ingest/audio?part=${part}`,
      formData,
    );
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
};
