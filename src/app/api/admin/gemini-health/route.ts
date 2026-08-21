// ── Play Nexa — Gemini Key Health Check API ──────────────────────
// Tests a Gemini API key with a minimal API call
// Updates key status based on result (exhausted/standby)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const { keyId } = await req.json()

    if (!keyId || !supabaseAdmin) {
      return NextResponse.json({
        healthy: false,
        error: 'Key ID required',
      })
    }

    const { data: key } = await supabaseAdmin
      .from('gemini_keys')
      .select('*')
      .eq('id', keyId)
      .single()

    if (!key) {
      return NextResponse.json({
        healthy: false,
        error: 'Key not found',
      })
    }

    try {
      const genAI = new GoogleGenerativeAI(key.api_key)
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
      })

      // Minimal test call
      const result = await model.generateContent('Reply with exactly: OK')
      const text = result.response.text()

      const healthy = text.toLowerCase().includes('ok')

      // If key is working and was exhausted, reset it
      if (healthy && key.status === 'exhausted') {
        await supabaseAdmin
          .from('gemini_keys')
          .update({ status: 'standby', quota_used: 0 })
          .eq('id', keyId)
      }

      return NextResponse.json({
        healthy,
        keyName: key.key_name,
        response: text.slice(0, 50),
      })
    } catch (err: any) {
      const isExhausted =
        err.message?.includes('quota') ||
        err.message?.includes('429') ||
        err.message?.includes('limit') ||
        err.message?.includes('exceeded')

      if (isExhausted) {
        await supabaseAdmin
          .from('gemini_keys')
          .update({ status: 'exhausted', quota_used: 100 })
          .eq('id', keyId)
      }

      return NextResponse.json({
        healthy: false,
        keyName: key.key_name,
        error: err.message?.slice(0, 200),
        exhausted: isExhausted,
      })
    }
  } catch (err: any) {
    return NextResponse.json({
      healthy: false,
      error: err?.message || 'Unknown error',
    })
  }
}
