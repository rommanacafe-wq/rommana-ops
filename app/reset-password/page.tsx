'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Password reset link sent. Please check your email.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-md rounded-3xl border border-[#e7ddd1] bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
          Rommana Ops
        </p>

        <h1 className="text-3xl font-semibold text-[#2a1a1a]">
          Reset Password
        </h1>

        <p className="mt-2 text-sm text-[#6b5a52]">
          Enter your email and we’ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#620b0b] px-4 py-3 text-white disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
            {message}
          </div>
        )}

        <p className="mt-6 text-sm text-[#6b5a52]">
          Remember your password?{' '}
          <Link href="/login" className="text-[#620b0b] underline">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  )
}
