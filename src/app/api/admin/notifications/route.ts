import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    let { data, error } = await supabaseAdmin
      .from('notifications_log')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(30)

    if (error) {
      const fallback = await supabaseAdmin
        .from('notification_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)
      
      const formatted = (fallback.data || []).map((item: any) => ({
        ...item,
        body: item.body || item.message,
        sent_at: item.sent_at || item.created_at,
        sent_to: item.sent_to || item.target || 'all',
      }))
      return NextResponse.json({ data: formatted, notifications: formatted })
    }

    const formatted = (data || []).map((item: any) => ({
      ...item,
      body: item.body || item.message,
      sent_at: item.sent_at || item.created_at,
      sent_to: item.sent_to || item.target || 'all',
    }))

    return NextResponse.json({ data: formatted, notifications: formatted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, body, message, target } = await req.json()

    const msg = body || message || ''

    if (!title?.trim() || !msg?.trim()) {
      return NextResponse.json(
        { error: 'Title and body required' },
        { status: 400 }
      )
    }

    // Count active subscribers (handling gracefully if table doesn't exist)
    let count = 0
    try {
      const subRes = await supabaseAdmin
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      count = subRes.count || 0
    } catch {}

    const newNotification = {
      title: title.trim(),
      message: msg.trim(),
      body: msg.trim(),
      sent_to: target || 'all',
      target: target || 'all',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      sent_count: count,
    }

    let { error } = await supabaseAdmin
      .from('notifications_log')
      .insert([newNotification])

    if (error) {
      const fallback = await supabaseAdmin
        .from('notification_log')
        .insert([newNotification])
      if (fallback.error) throw fallback.error
    }

    return NextResponse.json({
      success: true,
      sent_to: count,
      message: `Notification logged. ${count} subscribers will receive it.`
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json().catch(() => ({}))
    const finalId = id || req.nextUrl.searchParams.get('id')
    if (!finalId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    let { error } = await supabaseAdmin.from('notifications_log').delete().eq('id', finalId)
    if (error) {
      await supabaseAdmin.from('notification_log').delete().eq('id', finalId)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
