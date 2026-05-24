'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setemail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Account created successfully. You can now log in.')
    setLoading(false)

    setTimeout(() => {
      router.push('/login')
    }, 1200)
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-md rounded-3xl border border-[#e7ddd1] bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
          Rommana Ops
        </p>
        <h1 className="text-3xl font-semibold text-[#2a1a1a]">Create account</h1>
        <p className="mt-2 text-sm text-[#6b5a52]">
          Set up your staff access.
        </p>

        <form onSubmit={handleSignup} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              required
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="rounded-2xl border border-[#d9cbbd] px-4 py-3 outline-none focus:border-[#620b0b]"
              required
            />
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setemail(e.target.value)}
            placeholder="email"
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {message ? (
          <div className="mt-4 rounded-2xl border border-[#e7ddd1] bg-[#faf7f2] px-4 py-3 text-sm text-[#2a1a1a]">
            {message}
          </div>
        ) : null}

        <p className="mt-6 text-sm text-[#6b5a52]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#620b0b] underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
