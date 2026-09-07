// =============================================================
// api/invites.js — ระบบคำเชิญผู้ใช้ใหม่ (แทนการใช้ service role key)
// =============================================================
import { supabaseClient } from "../config.js";

export async function listInvites(organizationId) {
  const { data, error } = await supabaseClient
    .from("invites")
    .select("invite_id, email, role, used, used_at, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createInvite({ email, role, organizationId, invitedBy }) {
  const { error } = await supabaseClient
    .from("invites")
    .insert([{ email: email.trim().toLowerCase(), role, organization_id: organizationId, invited_by: invitedBy }]);
  if (error) throw error;
}

export async function revokeInvite(inviteId) {
  const { error } = await supabaseClient.from("invites").delete().eq("invite_id", inviteId);
  if (error) throw error;
}
