'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  first_name: string | null
  last_name: string | null
  role: string | null
}

export default function ProfileMenu() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setEmail(user.email ?? null)

        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, role')
          .eq('id', user.id)
          .single()

        setProfile(data ?? null)
      }

      setLoading(false)
    }

    load()
  }, [])

  // close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const displayName =
    profile?.first_name ||
    email?.split('@')[0] ||
    'User'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-[#e7ddd1] bg-white px-4 py-2 text-sm"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#620b0b] text-white text-xs">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:block text-[#2a1a1a]">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#e7ddd1] bg-white shadow-lg z-50">
          <div className="px-4 py-3 border-b text-sm">
            <div className="font-medium text-[#2a1a1a]">
              {profile?.first_name || 'User'}
            </div>
            <div className="text-xs text-[#6b5a52]">
              {email}
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2 text-sm rounded-xl hover:bg-red-50 text-red-700"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}