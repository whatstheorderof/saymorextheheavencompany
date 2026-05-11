import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase/admin";
import { supabaseServer } from "./supabase/server";
import { getPack, legacyAllAccessId, packs } from "./packs";
import type { CollectionBundle, Entitlement, Pack, TrialUsage } from "./types";

export async function getCurrentUser() {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

export async function getAnonId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get("saymore_anon_id")?.value;
  if (existing) return existing;
  const id = randomUUID();
  cookieStore.set("saymore_anon_id", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180
  });
  return id;
}

export async function getEntitlements(userId?: string | null) {
  if (!userId) return [];
  let supabase: ReturnType<typeof supabaseAdmin>;
  try {
    supabase = supabaseAdmin();
  } catch {
    return [];
  }
  const { data, error } = await supabase
    .from("purchases")
    .select("pack_id,status")
    .eq("user_id", userId)
    .eq("status", "active");
  if (error) throw error;
  return (data || []) as Entitlement[];
}

export function isEntitled(pack: Pack, entitlements: Entitlement[]) {
  if (pack.access === "free") return true;
  return entitlements.some((item) => item.pack_id === pack.id)
    || entitlements.some((item) => item.pack_id === pack.collectionId)
    || entitlements.some((item) => item.pack_id === legacyAllAccessId);
}

export async function getTrialUsage(packId: string, userId: string | null, anonId: string) {
  const supabase = supabaseAdmin();
  const ownerKey = userId ? `user:${userId}` : `anon:${anonId}`;
  const { data, error } = await supabase
    .from("trial_usage")
    .select("pack_id,draw_count,shuffle_count")
    .eq("pack_id", packId)
    .eq("owner_key", ownerKey)
    .maybeSingle();
  if (error) throw error;
  return (data || { pack_id: packId, draw_count: 0, shuffle_count: 0 }) as TrialUsage;
}

export async function incrementTrial(packId: string, userId: string | null, anonId: string, action: "draw" | "shuffle") {
  const supabase = supabaseAdmin();
  const current = await getTrialUsage(packId, userId, anonId);
  const ownerKey = userId ? `user:${userId}` : `anon:${anonId}`;
  const payload = {
    owner_key: ownerKey,
    pack_id: packId,
    user_id: userId,
    anonymous_id: userId ? null : anonId,
    draw_count: current.draw_count + (action === "draw" ? 1 : 0),
    shuffle_count: current.shuffle_count + (action === "shuffle" ? 1 : 0),
    updated_at: new Date().toISOString()
  };
  const { data, error } = await supabase
    .from("trial_usage")
    .upsert(payload, { onConflict: "owner_key,pack_id" })
    .select("pack_id,draw_count,shuffle_count")
    .single();
  if (error) throw error;
  return data as TrialUsage;
}

export async function grantPack(
  userId: string,
  packId: string,
  stripeSessionId: string,
  stripeCustomerId?: string | null,
  stripePaymentIntentId?: string | null,
) {
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("purchases").upsert(
    {
      user_id: userId,
      pack_id: packId,
      status: "active",
      stripe_checkout_session_id: stripeSessionId,
      stripe_customer_id: stripeCustomerId,
      stripe_payment_intent_id: stripePaymentIntentId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,pack_id" }
  );
  if (error) throw error;
}

export async function entitlementSummary(userId?: string | null) {
  const entitlements = await getEntitlements(userId);
  return packs.reduce<Record<string, boolean>>((acc, pack) => {
    acc[pack.id] = isEntitled(pack, entitlements);
    return acc;
  }, {});
}

export function packPriceId(packId: string) {
  const pack = getPack(packId);
  if (!pack?.priceEnv) return null;
  return process.env[pack.priceEnv] || null;
}

export function collectionBundlePriceId(bundle: CollectionBundle) {
  return process.env[bundle.priceEnv] || (bundle.fallbackPriceEnv ? process.env[bundle.fallbackPriceEnv] : null) || null;
}
