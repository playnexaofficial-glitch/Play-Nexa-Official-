// ── Play Nexa Admin — Feedback AI Route ──────────────────────────
// AI-powered feedback analysis: priority, spam, duplicates, spikes
// Server-side only — never exposes keys to client

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const { category, description, userId } = await req.json()

    if (!category || !description) {
      return NextResponse.json({ success: false, message: 'Missing fields' })
    }

    let priority = 'medium'
    let aiSummary = ''
    let aiVerified = false
    let isDuplicate = false
    let duplicateOf: string | null = null

    // ── AI Analysis ──

    try {
      let apiKey = ''

      // Get active Gemini key from DB
      if (supabaseAdmin) {
        const { data: activeKey } = await supabaseAdmin
          .from('gemini_keys')
          .select('api_key')
          .eq('is_active', true)
          .single()

        if (activeKey?.api_key) {
          apiKey = activeKey.api_key
        }
      }

      // Fallback to env key
      if (!apiKey) {
        apiKey = process.env.GEMINI_API_KEY || ''
      }

      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
        })

        const prompt = `
Analyze this user feedback for Play Nexa app:
Category: ${category}
Description: "${description}"

Respond ONLY in valid JSON format:
{
  "is_real_issue": true/false,
  "priority": "high"/"medium"/"low",
  "summary": "one line summary in Bengali",
  "is_spam": true/false
}

Priority rules:
- high: app crash, nothing loads, login broken, data loss
- medium: feature not working properly, slow performance
- low: suggestion, minor issue, cosmetic, feature request
`
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        const jsonMatch = text.match(/\{[\s\S]*?\}/)

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          priority = parsed.priority || 'medium'
          aiSummary = parsed.summary || ''
          aiVerified = !!parsed.is_real_issue

          if (parsed.is_spam) {
            return NextResponse.json({
              success: true,
              message: 'Thank you for your feedback!',
            })
          }
        }
      }
    } catch (aiErr) {
      // AI analysis failed — continue without it
      console.error('Feedback AI error:', aiErr)
    }

    // ── Duplicate Detection ──

    if (supabaseAdmin) {
      try {
        const { data: recent } = await supabaseAdmin
          .from('user_feedback')
          .select('id, description')
          .eq('category', category)
          .eq('status', 'open')
          .gte('created_at', new Date(Date.now() - 86400000).toISOString())
          .limit(10)

        if (recent && recent.length > 0) {
          const similar = recent.find(f =>
            f.description.toLowerCase().includes(
              description.toLowerCase().slice(0, 20)
            )
          )
          if (similar) {
            isDuplicate = true
            duplicateOf = similar.id

            // Increment same_issue_count on the original
            const { data: origData } = await supabaseAdmin
              .from('user_feedback')
              .select('same_issue_count')
              .eq('id', similar.id)
              .single()

            if (origData) {
              await supabaseAdmin
                .from('user_feedback')
                .update({
                  same_issue_count: (origData.same_issue_count || 1) + 1,
                })
                .eq('id', similar.id)
            }
          }
        }
      } catch (dupErr) {
        console.error('Duplicate check error:', dupErr)
      }
    }

    // ── Save feedback ──

    if (supabaseAdmin) {
      await supabaseAdmin.from('user_feedback').insert([
        {
          user_id: userId || null,
          category,
          description,
          ai_verified: aiVerified,
          is_duplicate: isDuplicate,
          duplicate_of: duplicateOf,
          priority,
          ai_summary: aiSummary,
          status: 'open',
        },
      ])

      // ── Spike detection (5+ same category high priority in 1 hour) ──

      try {
        const { count } = await supabaseAdmin
          .from('user_feedback')
          .select('*', { count: 'exact', head: true })
          .eq('category', category)
          .eq('priority', 'high')
          .gte(
            'created_at',
            new Date(Date.now() - 3600000).toISOString()
          )

        if ((count || 0) >= 5) {
          await supabaseAdmin.from('admin_activity_log').insert([
            {
              action: 'FEEDBACK_SPIKE',
              target: category,
              details: {
                count,
                message: `${count} high priority ${category} reports in 1 hour!`,
              },
            },
          ])
        }
      } catch (spikeErr) {
        console.error('Spike detection error:', spikeErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
    })
  } catch (err: any) {
    console.error('Feedback API error:', err?.message)
    return NextResponse.json({
      success: false,
      message: 'Failed to process feedback',
    })
  }
}
