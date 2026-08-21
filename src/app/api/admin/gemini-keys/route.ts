import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('gemini_keys')
      .select(
        'id,key_name,is_active,status,usage_count,quota_used,last_used,sort_order,created_at'
      )
      .order('sort_order')
    if (error) throw error
    return NextResponse.json({ keys: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { key_name, api_key } = await req.json()
    if (!key_name?.trim() || !api_key?.trim()) {
      return NextResponse.json(
        { error: 'key_name and api_key required' },
        { status: 400 }
      )
    }
    const { count } = await supabaseAdmin
      .from('gemini_keys')
      .select('*', { count: 'exact', head: true })
    if ((count || 0) >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 keys allowed' },
        { status: 400 }
      )
    }
    const { data, error } = await supabaseAdmin
      .from('gemini_keys')
      .insert([
        {
          key_name: key_name.trim(),
          api_key: api_key.trim(),
          status: (count || 0) === 0 ? 'active' : 'standby',
          is_active: (count || 0) === 0,
          sort_order: count || 0,
        },
      ])
      .select('id,key_name,status,is_active')
      .single()
    if (error) throw error
    return NextResponse.json({ key: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, action } = await req.json()
    if (action === 'activate') {
      await supabaseAdmin
        .from('gemini_keys')
        .update({ is_active: false, status: 'standby' })
        .neq('id', id)
      const { error } = await supabaseAdmin
        .from('gemini_keys')
        .update({ is_active: true, status: 'active' })
        .eq('id', id)
      if (error) throw error
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin
      .from('gemini_keys')
      .delete()
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
