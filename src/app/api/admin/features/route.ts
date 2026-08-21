import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_features')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error
    return NextResponse.json({ data: data || [], features: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, is_enabled, label, coming_soon_message, lock_reason, sort_order } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (status !== undefined) updates.status = status
    if (is_enabled !== undefined) updates.is_enabled = is_enabled
    if (label !== undefined) updates.label = label
    if (coming_soon_message !== undefined) updates.coming_soon_message = coming_soon_message
    if (lock_reason !== undefined) updates.lock_reason = lock_reason
    if (sort_order !== undefined) updates.sort_order = sort_order

    const { data, error } = await supabaseAdmin
      .from('app_features')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, feature: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
