import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!stripeKey) {
  console.error("Missing STRIPE_SECRET_KEY. Get a sandbox secret key from the Stripe Dashboard and run again.");
  process.exit(1);
}

const stripe = new Stripe(stripeKey);

const individualAmount = Number(process.env.SAYMORE_PACK_PRICE_AMOUNT || 499);
const bundleAmount = Number(process.env.SAYMORE_BUNDLE_PRICE_AMOUNT || 2999);
const currency = process.env.SAYMORE_PRICE_CURRENCY || "gbp";

const catalog = [
  ["couples-edition", "Couples Edition", "STRIPE_PRICE_COUPLES_EDITION"],
  ["teams-edition", "Teams Edition", "STRIPE_PRICE_TEAMS_EDITION"],
  ["family-edition", "Family Edition", "STRIPE_PRICE_FAMILY_EDITION"],
  ["community-edition", "Community Edition", "STRIPE_PRICE_COMMUNITY_EDITION"],
  ["facilitator-edition", "Facilitator Edition", "STRIPE_PRICE_FACILITATOR_EDITION"],
  ["first-date", "First Date", "STRIPE_PRICE_FIRST_DATE"],
  ["second-date", "Second Date", "STRIPE_PRICE_SECOND_DATE"],
  ["third-date", "Third Date", "STRIPE_PRICE_THIRD_DATE"],
  ["friendship-edition", "Friendship Edition", "STRIPE_PRICE_FRIENDSHIP_EDITION"],
  ["strangers-on-camera", "Strangers on Camera", "STRIPE_PRICE_STRANGERS_ON_CAMERA"],
  ["dinner-party", "Dinner Party", "STRIPE_PRICE_DINNER_PARTY"],
  ["best-friends", "Best Friends", "STRIPE_PRICE_BEST_FRIENDS"],
  ["siblings", "Siblings", "STRIPE_PRICE_SIBLINGS"],
  ["parent-and-child", "Parent & Child", "STRIPE_PRICE_PARENT_CHILD"],
  ["teens-and-young-adults", "Teens & Young Adults", "STRIPE_PRICE_TEENS_YOUNG_ADULTS"],
  ["life-transitions", "Life Transitions", "STRIPE_PRICE_LIFE_TRANSITIONS"],
  ["self-discovery", "Self-Discovery", "STRIPE_PRICE_SELF_DISCOVERY"],
  ["after-dark", "After Dark", "STRIPE_PRICE_AFTER_DARK"],
  ["creative-minds", "Creative Minds", "STRIPE_PRICE_CREATIVE_MINDS"],
  ["healing-edition", "Healing Edition", "STRIPE_PRICE_HEALING_EDITION"]
];

const bundle = {
  packId: "current-collection",
  name: "Current Collection",
  env: "STRIPE_PRICE_CURRENT_COLLECTION",
  amount: bundleAmount
};

async function findExistingProduct(packId) {
  const results = await stripe.products.search({
    query: `metadata['pack_id']:'${packId}' AND active:'true'`,
    limit: 1
  });
  return results.data[0] || null;
}

async function ensureProductWithDefaultPrice({ packId, name, env, amount }) {
  const existing = await findExistingProduct(packId);
  if (existing?.default_price) {
    return {
      env,
      productId: existing.id,
      priceId: typeof existing.default_price === "string" ? existing.default_price : existing.default_price.id,
      reused: true
    };
  }

  const product = await stripe.products.create({
    name: `Say More - ${name}`,
    description: packId === "current-collection"
      ? "Unlock every paid pack in the current Say More collection. Future collections are sold separately."
      : `Paid Say More expansion pack: ${name}.`,
    metadata: {
      app: "saymore-paid-mvp",
      pack_id: packId
    },
    default_price_data: {
      currency,
      unit_amount: amount
    }
  });

  return {
    env,
    productId: product.id,
    priceId: typeof product.default_price === "string" ? product.default_price : product.default_price?.id,
    reused: false
  };
}

const rows = [];
for (const [packId, name, env] of catalog) {
  rows.push(await ensureProductWithDefaultPrice({ packId, name, env, amount: individualAmount }));
}
rows.push(await ensureProductWithDefaultPrice(bundle));

console.log("# Paste these into .env.local and Vercel environment variables");
for (const row of rows) {
  console.log(`${row.env}=${row.priceId}`);
}

console.error(`\nCreated/reused ${rows.length} Stripe products with default prices.`);
