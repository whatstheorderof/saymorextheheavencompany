# Say More Paid MVP

Separate paid version of the Say More game. The base deck is free; expansion packs are protected by server-side access checks, can be sampled with trial draws/shuffles, and can be unlocked with Stripe Checkout. The current 1,050-card collection can also be unlocked in one purchase; future card collections are sold as separate collection bundles.

## Stack

- Next.js on Vercel
- Stripe Checkout for one-time paid pack and collection purchases
- Stripe webhooks for fulfillment
- Supabase Auth + database for login, purchases, and trial usage
- Vercel Analytics

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env vars:

```bash
cp .env.example .env.local
```

3. Create a Supabase project, enable email auth, run `supabase/schema.sql`, then fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is used for browser and SSR auth. `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` is still required for server-only purchase fulfillment and trial-usage writes.

4. In Stripe sandbox, create one-time Products/Prices for paid packs and the current collection bundle, then paste price IDs into `.env.local`.

   I created sandbox Products/Prices for the first MVP pass. Copy the generated price IDs from `.env.sandbox.example` into `.env.local` and Vercel.

   For a new Stripe sandbox, you can create products and prices using the blueprint-style setup script. It calls Stripe Products with `default_price_data`, then prints the price IDs:

```bash
STRIPE_SECRET_KEY=sk_test_... npm run stripe:catalog
```

The current collection bundle uses `STRIPE_PRICE_CURRENT_COLLECTION`. `STRIPE_PRICE_ALL_ACCESS_BUNDLE` is still supported as a legacy fallback if you already created the older all-access price. When future cards become their own collection, create a separate product/price and set `STRIPE_PRICE_FUTURE_COLLECTION`.

5. Add a Stripe webhook endpoint:

```txt
https://YOUR-VERCEL-DOMAIN/api/stripe/webhook
```

Subscribe to:

```txt
checkout.session.completed
```

Paste the webhook signing secret into:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

6. Run:

```bash
npm run dev
```

## Security Notes

Paid card prompts live in `lib/cards-data.json` and are returned through `/api/cards/draw` only after the API checks free, trial, or purchase access. Do not move paid card prompts into client-side components.

Checkout success redirects are not trusted for fulfillment. Purchases are granted only by the Stripe webhook.

## Stripe Blueprint Mapping

- Product setup: `scripts/create-stripe-catalog.mjs` creates Products with `default_price_data.currency` and `default_price_data.unit_amount`, including the current collection bundle.
- Checkout: `app/api/checkout/route.ts` creates a Checkout Session with `line_items[{ price, quantity: 1 }]`, `mode: "payment"`, `success_url`, and `cancel_url`.
- Fulfillment: `app/api/stripe/webhook/route.ts` verifies the Stripe signature from the raw request body and grants access only on `checkout.session.completed` with `payment_status === "paid"`.

## Deployment

Deploy this folder as its own GitHub/Vercel project. Set the Vercel project root to:

```txt
saymore-paid-mvp
```

Then add all environment variables in the Vercel dashboard.
