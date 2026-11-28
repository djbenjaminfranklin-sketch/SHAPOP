import { supabase } from '../config'

// Fermeture définitive d'un compte (bannissement + e-mail et téléphone interdits de réinscription)
export async function banAccount(userId: string, adminId: string | null, reason: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({
    is_banned: true,
    is_suspended: true,
    suspension_reason: reason,
    banned_at: new Date().toISOString(),
  }).eq('id', userId)

  if (error) throw error

  // Add email + phone to banned_identifiers
  const { data: authUser } = await supabase.auth.admin.getUserById(userId)
  const { data: profile } = await supabase.from('profiles').select('phone_number').eq('id', userId).single()

  const identifiers: { type: string; value: string; banned_user_id: string; banned_by: string | null; reason: string }[] = []
  if (authUser?.user?.email) {
    identifiers.push({ type: 'email', value: authUser.user.email.toLowerCase().trim(), banned_user_id: userId, banned_by: adminId, reason })
  }
  if (profile?.phone_number) {
    identifiers.push({ type: 'phone', value: profile.phone_number, banned_user_id: userId, banned_by: adminId, reason })
  }
  if (identifiers.length > 0) {
    await supabase.from('banned_identifiers').upsert(identifiers, { onConflict: 'type,value' })
  }
}
