import { NextRequest, NextResponse }
  from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
)

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams
    .get('q') || ''
  if (!q.trim()) {
    return NextResponse.json({ results: [] })
  }
  const search = q.trim()

  // Title search (primary)
  const { data: t1 } = await supabase
    .from('movies')
    .select('id,youtube_id,title,thumbnail,' +
      'channel_name,watch_count,created_at')
    .eq('is_hidden', false)
    .ilike('title', `%${search}%`)
    .order('watch_count', { ascending: false })
    .limit(15)

  // Channel name
  const { data: t2 } = await supabase
    .from('movies')
    .select('id,youtube_id,title,thumbnail,' +
      'channel_name,watch_count,created_at')
    .eq('is_hidden', false)
    .ilike('channel_name', `%${search}%`)
    .limit(8)

  // Description (plot/content keywords)
  const { data: t3 } = await supabase
    .from('movies')
    .select('id,youtube_id,title,thumbnail,' +
      'channel_name,watch_count,created_at')
    .eq('is_hidden', false)
    .ilike('description', `%${search}%`)
    .limit(8)

  const seen = new Set<string>()
  const merged: any[] = []
  const combined = [
    ...(t1 as any[] || []), 
    ...(t2 as any[] || []), 
    ...(t3 as any[] || [])
  ]
  for (const m of combined) {
    if (!seen.has(m.id)) {
      seen.add(m.id)
      merged.push(m)
    }
  }

  return NextResponse.json({
    results: merged,
    total: merged.length,
    query: search,
  })
}
