import GameClient from "@/components/GameClient";
import { publicConferencePackSummary } from "@/lib/packs";

export default function ConferenceGame() {
  return (
    <GameClient
      initialPacks={publicConferencePackSummary()}
      title="THE IMPLEMENTATION IMPERATIVE 2026"
      intro="How to Embed Inclusion and Belonging. A Say More x The Heaven Company collaboration game, created by Savine Agency."
      statusIntro="Draw a question for your table, then turn the answer into one practical action to take back to your organisation."
      emptyPrompt="Draw a question to begin. Each card is designed for team conversations, leadership sessions, or personal reflection."
      primaryActionLabel="Start the Table Game"
      shuffleActionLabel="Shuffle a Question"
      tertiaryActionLabel={null}
      tertiaryAction="conference-pack"
      showCommerce={false}
      heroCards={[
        {
          label: "Awareness",
          prompt: "What data do you collect about belonging, and what gaps exist?"
        },
        {
          label: "Culture",
          prompt: "What happens to EDI commitments when priorities shift?"
        },
        {
          label: "Action",
          prompt: "What will you do differently when you return to work?"
        }
      ]}
    />
  );
}
