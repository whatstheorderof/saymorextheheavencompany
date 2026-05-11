import GameClient from "@/components/GameClient";
import { publicPackSummary } from "@/lib/packs";

export default function Page() {
  return <GameClient initialPacks={publicPackSummary()} />;
}
