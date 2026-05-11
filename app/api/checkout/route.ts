import { NextRequest, NextResponse } from "next/server";
import { collectionBundlePriceId, getCurrentUser, packPriceId } from "@/lib/access";
import { getCollectionBundle, getPack } from "@/lib/packs";
import { appUrl, stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "Please sign in before buying packs." }, { status: 401 });
    }

    const body = (await request.json()) as { packId?: string };
    const packId = body.packId;
    if (!packId) return NextResponse.json({ error: "Missing packId" }, { status: 400 });

    const collectionBundle = getCollectionBundle(packId);
    if (collectionBundle) {
      const price = collectionBundlePriceId(collectionBundle);
      if (!price) return NextResponse.json({ error: `Missing Stripe price env for ${collectionBundle.name}.` }, { status: 500 });
      const session = await stripe().checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        client_reference_id: user.id,
        line_items: [{ price, quantity: 1 }],
        success_url: `${appUrl()}/?checkout=success&pack=${collectionBundle.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/?checkout=cancelled&pack=${collectionBundle.id}`,
        metadata: {
          user_id: user.id,
          pack_id: collectionBundle.id,
          pack_name: collectionBundle.name,
          collection_id: collectionBundle.collectionId,
          purchase_type: "collection"
        }
      });
      return NextResponse.json({ url: session.url });
    }

    const pack = getPack(packId);
    if (!pack || pack.access !== "paid") {
      return NextResponse.json({ error: "This pack is not available for purchase." }, { status: 400 });
    }

    const price = packPriceId(pack.id);
    if (!price) {
      return NextResponse.json({ error: `Missing Stripe price env for ${pack.name}.` }, { status: 500 });
    }

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      success_url: `${appUrl()}/?checkout=success&pack=${pack.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/?checkout=cancelled&pack=${pack.id}`,
      metadata: {
        user_id: user.id,
        pack_id: pack.id,
        pack_name: pack.name
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
