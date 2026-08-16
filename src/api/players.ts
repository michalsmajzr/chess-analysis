import { Player } from "@/types/Game";

export const PLAYERS: Record<string, Player> = {
  // "309095": {
  //   fname: "David",
  //   lname: "Navara",
  //   title: "GM",
  //   elo: 2624,
  //   icon: "/icons/men/navara.png",
  // },
};

export function mapPlayer(player: Player): Player {
  const mapped = player.fideid && PLAYERS[player.fideid];

  if (mapped) return mapped;

  return {
    fname: player.fname,
    lname: player.lname,
    title: player.title ?? null,
    elo: player.elo ?? null,
    icon: null,
  };
}
