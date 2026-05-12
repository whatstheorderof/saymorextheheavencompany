"use client";

import { useEffect, useMemo, useState } from "react";
import type { Card } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type PackSummary = {
  id: string;
  name: string;
  description: string;
  access: "free" | "paid";
  collectionId: string;
  cardCount: number;
  trialDrawLimit: number;
  trialShuffleLimit: number;
  hasStripePrice: boolean;
};

type MeResponse = {
  user: { id: string; email?: string } | null;
  packs: PackSummary[];
  entitlements: Record<string, boolean>;
};

type DrawResponse = {
  card?: Card;
  pack?: PackSummary;
  entitled?: boolean;
  locked?: boolean;
  trial?: { draw_count: number; shuffle_count: number };
  remaining?: { draws: number; shuffles: number };
  message?: string;
  error?: string;
};

const currentCollection = {
  id: "current-collection",
  name: "Current Collection"
};

type HeroCardCopy = {
  label: string;
  prompt: string;
};

type GameClientProps = {
  initialPacks: PackSummary[];
  title?: string;
  intro?: string;
  statusIntro?: string;
  emptyPrompt?: string;
  primaryActionLabel?: string;
  shuffleActionLabel?: string;
  tertiaryActionLabel?: string | null;
  tertiaryAction?: "date-packs" | "conference-pack";
  heroCards?: HeroCardCopy[];
  showCommerce?: boolean;
  collectionLabel?: string;
  collectionTitle?: string;
  collectionDescription?: string;
};

const defaultHeroCards: HeroCardCopy[] = [
  {
    label: "On Camera",
    prompt: "What do you want strangers to remember about your humanity?"
  },
  {
    label: "After Dark",
    prompt: "What feels easier to admit at night?"
  },
  {
    label: "Creative Minds",
    prompt: "What idea will not leave you alone?"
  }
];

