import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const isUUID = (str: string | null): boolean => {
  if (!str) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// ── GET: Fetch audit logs ──
export async function GET(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database client not initialized' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const actionFilter = searchParams.get('action')
    const searchFilter = searchParams.get('search')

    let query = supabaseAdmin
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (actionFilter) {
      query = query.eq('action', actionFilter)
    }

    if (searchFilter) {
      query = query.or(`target.ilike.%${searchFilter}%,action.ilike.%${searchFilter}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Audit API GET] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, logs: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// ── POST: Insert a new audit log ──
export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database client not initialized' }, { status: 500 })
    }

    const body = await req.json()
    const { action, target, details = {}, adminId, adminEmail } = body

    if (!action || !target) {
      return NextResponse.json({ error: 'Action and Target are required' }, { status: 400 })
    }

    const validAdminId = isUUID(adminId) ? adminId : null
    const logDetails = {
      ...details,
      ...(adminEmail ? { admin_email: adminEmail } : {}),
      ...(!isUUID(adminId) && adminId ? { firebase_uid: adminId } : {}),
      ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'Unknown',
    }

    const { error } = await supabaseAdmin
      .from('admin_activity_log')
      .insert([{
        admin_id: validAdminId,
        action,
        target,
        details: logDetails,
        created_at: new Date().toISOString()
      }])

    if (error) {
      console.error('[Audit API POST] Error inserting log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
