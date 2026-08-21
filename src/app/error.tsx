'use client'
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white flex-col gap-4">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <button onClick={() => reset()} className="px-4 py-2 bg-white text-black rounded-lg">Try again</button>
    </div>
  )
}
