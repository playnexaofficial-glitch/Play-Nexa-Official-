import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const priority = req.nextUrl.searchParams.get('priority')
    const status = req.nextUrl.searchParams.get('status')
    const type = req.nextUrl.searchParams.get('type')

    let query = supabaseAdmin
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ feedback: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, admin_reply } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (status !== undefined) updates.status = status
    if (admin_reply !== undefined) updates.admin_reply = admin_reply

    const { data, error } = await supabaseAdmin
      .from('user_feedback')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, feedback: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const id = body.id || req.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('user_feedback')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
