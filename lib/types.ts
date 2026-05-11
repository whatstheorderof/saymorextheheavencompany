export type Card = {
  id: string;
  set: string;
  category: string;
  type: string;
  level: string;
  mode?: string;
  depth: "Low" | "Medium" | "High";
  prompt: string;
  note?: string;
};

export type PackAccess = "free" | "paid";

export type Pack = {
  id: string;
  name: string;
  description: string;
  access: PackAccess;
  collectionId: string;
  cardCount: number;
  trialDrawLimit: number;
  trialShuffleLimit: number;
  priceEnv?: string;
};

export type CollectionBundle = {
  id: string;
  legacyIds?: string[];
  collectionId: string;
  name: string;
  description: string;
  priceEnv: string;
  fallbackPriceEnv?: string;
};

export type Entitlement = {
  pack_id: string;
  status: string;
};

export type TrialUsage = {
  pack_id: string;
  draw_count: number;
  shuffle_count: number;
};
