import cards from "./cards-data.json";
import conferenceCards from "./conference-cards-data.json";
import type { Card, CollectionBundle, Pack } from "./types";

const typedCards = [...(conferenceCards as Card[]), ...(cards as Card[])];
const freePacks = new Set(["Base Deck", "Implementation Imperative 2026"]);
const conferencePackName = "Implementation Imperative 2026";
const conferencePackId = "implementation-imperative-2026";

const conferenceSections = [
  {
    id: "implementation-imperative-2026-awareness-diagnosis",
    name: "Section 1: Awareness & Diagnosis",
    category: "Awareness & Diagnosis",
    description: "Questions 1-5: understand the current picture before moving to action."
  },
  {
    id: "implementation-imperative-2026-leadership-culture",
    name: "Section 2: Leadership & Culture",
    category: "Leadership & Culture",
    description: "Questions 6-10: test whether inclusive leadership survives real pressure."
  },
  {
    id: "implementation-imperative-2026-systems-structures",
    name: "Section 3: Systems & Structures",
    category: "Systems & Structures",
    description: "Questions 11-15: examine the processes where belonging is made or blocked."
  },
  {
    id: "implementation-imperative-2026-allyship-action",
    name: "Section 4: Allyship & Everyday Action",
    category: "Allyship & Everyday Action",
    description: "Questions 16-20: turn intent into everyday behaviours and support."
  },
  {
    id: "implementation-imperative-2026-measuring-progress",
    name: "Section 5: Measuring Progress & Sustaining Change",
    category: "Measuring Progress & Sustaining Change",
    description: "Questions 21-25: define what progress means and how change lasts."
  }
];

export const currentCollectionId = "current-collection";
export const legacyAllAccessId = "all-access";

const packCopy: Record<string, string> = {
  "Base Deck": "The core Say More deck: light, connective, reflective, and challenge prompts.",
  "Couples Edition": "Intimacy, repair, shared memory, and future-facing prompts for partners.",
  "Teams Edition": "Trust-building prompts for work rooms, offsites, and creative teams.",
  "Family Edition": "Intergenerational stories, repair, appreciation, and family memory.",
  "Community Edition": "Prompts for strangers, neighbors, campuses, communities, and hosted rooms.",
  "Facilitator Edition": "Safer hosting prompts for guides, therapists, coaches, and group leaders.",
  "First Date": "Meaningful small talk for early chemistry without forcing intensity.",
  "Second Date": "More honest questions for curiosity, values, and emotional pace.",
  "Third Date": "Relationship clarity prompts for intentions, boundaries, and compatibility.",
  "Friendship Edition": "Reconnection, loyalty, nostalgia, care, and chosen-family prompts.",
  "Strangers on Camera": "Interview-ready prompts for people with different lives and stories.",
  "Dinner Party": "Warm table questions for hosts, friends-of-friends, and lingering conversations.",
  "Best Friends": "Deep friendship prompts about memory, repair, loyalty, and growing up together.",
  Siblings: "Prompts for shared childhoods, old roles, humor, care, and repair.",
  "Parent & Child": "Gentle prompts for appreciation, understanding, memory, and changing roles.",
  "Teens & Young Adults": "Identity, pressure, belonging, becoming, and social life.",
  "Life Transitions": "Moves, breakups, grief, new chapters, reinvention, and courage.",
  "Self-Discovery": "Solo-friendly prompts for identity, meaning, values, and inner clarity.",
  "After Dark": "Late-night honesty for trusted rooms and emotionally braver conversations.",
  "Creative Minds": "Prompts for artists, founders, collaborators, and dreamers.",
  "Healing Edition": "Soft reflection for repair, care, self-compassion, and emotional recovery.",
  "Implementation Imperative 2026": "All 25 conference prompts for moving inclusion and belonging from aspiration to action after the event."
};

function envNameForPack(name: string) {
  return `STRIPE_PRICE_${name.toUpperCase().replace(/&/g, "AND").replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "")}`;
}

export const packs: Pack[] = [...new Set(typedCards.map((card) => card.set))].map((name) => {
  const access = freePacks.has(name) ? "free" : "paid";
  return {
    id: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name,
    description: packCopy[name] || "A themed Say More expansion pack.",
    access,
    collectionId: currentCollectionId,
    cardCount: typedCards.filter((card) => card.set === name).length,
    trialDrawLimit: access === "free" ? 999 : 5,
    trialShuffleLimit: access === "free" ? 999 : 2,
    priceEnv: access === "paid" ? envNameForPack(name) : undefined
  };
});

const conferenceSectionPacks: Pack[] = conferenceSections.map((section) => ({
  id: section.id,
  name: section.name,
  description: section.description,
  access: "free",
  collectionId: currentCollectionId,
  cardCount: typedCards.filter((card) => card.set === conferencePackName && card.category === section.category).length,
  trialDrawLimit: 999,
  trialShuffleLimit: 999
}));

export const allPacks: Pack[] = [...packs, ...conferenceSectionPacks];

export const currentCollectionBundle: CollectionBundle = {
  id: currentCollectionId,
  legacyIds: [legacyAllAccessId],
  collectionId: currentCollectionId,
  name: "Current Collection",
  description: "Unlock every paid pack in the current Say More collection. Future collections are sold separately.",
  priceEnv: "STRIPE_PRICE_CURRENT_COLLECTION",
  fallbackPriceEnv: "STRIPE_PRICE_ALL_ACCESS_BUNDLE"
};

export const futureCollectionBundle: CollectionBundle = {
  id: "future-collection",
  collectionId: "future-collection",
  name: "Future Collection",
  description: "Reserved for the next Say More card collection. It will have its own one-purchase bundle.",
  priceEnv: "STRIPE_PRICE_FUTURE_COLLECTION"
};

export const collectionBundles = [currentCollectionBundle, futureCollectionBundle];

export function getPack(packId: string) {
  return allPacks.find((pack) => pack.id === packId);
}

export function getCollectionBundle(bundleId: string) {
  return collectionBundles.find((bundle) => bundle.id === bundleId || bundle.legacyIds?.includes(bundleId));
}

export function publicPackSummary() {
  return allPacks.map(({ id, name, description, access, collectionId, cardCount, trialDrawLimit, trialShuffleLimit, priceEnv }) => ({
    id,
    name,
    description,
    access,
    collectionId,
    cardCount,
    trialDrawLimit,
    trialShuffleLimit,
    hasStripePrice: !priceEnv || Boolean(process.env[priceEnv])
  }));
}

export function publicConferencePackSummary() {
  return publicPackSummary().filter((pack) => pack.id === conferencePackId || conferenceSections.some((section) => section.id === pack.id));
}

export function cardsForPack(packId: string) {
  const pack = getPack(packId);
  if (!pack) return [];
  const conferenceSection = conferenceSections.find((section) => section.id === packId);
  if (conferenceSection) {
    return typedCards.filter((card) => card.set === conferencePackName && card.category === conferenceSection.category);
  }
  return typedCards.filter((card) => card.set === pack.name);
}

export function randomCard(packId: string) {
  const packCards = cardsForPack(packId);
  return packCards[Math.floor(Math.random() * packCards.length)];
}
