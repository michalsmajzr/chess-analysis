import { TournamentsMenu } from "@/components/TournamentsMenu";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import { IconButton, Slider, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { loadRound } from "@/api/liveChessCloud";
import { Tournament, RoundData } from "@/types/Game";

export function TopMenu({
  tournaments,
  setSelectedRoundsData,
  loadPgn,
  onDownloadPgn,
  showEngineArrow,
  setShowEngineArrow,
  engineVariations,
  setEngineVariations,
  pgnInputRef,
}: {
  tournaments: Tournament[];
  setSelectedRoundsData: React.Dispatch<React.SetStateAction<RoundData[]>>;
  loadPgn: (pgn: string) => void;
  onDownloadPgn: () => void;
  showEngineArrow: boolean;
  setShowEngineArrow: (value: boolean) => void;
  engineVariations: number;
  setEngineVariations: (value: number) => void;
  pgnInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  async function handleRoundChange(
    baseId: string,
    roundId: number,
    tournamentIndex: number,
  ) {
    const data = await loadRound(baseId, roundId);

    setSelectedRoundsData((prev) => {
      const updated: RoundData[] = [
        ...prev.filter((r) => r.tournamentIndex !== tournamentIndex),
        {
          tournamentIndex,
          tournamentId: baseId,
          tournamentName: tournaments[tournamentIndex]?.name ?? baseId,
          round: roundId,
          info: data.info,
          games: data.games,
        },
      ];

      return tournaments
        .map((_: Tournament, index: number) =>
          updated.find((r) => r.tournamentIndex === index),
        )
        .filter((r): r is RoundData => r !== undefined);
    });
  }

  async function handleLoadPgn(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      const pgn = await file.text();

      loadPgn(pgn);

      event.target.value = "";
    }
  }

  return (
    <div className="flex">
      <TournamentsMenu
        tournaments={tournaments}
        onRoundChange={handleRoundChange}
      />

      <div className="flex-1 flex items-center gap-1">
        <IconButton
          onClick={onDownloadPgn}
          title="Download PGN"
          aria-label="Download PGN"
        >
          <DownloadIcon sx={{ fontSize: 28 }} />
        </IconButton>

        <IconButton
          onClick={() => pgnInputRef.current?.click()}
          title="Load PGN"
          aria-label="Load PGN"
        >
          <UploadFileIcon sx={{ fontSize: 28 }} />
        </IconButton>

        <input
          ref={pgnInputRef}
          type="file"
          accept=".pgn,text/plain"
          onChange={handleLoadPgn}
          className="hidden"
        />

        <FormControlLabel
          control={
            <Switch
              color="secondary"
              checked={showEngineArrow}
              onChange={(event) => setShowEngineArrow(event.target.checked)}
            />
          }
          labelPlacement="start"
          label="Engine arrows"
          className="flex justify-center h-8"
        />

        <div
          className="flex flex-col items-center"
          style={{
            marginLeft: "40px",
            marginTop: "-26px",
          }}
        >
          <Typography variant="body2" sx={{ fontSize: 15, p: 0.5 }}>
            Multi-PV
          </Typography>

          <Slider
            value={engineVariations}
            onChange={(_, value) => setEngineVariations(value as number)}
            min={0}
            max={3}
            step={1}
            marks
            valueLabelDisplay="auto"
            sx={{ width: 120, p: 0 }}
          />
        </div>
      </div>
    </div>
  );
}
