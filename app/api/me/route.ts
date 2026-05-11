import { NextResponse } from "next/server";
import { entitlementSummary, getCurrentUser } from "@/lib/access";
import { publicPackSummary } from "@/lib/packs";

export async function GET() {
  const user = await getCurrentUser();
  let entitlements: Record<string, boolean> = {};
  let setupWarning: string | null = null;
  try {
    entitlements = await entitlementSummary(user?.id);
  } catch (error) {
    setupWarning = error instanceof Error ? error.message : "Supabase is not configured yet.";
  }
  return NextResponse.json({
    user: user
      ? {
          id: user.id,
          email: user.email
        }
      : null,
    packs: publicPackSummary(),
    entitlements,
    setupWarning
  });
}
