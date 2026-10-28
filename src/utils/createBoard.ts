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
  onAnnotationsChange?: (annotations: {
    arrows: { from: string; to: string; brush?: "success" | "warning" | "info" | "danger" }[];
    markers: { square: string; brush?: "success" | "warning" | "info" | "danger" }[];
  }) => void,
  onDragChange?: (drag: {
    active: boolean;
    from?: string;
    to?: string | null;
    targets?: string[];
  }) => void,
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
  let engineArrowKeys = new Set<string>();
  let currentEngineArrows: any[] = [];
  let markers: any = null;
  let promotionDialog: any = null;

  if (!disableExtensions) {
    arrows = chessboard.getExtension(Arrows);
    markers = chessboard.getExtension(Markers);
    promotionDialog = chessboard.getExtension(PromotionDialog);
  }

  const reportAnnotations = () => {
    if (!onAnnotationsChange || !arrows || !markers) {
      return;
    }
    const reportedArrows = arrows.getArrows()
      .filter((arrow: any) => !(
        arrow.type.class === ARROW_TYPE.info.class &&
        engineArrowKeys.has(`${arrow.from}-${arrow.to}`)
      ))
      .map((arrow: any) => ({
      from: arrow.from,
      to: arrow.to,
      brush: Object.entries(ARROW_TYPE).find(([, type]) => type.class === arrow.type.class)?.[0] as
        | "success" | "warning" | "info" | "danger" | undefined,
      }));
    const reportedMarkers = markers.getMarkers()
      .filter((marker: any) => marker.type.class.startsWith("marker-circle-"))
      .map((marker: any) => ({
        square: marker.square,
        brush: marker.type.class.replace("marker-circle-", "") as
          | "success" | "warning" | "info" | "danger",
      }));
    onAnnotationsChange({ arrows: reportedArrows, markers: reportedMarkers });
  };

  // delete arrows and markers left click
  const handlePointerDown = (event: PointerEvent) => {
    if (event.button === 0) {
      arrows?.removeArrows();
      markers?.removeMarkers();
      reportAnnotations();
    }
  };
  const handleMouseUp = (event: MouseEvent) => {
    if (event.button === 2) {
      reportAnnotations();
    }
  };
  element.addEventListener("pointerdown", handlePointerDown);
  // RightClickAnnotator also listens for mouseup and was registered first, so
  // its final arrow state is available synchronously here.
  element.addEventListener("mouseup", handleMouseUp);

  // A board without an onMove callback is a display-only board (the compact
  // game previews and broadcast boards). Do not enable the move-input layer
  // there: otherwise pieces can still be picked up even though no move can be
  // applied.
  if (onMove) {
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
            onDragChange?.({
              active: true,
              from: event.squareFrom,
              to: null,
              targets: legalMoves.map(move => move.to),
            });

            return true;
          }
        }

        return false;
      }

      case INPUT_EVENT_TYPE.movingOverSquare:
        return true;

      case INPUT_EVENT_TYPE.moveInputCanceled:
        onDragChange?.({ active: false });
        return true;

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
        onDragChange?.({ active: false });

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
  }

  function setFen(newFen: string, animated = false) {
    currentFen = newFen;

    const chess = new Chess(newFen);

    chessboard.setPosition(newFen, animated);

    const inCheck = chess.isCheck();
    const checkColor = inCheck ? chess.turn() : null;

    chessboard.setCheck(inCheck, checkColor as null);
  }

  function setLastMove(from: string | null, to: string | null) {
    chessboard.setLastMove(from, to);
  }

  function setDragPreview(drag: {
    active: boolean;
    from?: string;
    to?: string | null;
    targets?: string[];
  }) {
    chessboard.setPosition(currentFen, false);

    markers?.removeLegalMovesMarkers();
    markers?.removeMarkers(MARKER_TYPE.square);

    if (!drag.active) {
      return;
    }

    for (const square of drag.targets ?? []) {
      markers?.addMarker(
        chessboard.getPiece(square) ? MARKER_TYPE.bevel : MARKER_TYPE.dot,
        square,
      );
    }

    if (drag.from) {
      markers?.addMarker(MARKER_TYPE.square, drag.from);
    }

  }

  function setEngineArrows(engineArrows: any[]) {
    currentEngineArrows = engineArrows ?? [];
    if (arrows) {
      arrows.removeArrows(ARROW_TYPE.info);
      engineArrowKeys = new Set(
        (engineArrows ?? []).map(arrow => `${arrow.from}-${arrow.to}`),
      );

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

  function clearAnnotations() {
    arrows?.removeArrows();
    markers?.removeMarkers();
    setEngineArrows(currentEngineArrows);
  }

  function setBroadcastAnnotations(broadcastArrows: any[], broadcastMarkers: any[]) {
    if (!arrows || !markers) {
      return;
    }
    arrows.removeArrows();
    markers.removeMarkers();
    for (const arrow of broadcastArrows ?? []) {
      const type = ARROW_TYPE[arrow.brush as keyof typeof ARROW_TYPE] ?? ARROW_TYPE.info;
      if (arrow.from && arrow.to) {
        arrows.addArrow(type, arrow.from, arrow.to);
      }
    }
    for (const marker of broadcastMarkers ?? []) {
      if (!marker.square) {
        continue;
      }
      const brush = marker.brush ?? "success";
      markers.addMarker(
        { class: `marker-circle-${brush}`, slice: "markerCircle" },
        marker.square,
      );
    }
  }

  function destroy() {
    element.removeEventListener("pointerdown", handlePointerDown);
    element.removeEventListener("mouseup", handleMouseUp);
    chessboard.destroy();
  }

  return {
    setFen,
    setLastMove,
    setEngineArrows,
    clearAnnotations,
    setBroadcastAnnotations,
    setDragPreview,
    destroy,
  };
}
