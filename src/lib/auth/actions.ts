'use server'

import { createClient } from '../supabase/server'

export type LoginMode = 'mentee' | 'mentor'

export async function signup(
  fullName: string,
  email: string,
  password: string
) {
  const supabase = await createClient()

  const cleanName = fullName.trim()
  const cleanEmail = email.trim().toLowerCase()

  if (!cleanName) {
    return { success: false, error: 'Full name is required.' }
  }

  if (!cleanEmail) {
    return { success: false, error: 'Email is required.' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: cleanName,
      },
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return {
    success: true,
    user: data.user,
    session: data.session,
    message: data.session
      ? 'Account created successfully.'
      : 'Account created. Please check your email.',
  }
}

export async function login(
  email: string,
  password: string,
  mode: LoginMode = 'mentee'
) {
  const supabase = await createClient()
  const cleanEmail = email.trim().toLowerCase()

  if (!cleanEmail || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (mode === 'mentor' && data.user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError || profile?.role !== 'mentor') {
      await supabase.auth.signOut()
      return {
        success: false,
        error: 'This account is not registered as a mentor. Switch to Mentee Login or contact an administrator.',
      }
    }
  }

  return {
    success: true,
    user: data.user,
    session: data.session,
    role: mode,
    redirectTo: mode === 'mentor' ? '/mentor/dashboard' : '/dashboard',
    message: 'Login successful.',
  }
}

export async function logout() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, message: 'Logged out successfully.' }
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user
}

export async function getCurrentProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return null
  return profile
}

export async function getCurrentRole(): Promise<'mentee' | 'mentor' | null> {
  const profile = await getCurrentProfile()
  if (!profile) return null
  return profile.role === 'mentor' ? 'mentor' : 'mentee'
}
