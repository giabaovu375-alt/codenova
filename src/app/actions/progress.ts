'use server'

import { createClient } from '@/lib/supabase/server'
import { markLessonComplete } from '@/lib/roadmap'
import { revalidatePath } from 'next/cache'

export async function toggleProgressAction(
  lessonSlug: string,
  completed: boolean,
  pathToRevalidate: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  try {
    await markLessonComplete(user.id, lessonSlug, completed)
    revalidatePath(pathToRevalidate)
    return { error: null }
  } catch (err) {
    return { error: (err as Error).message }
  }
}
