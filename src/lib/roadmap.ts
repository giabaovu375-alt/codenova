// lib/roadmap.ts
// Query layer — khớp đúng schema thực tế của project
// Sửa đường dẫn createClient nếu khác

import { createClient } from '@/lib/supabase/server'
import type { Lesson, LessonWithProgress, LessonProgress } from '@/types/roadmap'

// ⚠️ Kiểm tra lại tên bảng progress trong Supabase của bạn
// Nhìn trong screenshot thấy tên bảng tiếng Việt — thay đúng vào đây
const PROGRESS_TABLE = 'lesson_progress'
const LESSONS_TABLE  = 'lessons'


// ============================================================
// getLessonsByLanguage
// Lấy tất cả bài học theo ngôn ngữ (lộ trình)
// VD: ngôn_ngữ = "javascript" | "python" | "css"
// ============================================================
export async function getLessonsByLanguage(
  language: string,
  userId: string | null
): Promise<LessonWithProgress[]> {
  const supabase = createClient()

  // 1. Lấy lessons theo ngôn ngữ
  const { data: lessons, error: lessonError } = await supabase
    .from(LESSONS_TABLE)
    .select('*')
    .eq('ngôn_ngữ', language)
    .order('created_at')           // ⚠️ nếu bạn có cột order thì đổi lại

  if (lessonError) throw new Error(`getLessons: ${lessonError.message}`)

  const lessonList: Lesson[] = lessons ?? []
  if (lessonList.length === 0) return []

  // 2. Lấy progress của user nếu đã login
  let progressMap = new Map<string, LessonProgress>()

  if (userId) {
    const slugs = lessonList.map((l) => l.sên)

    const { data: progressData, error: progressError } = await supabase
      .from(PROGRESS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .in('lesson_slug', slugs)

    if (progressError) throw new Error(`getProgress: ${progressError.message}`)

    progressMap = new Map(
      (progressData ?? []).map((p: LessonProgress) => [p.lesson_slug, p])
    )
  }

  // 3. Merge lessons + progress
  return lessonList.map((lesson) => {
    const progress = progressMap.get(lesson.sên) ?? null
    return {
      ...lesson,
      is_completed: progress?.hoàn_thành ?? false,
      progress,
    }
  })
}


// ============================================================
// getLesson
// Lấy 1 bài học theo slug
// Dùng ở trang /learn/[lesson-slug]
// ============================================================
export async function getLesson(slug: string): Promise<Lesson | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from(LESSONS_TABLE)
    .select('*')
    .eq('sên', slug)
    .single()

  if (error || !data) return null
  return data
}


// ============================================================
// markLessonComplete
// Upsert progress — gọi khi user hoàn thành bài
// ============================================================
export async function markLessonComplete(
  userId: string,
  lessonSlug: string,
  completed: boolean
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from(PROGRESS_TABLE)
    .upsert(
      {
        user_id: userId,
        lesson_slug: lessonSlug,
        hoàn_thành: completed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,lesson_slug' }   // unique constraint
    )

  if (error) throw new Error(`markComplete: ${error.message}`)
}


// ============================================================
// getUserProgress
// Lấy toàn bộ progress của 1 user — dùng cho dashboard
// ============================================================
export async function getUserProgress(userId: string): Promise<LessonProgress[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from(PROGRESS_TABLE)
    .select('*')
    .eq('user_id', userId)

  if (error) throw new Error(`getUserProgress: ${error.message}`)
  return data ?? []
}
