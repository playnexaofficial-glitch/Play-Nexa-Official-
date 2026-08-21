import { NextRequest, NextResponse } from 'next/server'
import { getImportProgress } from '@/lib/import-progress'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get('channelId')
  if (!channelId) {
    return NextResponse.json(
      { error: 'channelId required' },
      { status: 400 }
    )
  }
  const progress = getImportProgress(channelId)
  if (!progress) {
    return NextResponse.json({
      status: 'idle',
      total: 0,
      processed: 0,
      moviesAdded: 0,
      musicAdded: 0,
      skipped: 0,
      duplicates: 0,
    })
  }
  return NextResponse.json(progress)
}
