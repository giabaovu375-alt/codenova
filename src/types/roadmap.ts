// types/roadmap.ts
// Khớp đúng schema Supabase thực tế của project

export type Level = 'Cơ bản' | 'Trung cấp' | 'Nâng cao'

// Bảng: lessons
export interface Lesson {
  sên: string                                       // slug, primary key
  tiêu_đề: string                                   // title
  mức_độ: Level | null
  ngôn_ngữ: string | null                           // "javascript", "python"...
  sự_miêu_tả: string | null
  hình_ảnh: string | null
  khối: Record<string, unknown>[] | null            // jsonb — nội dung bài
  bài_tập: Record<string, unknown>[] | null         // jsonb
  created_at: string
}

// Bảng: tiến trình bài học  (tên thật trong DB — kiểm tra lại nếu tên bảng khác)
export interface LessonProgress {
  nhận_dạng: number          // id serial
  user_id: string
  lesson_slug: string        // FK → lessons.sên
  khởi_doc: number | null
  tổng_số_khối: number | null
  điểm_tốt_nhất: number | null
  hoàn_thành: boolean
  updated_at: string
}

// ---- Dùng trong UI ----
export interface LessonWithProgress extends Lesson {
  is_completed: boolean
  progress: LessonProgress | null
}
