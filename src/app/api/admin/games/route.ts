import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Smart game info fetcher using oEmbed/meta
async function fetchGameInfo(url: string) {
  try {
    // Clean URL
    const cleanUrl = url.trim().split('?')[0]

    // Try to fetch page metadata
    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null
    const html = await res.text()

    // Extract title
    const titleMatch =
      html.match(/<title[^>]*>(.*?)<\/title>/i) ||
      html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ||
      html.match(/<meta[^>]*name="title"[^>]*content="([^"]+)"/i)
    const title = titleMatch?.[1]
      ?.replace(' - Apps on Google Play', '')
      ?.replace(' | Google Play', '')
      ?.replace(' - Play Store', '')
      ?.trim() || null

    // Extract description
    const descMatch =
      html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
      html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)
    const description = descMatch?.[1]?.trim() || null

    // Extract image
    const imgMatch =
      html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
      html.match(/<meta[^>]*name="thumbnail"[^>]*content="([^"]+)"/i)
    const cover_url = imgMatch?.[1] || null

    // Detect game type from URL
    let game_type = 'online'
    if (cleanUrl.includes('play.google.com'))
      game_type = 'download'
    else if (cleanUrl.includes('apk') || cleanUrl.endsWith('.apk'))
      game_type = 'offline'

    return { title, description, cover_url, game_type }
  } catch { return null }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    console.error('[games GET]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Smart auto-detect from URL
    if (body.url && !body.name) {
      const info = await fetchGameInfo(body.url)
      if (info?.title) {
        body.name = info.title
        body.description = info.description || ''
        body.cover_url = info.cover_url || ''
        body.game_type = info.game_type || 'online'
      }
    }

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Could not detect game name. Please enter manually.' },
        { status: 400 }
      )
    }

    // Determine URLs
    const url = body.url?.trim() || ''
    const isApk = url.endsWith('.apk')
    const isPlayStore = url.includes('play.google.com')

    const { data, error } = await supabaseAdmin
      .from('games')
      .insert([{
        name: body.name.trim(),
        description: body.description || '',
        category: body.category || 'Action',
        game_type: body.game_type || 'online',
        cover_url: body.cover_url || '',
        apk_url: isApk || isPlayStore ? url : '',
        web_url: (!isApk && !isPlayStore) ? url : '',
        is_free: true,
        is_hidden: false,
        is_featured: false,
        size: body.size || '0 MB',
        version: body.version || '1.0',
      }])
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('[games POST]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...updates } = body
    const { error } = await supabaseAdmin
      .from('games')
      .update(updates)
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabaseAdmin
      .from('games')
      .delete()
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
