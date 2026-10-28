import { Result } from "@/types/Game";

export function hasFinalResult(result: Result) {
  return result === "DRAW" || result === "WHITEWIN" || result === "BLACKWIN";
}

export function getScore(result: Result, color: "white" | "black") {
  if (result === "DRAW") {
    return "1/2";
  }

  if (result === "WHITEWIN") {
    return color === "white" ? "1" : "0";
  }

  if (result === "BLACKWIN") {
    return color === "black" ? "1" : "0";
  }

  return "";
}
