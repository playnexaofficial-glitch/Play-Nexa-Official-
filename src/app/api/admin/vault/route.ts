import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const show = req.nextUrl.searchParams.get('show')

    // Fetch single key to reveal/copy
    if (id) {
      const { data, error } = await supabaseAdmin
        .from('api_vault')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return NextResponse.json({ key: data })
    }

    const service = req.nextUrl.searchParams.get('service') || 'all'
    let query = supabaseAdmin
      .from('api_vault')
      .select('id,service,key_name,key_value,description,guide,risk_level,is_active,updated_at,created_at')

    if (service !== 'all') {
      query = query.eq('service', service.toLowerCase())
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error

    // Mask keys on the server side unless specifically requested (handled above)
    const maskedData = (data || []).map((item: any) => {
      const val = item.key_value || ''
      const masked = val.length > 8 ? `${val.slice(0, 4)}••••••••${val.slice(-4)}` : '••••••••'
      return {
        ...item,
        masked_value: masked,
        // Make sure we include key_value for compatibility
        key_value: masked,
      }
    })

    return NextResponse.json({ keys: maskedData })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { key_name, key_value, service = 'supabase', description = '', guide = '', risk_level = 'medium' } = body

    if (!key_name || !key_value) {
      return NextResponse.json(
        { error: 'key_name and key_value required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('api_vault')
      .insert([
        {
          key_name: key_name.trim(),
          key_value: key_value.trim(),
          service: service.toLowerCase(),
          description,
          guide,
          risk_level,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ key: data, success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, key_value, key_name, service, description, guide, risk_level } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (key_value !== undefined) updates.key_value = key_value
    if (key_name !== undefined) updates.key_name = key_name
    if (service !== undefined) updates.service = service
    if (description !== undefined) updates.description = description
    if (guide !== undefined) updates.guide = guide
    if (risk_level !== undefined) updates.risk_level = risk_level

    const { data, error } = await supabaseAdmin
      .from('api_vault')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, key: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin.from('api_vault').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