export default function GameClient({
  initialPacks,
  title = "A conversation game for closing the distance.",
  intro = "A 1,050-card online deck for dates, friends, families, teams, communities, healing, creators, life transitions, and guided conversations.",
  statusIntro = "Choose a pack and draw a card.",
  emptyPrompt = "Pick a pack and draw. Paid packs will reveal trial cards until the limit is reached.",
  primaryActionLabel = "Start Playing",
  shuffleActionLabel = "Shuffle First Card",
  tertiaryActionLabel = "Date Packs",
  tertiaryAction = "date-packs",
  heroCards = defaultHeroCards,
  showCommerce = true,
  collectionLabel = "Current Collection",
  collectionTitle = currentCollection.name,
  collectionDescription = "Includes every paid pack available now. New future card collections will have their own bundle purchase."
}: GameClientProps) {
  const [packs, setPacks] = useState(initialPacks);
  const [entitlements, setEntitlements] = useState<Record<string, boolean>>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [activePackId, setActivePackId] = useState(initialPacks[0]?.id || "base-deck");
  const [card, setCard] = useState<Card | null>(null);
  const [status, setStatus] = useState(statusIntro);
  const [isBusy, setIsBusy] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  const activePack = useMemo(() => packs.find((pack) => pack.id === activePackId) || packs[0], [activePackId, packs]);
  const unlocked = activePack ? entitlements[activePack.id] || activePack.access === "free" : false;

  useEffect(() => {
    if (!showCommerce) return;
    refreshMe();
  }, [showCommerce]);

  async function refreshMe() {
    const response = await fetch("/api/me");
    if (!response.ok) return;
    const data = (await response.json()) as MeResponse;
    setPacks(data.packs);
    setEntitlements(data.entitlements);
    setUserEmail(data.user?.email || null);
  }

  async function login() {
    if (!emailInput.trim()) return;
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setStatus("Add Supabase environment variables before login works.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    setStatus(error ? error.message : "Check your email for the login link.");
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    await refreshMe();
  }

  function selectPack(pack: PackSummary) {
    if (pack.id === activePackId) return;
    setActivePackId(pack.id);
    setCard(null);
    setStatus(`${pack.name} selected. Draw a card from this pack.`);
  }

  function scrollToGame() {
    document.querySelector("#game-table")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToCard() {
    document.querySelector("#question-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function startPlaying() {
    scrollToGame();
    setStatus(statusIntro);
  }

  function runTertiaryAction() {
    if (tertiaryAction === "conference-pack") {
      const conferencePack = packs.find((pack) => pack.id === "implementation-imperative-2026");
      if (conferencePack) selectPack(conferencePack);
      scrollToGame();
      return;
    }
    const firstDatePack = packs.find((pack) => pack.id === "first-date");
    if (firstDatePack) selectPack(firstDatePack);
    scrollToGame();
  }

  async function shuffleFirstCard() {
    scrollToGame();
    await draw("shuffle");
  }

  async function draw(action: "draw" | "shuffle" = "draw") {
    if (!activePack) return;
    scrollToCard();
    setIsBusy(true);
    if (action === "shuffle") setIsShuffling(true);
    setStatus(action === "shuffle" ? "Shuffling..." : "Drawing...");
    const response = await fetch("/api/cards/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId: activePack.id, action })
    });
    const data = (await response.json()) as DrawResponse;
    setIsBusy(false);
    if (action === "shuffle") {
      window.setTimeout(() => setIsShuffling(false), 620);
    }

    if (!response.ok || data.error) {
      setStatus(data.error || "Unable to draw from this pack.");
      return;
    }
    if (data.locked) {
      setStatus(data.message || "Unlock this pack to keep playing.");
      return;
    }
    if (data.card) {
      setCard(data.card);
      setStatus(
        data.entitled || data.pack?.access === "free"
          ? `${data.pack?.name || "Pack"} is unlocked.`
          : `Trial: ${data.remaining?.draws ?? 0} draws and ${data.remaining?.shuffles ?? 0} shuffles left.`
      );
    }
  }

  async function buy(packId = activePackId) {
    setIsBusy(true);
    setStatus("Opening Stripe Checkout...");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId })
    });
    const data = (await response.json()) as { url?: string; error?: string };
    setIsBusy(false);
    if (!response.ok || !data.url) {
      setStatus(data.error || "Unable to start checkout.");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <main className="shell">
      <section className="landing" id="home">
        <div className="landingCopy">
          <img src="/assets/say-more-logo.png" alt="Say More" className="brandLogo brandLogoLarge" />
          <h1>{title}</h1>
          <p className="landingText">{intro}</p>
          <div className="landingActions">
            <button className="primaryButton" onClick={startPlaying} type="button">{primaryActionLabel}</button>
            <button className="secondaryButton" disabled={isBusy} onClick={shuffleFirstCard} type="button">{shuffleActionLabel}</button>
            {tertiaryActionLabel && (
              <button className="secondaryButton" onClick={runTertiaryAction} type="button">{tertiaryActionLabel}</button>
            )}
          </div>

          {showCommerce && (
            <section className="purchaseStarter" aria-label="Unlock Say More packs">
              <div>
                <span>Paid Collection</span>
                <strong>Sample every pack, then unlock the current collection in one purchase.</strong>
              </div>
              <div className="authPanel">
                <span>Account</span>
                {userEmail ? (
                  <>
                    <strong>{userEmail}</strong>
                    <button className="secondaryButton" onClick={signOut}>Sign out</button>
                  </>
                ) : (
                  <>
                    <input value={emailInput} onChange={(event) => setEmailInput(event.target.value)} placeholder="you@email.com" />
                    <button className="secondaryButton" onClick={login}>Email login link</button>
                  </>
                )}
                <button className="primaryButton" onClick={() => buy(currentCollection.id)} disabled={isBusy || !userEmail}>
                  Unlock Current Collection
                </button>
                <p className="bundleHint">One purchase unlocks all current paid packs. Future collections will be separate.</p>
              </div>
            </section>
          )}
        </div>
        <div className="landingVisual" aria-hidden="true">
          <div className="heroCard heroCardOne">
            <span>{heroCards[0]?.label}</span>
            <strong>{heroCards[0]?.prompt}</strong>
          </div>
          <div className="heroCard heroCardTwo">
            <span>{heroCards[1]?.label}</span>
            <strong>{heroCards[1]?.prompt}</strong>
          </div>
          <div className="heroCard heroCardThree">
            <span>{heroCards[2]?.label}</span>
            <strong>{heroCards[2]?.prompt}</strong>
          </div>
        </div>
      </section>

      <section className="grid" id="game-table">
        <aside className="packs">
          <div className="packHeader">
            <span>Packs</span>
            <strong>{packs.length} total</strong>
          </div>
          {packs.map((pack) => {
            const isUnlocked = entitlements[pack.id] || pack.access === "free";
            return (
              <button
                className={`pack ${pack.id === activePackId ? "active" : ""}`}
                key={pack.id}
                onClick={() => selectPack(pack)}
              >
                <span>{pack.name}</span>
                <small>{pack.cardCount} cards · {isUnlocked ? (showCommerce ? "Unlocked" : "Open") : "Paid"}</small>
              </button>
            );
          })}
        </aside>

        <section className="table">
          <div className={`actions ${showCommerce ? "" : "conferenceActions"}`}>
            <button disabled={isBusy} onClick={() => draw("draw")}>Draw</button>
            <button disabled={isBusy} onClick={() => draw("shuffle")}>{showCommerce ? "Shuffle Trial" : "Shuffle"}</button>
            {!unlocked && (
              <button disabled={isBusy || !activePack?.hasStripePrice} onClick={() => buy()}>
                Unlock Pack
              </button>
            )}
          </div>

          <article className={`card ${isShuffling ? "shuffling" : ""}`} id="question-card">
            <div className="cardMeta">
              <span>{card?.category || activePack?.name || "Ready"}</span>
              <span>{card?.id || (showCommerce ? "SM-PAY" : "SM-EDI")}</span>
            </div>
            <p>{card?.prompt || emptyPrompt}</p>
            <div className="cardFooter">
              <img src="/assets/say-more-card-logo.png" alt="Say More" />
              <span>{card?.set || activePack?.name || "Base Deck"}</span>
            </div>
          </article>

          <p className="status">{status}</p>
        </section>

        <aside className="details">
          <span>{showCommerce ? (activePack?.access === "free" ? "Free Pack" : "Paid Pack") : collectionLabel}</span>
          <h2>{activePack?.name}</h2>
          <p>{activePack?.description}</p>
          <div className="collectionBox">
            <strong>{collectionTitle}</strong>
            <p>{collectionDescription}</p>
          </div>
          {!unlocked && activePack && (
            <div className="trialBox">
              <strong>Trial included</strong>
              <p>{activePack.trialDrawLimit} draws and {activePack.trialShuffleLimit} shuffles before purchase.</p>
              {!activePack.hasStripePrice && <p className="warning">Add the Stripe price ID env var for this pack.</p>}
            </div>
          )}
        </aside>
      </section>
      {!showCommerce && (
        <footer className="conferenceFooter" aria-label="Conference details">
          <div className="conferenceLogos" aria-label="Partner logos">
            <img src="/assets/thclogo.webp" alt="The Heaven Company" className="conferenceLogo heavenLogo" />
            <img src="/assets/savine-logo.png" alt="Savine Agency" className="conferenceLogo savineLogo" />
          </div>
          <div>
            <strong>The Implementation Imperative 2026</strong>
            <p>How to Embed Inclusion and Belonging</p>
            <p>Guildhall, City of London · 19 May 2026 · 9.00am – 2.30pm</p>
            <p>Part of the Lady Mayor Dame Susan Langley DBE's vision for a City truly open to all.</p>
          </div>
          <div>
            <strong>Veronica Heaven FRSA</strong>
            <p>Junior Warden 2025–2026 · The Worshipful Company of Entrepreneurs</p>
            <p className="contactLine">
              <a href="mailto:veronica@theheavencompany.com">veronica@theheavencompany.com</a>
              <span> · </span>
              <a href="tel:+447818013836">07818 013836</a>
            </p>
          </div>
          <div>
            <strong>Game created by Savine Agency</strong>
            <p>#TheImplementationImperative · #EDI · #Inclusion · #Belonging · #CityOfLondon</p>
          </div>
        </footer>
      )}
    </main>
  );
}
