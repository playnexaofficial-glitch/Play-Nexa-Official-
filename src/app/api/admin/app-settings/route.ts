import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('*')
      .order('key')
    if (error) throw error
    return NextResponse.json({ data: data || [], settings: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, key, value } = body

    if (!id && !key) {
      return NextResponse.json({ error: 'id or key required' }, { status: 400 })
    }

    if (key) {
      const { data, error } = await supabaseAdmin
        .from('app_settings')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' })
        .select()
        .single()
      if (error) throw error
      return NextResponse.json({ success: true, setting: data, data })
    }

    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .update({
        value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ success: true, setting: data, data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
