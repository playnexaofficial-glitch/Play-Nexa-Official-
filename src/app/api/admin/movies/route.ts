import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') || ''
  const idsOnly = req.nextUrl.searchParams.get('ids_only') === 'true'

  try {
    if (idsOnly) {
      const { data } = await supabaseAdmin.from('movies').select('youtube_id')
      return NextResponse.json({
        ids: (data || []).map((m: any) => m.youtube_id),
      })
    }

    let query = supabaseAdmin
      .from('movies')
      .select(
        'id,youtube_id,title,thumbnail,channel_name,channel_id,is_hidden,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(100)

    if (search.trim()) {
      query = query.ilike('title', `%${search.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, is_hidden } = await req.json()
    const { error } = await supabaseAdmin
      .from('movies')
      .update({ is_hidden })
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const id = body.id || req.nextUrl.searchParams.get('id')
    const { error } = await supabaseAdmin.from('movies').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
