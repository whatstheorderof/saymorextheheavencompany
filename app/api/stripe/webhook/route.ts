import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { grantPack } from "@/lib/access";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, skipped: "payment_not_paid" });
    }
    const userId = session.metadata?.user_id || session.client_reference_id;
    const packId = session.metadata?.pack_id;
    if (userId && packId) {
      await grantPack(
        userId,
        packId,
        session.id,
        typeof session.customer === "string" ? session.customer : null,
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      );
    }
  }

  return NextResponse.json({ received: true });
}
