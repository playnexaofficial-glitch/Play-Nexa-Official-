import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search') || ''
    const userId = req.nextUrl.searchParams.get('userId')
    const statsOnly = req.nextUrl.searchParams.get('stats') === 'true'

    if (userId && statsOnly) {
      const [watchRes, favRes] = await Promise.allSettled([
        supabaseAdmin
          .from('watch_history')
          .select('id,movie_id,created_at,movies(id,title,thumbnail)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabaseAdmin
          .from('user_favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

      const history = watchRes.status === 'fulfilled' ? watchRes.value.data || [] : []
      const favCount = favRes.status === 'fulfilled' ? favRes.value.count || 0 : 0

      return NextResponse.json({
        stats: {
          watched: history.length,
          liked: favCount,
          watchlist: 0,
        },
        history,
      })
    }

    let query = supabaseAdmin
      .from('user_profiles')
      .select('id,auth_user_id,display_name,email,auth_provider,created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (search.trim()) {
      query = query.or(`email.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw error

    // Map to normalized shape
    const formatted = (data || []).map((u: any) => ({
      id: u.id,
      email: u.email || 'No email',
      created_at: u.created_at,
      last_sign_in_at: u.created_at,
      banned_until: null,
      user_metadata: {
        full_name: u.display_name,
        avatar_url: '',
      },
    }))

    return NextResponse.json({
      data: formatted,
      users: formatted,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', userId)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
