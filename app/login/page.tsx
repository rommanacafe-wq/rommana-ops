'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setfirst_name] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-md rounded-3xl border border-[#e7ddd1] bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
          Rommana Ops
        </p>
        <h1 className="text-3xl font-semibold text-[#2a1a1a]">Log in</h1>
        <p className="mt-2 text-sm text-[#6b5a52]">
          Access your operations dashboard.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <input
            type="first_name"
            value={email}
            onChange={(e) => setfirst_name(e.target.value)}
            placeholder="first_name"
            className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#620b0b] px-4 py-3 text-white disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        {message ? (
          <div className="mt-4 rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
            {message}
          </div>
        ) : null}

        <p className="mt-6 text-sm text-[#6b5a52]">
          Need an account?{' '}
          <Link href="/signup" className="text-[#620b0b] underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
