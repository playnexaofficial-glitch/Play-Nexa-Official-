import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

const SYSTEM = `You are Play Nexa AI Assistant.
You help the admin with:
- Supabase SQL queries for Play Nexa
- Bug fixing for Next.js/TypeScript
- App feature explanations
- Code generation

App Stack: Next.js 15, TypeScript, Tailwind CSS, Supabase (data), Firebase (auth+push), Gemini AI
Key tables: movies, music_tracks, yt_channels, user_profiles, admin_users, games, app_features, gemini_keys, api_vault, user_feedback

Respond in Bengali (বাংলা) by default.
For code/SQL, use English syntax.`

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        reply: '❌ GEMINI_API_KEY not set in .env.local',
      })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM,
    })

    const chat = model.startChat({
      history: history.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    })

    const result = await chat.sendMessage(message)
    const reply = result.response.text()

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('[chat]', err.message)
    return NextResponse.json({
      reply: '❌ Error: ' + err.message,
    })
  }
}
