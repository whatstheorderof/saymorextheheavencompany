import { NextRequest, NextResponse } from "next/server";
import {
  getAnonId,
  getCurrentUser,
  getEntitlements,
  getTrialUsage,
  incrementTrial,
  isEntitled
} from "@/lib/access";
import { getPack, randomCard } from "@/lib/packs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { packId?: string; action?: "draw" | "shuffle" };
    const packId = body.packId || "base-deck";
    const action = body.action || "draw";
    const pack = getPack(packId);
    if (!pack) return NextResponse.json({ error: "Unknown pack" }, { status: 404 });

    const user = await getCurrentUser();
    const anonId = await getAnonId();
    const entitlements = await getEntitlements(user?.id);
    const entitled = isEntitled(pack, entitlements);

    let trial = { pack_id: pack.id, draw_count: 0, shuffle_count: 0 };
    if (!entitled) {
      trial = await getTrialUsage(pack.id, user?.id || null, anonId);
      const limit = action === "shuffle" ? pack.trialShuffleLimit : pack.trialDrawLimit;
      const used = action === "shuffle" ? trial.shuffle_count : trial.draw_count;
      if (used >= limit) {
        return NextResponse.json({
          locked: true,
          pack,
          trial,
          message: "Trial limit reached. Unlock this pack to keep playing."
        });
      }
      trial = await incrementTrial(pack.id, user?.id || null, anonId, action);
    }

    const card = randomCard(pack.id);
    return NextResponse.json({
      card,
      pack,
      entitled,
      trial,
      remaining: {
        draws: Math.max(0, pack.trialDrawLimit - trial.draw_count),
        shuffles: Math.max(0, pack.trialShuffleLimit - trial.shuffle_count)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to draw card";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
