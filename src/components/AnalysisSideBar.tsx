"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Chess } from "chess.js";
import { TreeNode } from "@/types/Game";
import { EnginePV } from "@/types/Engine";
import { RenderItem } from "@/types/Render";

export function AnalysisSideBar({
  gameRoot,
  currentNode,
  renderLine,
  goToNode,
  goBack,
  goNext,
  goToStart,
  goToLast,
  addEngineVariation,
  variations,
  engineVariations,
}: {
  gameRoot: TreeNode | null;
  currentNode: TreeNode | null;
  renderLine: (root: TreeNode, current: TreeNode | null) => RenderItem[];
  goToNode: (node: TreeNode) => void;
  goBack: () => void;
  goNext: () => void;
  goToStart: () => void;
  goToLast: () => void;
  addEngineVariation: (moves: string[]) => void;
  variations: EnginePV[];
  engineVariations: number;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hiddenVariations, setHiddenVariations] = useState<Set<number>>(
    new Set(),
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        goNext();
      }
      if (e.key === "ArrowLeft") {
        goBack();
      }
      if (e.key === "ArrowUp") {
        goToStart();
      }
      if (e.key === "ArrowDown") {
        goToLast();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goBack, goNext]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    // In the stacked mobile layout this panel sits below the board. Keeping
    // the active move visible would otherwise move the page away from the
    // board after every played move or selected game.
    if (!container || window.matchMedia("(max-width: 1000px)").matches) {
      return;
    }

    requestAnimationFrame(() => {
      const activeElement = container.querySelector(
        '[data-active="true"]',
      ) as HTMLElement | null;

      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "start",
        });
      }
    });
  }, [currentNode]);

  return (
    <div className="h-143 w-120 shrink-0 flex flex-col overflow-hidden max-[1000px]:h-100 max-[1000px]:w-full">
      {Array.from({ length: engineVariations }).map((_, index) => {
        const variation = variations.find(variation => variation.rank === index + 1);

        if (!variation) {
          return <div key={`pv-${index}`} className="h-7 shrink-0 w-full" />;
        }

        const evaluation =
          variation.mate !== undefined
            ? `#${Math.abs(variation.mate)}`
            : variation.score !== undefined
              ? `${variation.score >= 0 ? "+" : ""}${variation.score.toFixed(1)}`
              : "";

        const chess = currentNode?.fen ? new Chess(currentNode.fen) : null;

        const moveButtons: {
          label: string;
          uci: string;
        }[] = [];

        if (chess) {
          for (const uci of variation.moves) {
            const from = uci.slice(0, 2);
            const to = uci.slice(2, 4);
            const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;

            const turn = chess.turn();
            const moveNumber = chess.moveNumber();

            try {
              const move = chess.move({
                from,
                to,
                promotion,
              });

              if (!move) {
                break;
              }

              const prefix =
                turn === "w" ? `${moveNumber}.` : `${moveNumber}...`;

              moveButtons.push({
                label: `${prefix}${move.san}`,
                uci,
              });
            } catch {
              break;
            }
          }
        }

        const isExpanded = hiddenVariations.has(variation.rank);

        return (
          <div
            key={variation.rank}
            className="flex w-full min-w-0 items-start gap-1 p-1"
          >
            <span className="w-10 shrink-0 pt-0.5 text-center text-xs font-medium text-gray-500">
              {evaluation}
            </span>

            <div
              className={`min-w-0 flex-1 ${
                isExpanded ? "" : "overflow-hidden"
              }`}
            >
              <div
                className={
                  isExpanded
                    ? "flex flex-wrap items-center gap-x-1.5 gap-y-0.5"
                    : "flex flex-nowrap items-center overflow-hidden"
                }
              >
                {moveButtons.map((move, index) => (
                  <button
                    key={`${variation.rank}-${index}`}
                    type="button"
                    onClick={() =>
                      addEngineVariation(variation.moves.slice(0, index + 1))
                    }
                    className="inline-block shrink-0 whitespace-nowrap rounded px-1 text-xs leading-5 text-white opacity-50 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
                    title="Add variant"
                  >
                    {move.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setHiddenVariations((prev) => {
                  const next = new Set(prev);

                  if (next.has(variation.rank)) {
                    next.delete(variation.rank);
                  } else {
                    next.add(variation.rank);
                  }

                  return next;
                });
              }}
              className="ml-auto shrink-0 w-5 text-center text-xs text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              {isExpanded ? (
                <KeyboardArrowDownIcon sx={{ mt: "-4px" }} />
              ) : (
                <KeyboardArrowRightIcon sx={{ mt: "-4px" }} />
              )}
            </button>
          </div>
        );
      })}

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 grid grid-flow-row-dense grid-cols-[3.25rem_minmax(0,1fr)_minmax(0,1fr)] auto-rows-max items-center gap-y-1.5 p-2 bg-white overflow-y-auto"
      >
        {gameRoot &&
          renderLine(gameRoot, currentNode).map((item, i) => {
            if (item.type === "move_number") {
              return (
                <div
                  key={`n-${i}`}
                  className="col-start-1 self-center text-gray-400 text-right pr-3 font-mono text-sm tabular-nums select-none"
                >
                  {item.text}
                </div>
              );
            }

            if (item.type === "move") {
              return (
                <div
                  key={`m-${i}`}
                  onClick={() => goToNode(item.node)}
                  data-active={item.active}
                  className={`cursor-pointer min-w-0 px-2 py-1.5 text-sm font-semibold rounded-md transition-colors
                  ${item.color === "w" ? "col-start-2" : "col-start-3"} 
                  ${item.active ? "bg-primary-container" : "hover:bg-gray-100 text-gray-800"}`}
                >
                  {item.node.move}
                </div>
              );
            }

            if (item.type === "variation_row") {
              return (
                <div
                  key={`v-${i}`}
                  className="col-span-3 min-w-0 rounded-md bg-slate-50 px-2 py-1.5 text-sm leading-6"
                  style={{ marginLeft: `${item.depth * 22}px` }}
                >
                  <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                    {item.content.map((sub, si) => (
                      <span key={si} className="inline-flex items-baseline">
                        {sub.type === "variation_label" && (
                          <span className="mr-0.5 font-mono text-xs font-semibold italic tabular-nums text-slate-400">
                            {sub.text}
                          </span>
                        )}
                        {sub.type === "move" && (
                          <span
                            onClick={() => goToNode(sub.node)}
                            data-active={sub.active}
                            className={`cursor-pointer rounded px-1 py-0.5 font-medium transition-colors hover:bg-gray-200
                            ${sub.active ? "bg-inverse-primary hover:bg-inverse-primary font-bold" : "text-gray-600"}`}
                          >
                            {sub.node.move}
                          </span>
                        )}
                        {sub.type === "text" && (
                          <span className="px-0.5 text-slate-400">{sub.text}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })}
      </div>
      <div className="flex mt-1">
        <Button
          onClick={() => {
            goToStart();
            scrollContainerRef.current?.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
          variant="contained"
          color="primary"
          sx={{ borderRadius: 0 }}
          disableElevation
          fullWidth
        >
          <SkipPreviousIcon />
        </Button>
        <Button
          onClick={goBack}
          variant="contained"
          color="primary"
          sx={{ borderRadius: 0 }}
          disableElevation
          fullWidth
        >
          <ArrowBackIosNewIcon />
        </Button>
        <Button
          onClick={goNext}
          variant="contained"
          color="primary"
          sx={{ borderRadius: 0 }}
          disableElevation
          fullWidth
        >
          <ArrowForwardIosIcon />
        </Button>
        <Button
          onClick={goToLast}
          variant="contained"
          color="primary"
          sx={{ borderRadius: 0 }}
          disableElevation
          fullWidth
        >
          <SkipNextIcon />
        </Button>
      </div>
    </div>
  );
}
