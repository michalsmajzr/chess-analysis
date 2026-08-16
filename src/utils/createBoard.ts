import {
  Chessboard,
  INPUT_EVENT_TYPE,
} from "@/lib/cm-chessboard/src/Chessboard.js";
import { Chess } from "chess.js";
import {
  Arrows,
  ARROW_TYPE,
} from "@/lib/cm-chessboard/src/extensions/arrows/Arrows.js";
import {
  Markers,
  MARKER_TYPE,
} from "@/lib/cm-chessboard/src/extensions/markers/Markers.js";
import { RightClickAnnotator } from "@/lib/cm-chessboard/src/extensions/right-click-annotator/RightClickAnnotator.js";
import { PromotionDialog } from "@/lib/cm-chessboard/src/extensions/promotion-dialog/PromotionDialog.js";

function getDests(fen: string) {
  const chess = new Chess(fen);
  const dests: Record<string, string[]> = {};

  chess.moves({ verbose: true }).forEach((move) => {
    if (!dests[move.from]) {
      dests[move.from] = [];
    }

    dests[move.from].push(move.to);
  });

  return dests;
}

export function createBoard(
  element: HTMLDivElement,
  fen: string,
  onMove?: Function,
  disableExtensions = false,
) {
  let currentFen = fen;

  const chess = new Chess(currentFen);

  const chessboard = new Chessboard(element, {
    position: currentFen,
    assetsUrl: "/assets/",
    movable: {
      free: false,
      color: chess.turn() === "w" ? "white" : "black",
      dests: getDests(currentFen),
      showDests: true,
    },
    style: {
      aspectRatio: 1,
    },
    extensions: disableExtensions
      ? []
      : [
          {
            class: Markers,
            props: {
              autoMarkers: MARKER_TYPE.square,
            },
          },
          { class: RightClickAnnotator },
          { class: PromotionDialog },
        ],
  });

  let arrows: any = null;
  let markers: any = null;
  let promotionDialog: any = null;

  if (!disableExtensions) {
    arrows = chessboard.getExtension(Arrows);
    markers = chessboard.getExtension(Markers);
    promotionDialog = chessboard.getExtension(PromotionDialog);
  }

  // delete arrows and markers left click
  element.addEventListener("pointerdown", (event) => {
    if (event.button === 0) {
      arrows?.removeArrows();
      markers?.removeMarkers();
    }
  });

  // handles piece movement and validates chess moves
  chessboard.enableMoveInput((event: any) => {
    const chess = new Chess(currentFen);

    switch (event.type) {
      // handle the start of a piece movement
      case INPUT_EVENT_TYPE.moveInputStarted: {
        const piece = chess.get(event.squareFrom);

        if (piece) {
          if (
            (chess.turn() === "w" && piece.color === "w") ||
            (chess.turn() === "b" && piece.color === "b")
          ) {
            const legalMoves = chess.moves({
              square: event.squareFrom,
              verbose: true,
            });

            if (markers) {
              markers.addLegalMovesMarkers(legalMoves);
            }

            return true;
          }
        }

        return false;
      }

      // validate whether the selected move is legal
      case INPUT_EVENT_TYPE.validateMoveInput: {
        const validMove = chess
          .moves({ verbose: true })
          .some(
            (move) =>
              move.from === event.squareFrom && move.to === event.squareTo,
          );

        return validMove;
      }

      // handle the completion of a piece movement
      case INPUT_EVENT_TYPE.moveInputFinished: {
        markers?.removeLegalMovesMarkers();

        const moves = chess.moves({
          verbose: true,
        });

        const legalMoves = moves.filter(
          (move) =>
            move.from === event.squareFrom && move.to === event.squareTo,
        );

        if (legalMoves.length > 0) {
          if (legalMoves.some((move) => move.promotion)) {
            const color = chess.get(event.squareFrom)?.color;

            if (color && promotionDialog) {
              // display the promotion dialog
              promotionDialog.showPromotionDialog(
                event.squareTo,
                color,
                (result: any) => {
                  if (result.type === "pieceSelected") {
                    const promotion = result.piece.charAt(1);

                    onMove?.(event.squareFrom, event.squareTo, promotion);
                  }

                  if (result.type === "canceled") {
                    chessboard.setPosition(currentFen); // restore the previous position if promotion is canceled
                  }
                },
              );

              return true;
            }
          } else {
            const move = legalMoves[0];

            onMove?.(move.from, move.to, move.promotion);

            return true;
          }
        }

        return false;
      }

      default:
        return true;
    }
  });

  function setFen(newFen: string) {
    currentFen = newFen;

    const chess = new Chess(newFen);

    chessboard.setPosition(newFen);

    const inCheck = chess.isCheck();
    const checkColor = inCheck ? chess.turn() : null;

    chessboard.setCheck(inCheck, checkColor as null);
  }

  function setLastMove(from: string | null, to: string | null) {
    chessboard.setLastMove(from, to);
  }

  function setEngineArrows(engineArrows: any[]) {
    if (arrows) {
      arrows.removeArrows(ARROW_TYPE.info);

      if (engineArrows?.length) {
        const min_opacity = 0.75;
        const sorted = [...engineArrows].sort((a, b) => a.rank - b.rank);
        const count = sorted.length;

        sorted.forEach((arrow, index) => {
          if (arrow.from && arrow.to) {
            const normalized = count <= 1 ? 1 : 1 - index / (count - 1);
            const opacity = min_opacity + normalized * (1 - min_opacity);

            arrows.addArrow(ARROW_TYPE.info, arrow.from, arrow.to);

            const svgArrows = element.querySelectorAll(".arrows .arrow-info");
            const svgArrow = svgArrows[svgArrows.length - 1] as
              | SVGElement
              | undefined;

            if (svgArrow) {
              svgArrow.style.opacity = String(opacity);
            }
          }
        });
      }
    }
  }

  function destroy() {
    chessboard.destroy();
  }

  return {
    setFen,
    setLastMove,
    setEngineArrows,
    destroy,
  };
}
