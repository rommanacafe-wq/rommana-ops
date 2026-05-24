'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function Home() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function testConnection() {
    setLoading(true)
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.getSession()

      if (error) {
        setMessage(`Supabase connected, but auth returned an error: ${error.message}`)
      } else {
        setMessage('Supabase connected successfully.')
      }
    } catch {
      setMessage('Connection failed. Check your .env.local file and Supabase client setup.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-xl rounded-3xl border border-[#e7ddd1] bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
          Rommana Ops
        </p>
        <h1 className="text-3xl font-semibold text-[#2a1a1a]">
          Supabase connection test
        </h1>
        <p className="mt-2 text-sm text-[#6b5a52]">
          First we confirm the app can talk to Supabase.
        </p>

        <button
          onClick={testConnection}
          disabled={loading}
          className="mt-6 rounded-2xl bg-[#620b0b] px-5 py-3 text-white disabled:opacity-60"
        >
          {loading ? 'Testing...' : 'Test connection'}
        </button>

        {message ? (
          <div className="mt-4 rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
            {message}
          </div>
        ) : null}
      </div>
    </main>
  )
}
