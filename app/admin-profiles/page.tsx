'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  role: string | null
  is_active: boolean | null
  created_at: string | null
}

const roleOptions = ['admin', 'manager', 'staff']

export default function AdminProfilesPage() {
  const supabase = createClient()

  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [newId, setNewId] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newRole, setNewRole] = useState('staff')

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setIsAdmin(false)
      setAuthChecked(true)
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    setIsAdmin(data?.role === 'admin')
    setAuthChecked(true)
  }

  async function loadProfiles() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setProfiles((data as Profile[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (!authChecked || !isAdmin) return
    loadProfiles()
  }, [authChecked, isAdmin])

  async function updateProfile(id: string, updates: Partial<Profile>) {
    setMessage('')
    setError('')

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Profile updated.')
    await loadProfiles()
  }

  async function addProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!newId.trim() || !newEmail.trim()) {
      setError('User ID and email are required.')
      return
    }

    const { error } = await supabase.from('profiles').insert([
      {
        id: newId.trim(),
        email: newEmail.trim(),
        first_name: newFirstName.trim() || null,
        last_name: newLastName.trim() || null,
        role: newRole,
        is_active: true,
      },
    ])

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Profile added.')
    setNewId('')
    setNewEmail('')
    setNewFirstName('')
    setNewLastName('')
    setNewRole('staff')
    await loadProfiles()
  }

  async function deleteProfile(profile: Profile) {
    const confirmed = window.confirm(
      `Remove ${profile.email || profile.id} from profiles? This does not delete the Supabase Auth user.`
    )

    if (!confirmed) return

    setMessage('')
    setError('')

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profile.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage('Profile removed.')
    await loadProfiles()
  }

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] p-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-[#e7ddd1] bg-white p-6">
          Checking access...
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#f7f1e8] p-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-red-200 bg-white p-6">
          <h1 className="text-2xl font-semibold text-[#2a1a1a]">Access denied</h1>
          <p className="mt-2 text-sm text-[#6b5a52]">
            This page is viewable only to admins.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-[#620b0b] underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f7f1e8] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="mb-2 text-sm uppercase tracking-[0.2em] text-[#620b0b]">
            Admin
          </p>
          <h1 className="text-3xl font-semibold text-[#2a1a1a]">
            Manage Profiles
          </h1>
          <p className="mt-2 text-sm text-[#6b5a52]">
            View staff profiles, change roles, activate/deactivate users, and remove profile records.
          </p>
        </div>

        {message ? (
          <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={addProfile}
          className="mb-6 rounded-3xl border border-[#e7ddd1] bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-[#2a1a1a]">
            Add Existing User Profile
          </h2>

          <div className="grid gap-3 md:grid-cols-5">
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              placeholder="Supabase user ID"
              className="rounded-2xl border border-[#d9cbbd] px-4 py-3"
            />

            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email"
              className="rounded-2xl border border-[#d9cbbd] px-4 py-3"
            />

            <input
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              placeholder="First name"
              className="rounded-2xl border border-[#d9cbbd] px-4 py-3"
            />

            <input
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              placeholder="Last name"
              className="rounded-2xl border border-[#d9cbbd] px-4 py-3"
            />

            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="rounded-2xl border border-[#d9cbbd] px-4 py-3"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="mt-4 rounded-2xl bg-[#620b0b] px-5 py-3 text-white"
          >
            Add Profile
          </button>

          <p className="mt-3 text-xs text-[#6b5a52]">
            This creates a profile row only. The user must already exist in Supabase Auth.
          </p>
        </form>

        <div className="overflow-hidden rounded-3xl border border-[#e7ddd1] bg-white shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#faf7f2] text-left text-sm text-[#6b5a52]">
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    Loading profiles...
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#6b5a52]">
                    No profiles found.
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.id} className="border-t border-[#f0e7dc]">
                    <td className="px-6 py-4 text-[#2a1a1a]">
                      {[profile.first_name, profile.last_name].filter(Boolean).join(' ') || '—'}
                    </td>

                    <td className="px-6 py-4 text-[#6b5a52]">
                      {profile.email || '—'}
                    </td>

                    <td className="px-6 py-4">
                      <select
                        value={profile.role || 'staff'}
                        onChange={(e) =>
                          updateProfile(profile.id, { role: e.target.value })
                        }
                        className="rounded-xl border border-[#d9cbbd] px-3 py-2 text-sm"
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          updateProfile(profile.id, {
                            is_active: !profile.is_active,
                          })
                        }
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          profile.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-sm text-[#6b5a52]">
                      {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString()
                        : '—'}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => deleteProfile(profile)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <Link href="/dashboard" className="text-sm text-[#620b0b] underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}