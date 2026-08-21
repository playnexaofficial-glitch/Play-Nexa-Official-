'use client'
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <h2 className="text-2xl font-bold">Something went wrong!</h2>
        </div>
      </body>
    </html>
  )
}
