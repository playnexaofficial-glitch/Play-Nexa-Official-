// Store progress in memory (per channel)
export const importProgress = new Map<
  string,
  {
    status: string
    total: number
    processed: number
    moviesAdded: number
    musicAdded: number
    skipped: number
    duplicates: number
    error?: string
  }
>()

export function getImportProgress(channelDbId: string) {
  return importProgress.get(channelDbId)
}
