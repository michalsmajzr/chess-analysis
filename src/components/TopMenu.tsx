import { TournamentsMenu } from "@/components/TournamentsMenu";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import { Drawer, IconButton, Slider, Typography } from "@mui/material";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import { loadRound } from "@/api/liveChessCloud";
import { Tournament, RoundData } from "@/types/Game";
import { obsClient } from "@/websocket/obsClient";
import { useEffect, useState } from "react";

export function TopMenu({
  tournaments,
  setSelectedRoundsData,
  loadPgn,
  canImportPgn,
  onDownloadPgn,
  showEngineArrow,
  setShowEngineArrow,
  engineVariations,
  setEngineVariations,
  followLive,
  onFollowLiveChange,
  pgnInputRef,
}: {
  tournaments: Tournament[];
  setSelectedRoundsData: React.Dispatch<React.SetStateAction<RoundData[]>>;
  loadPgn: (pgn: string) => void;
  canImportPgn: boolean;
  onDownloadPgn: () => void;
  showEngineArrow: boolean;
  setShowEngineArrow: (value: boolean) => void;
  engineVariations: number;
  setEngineVariations: (value: number) => void;
  followLive: boolean;
  onFollowLiveChange: (value: boolean) => void;
  pgnInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [publisherOpen, setPublisherOpen] = useState(false);
  const [publisherToken, setPublisherToken] = useState("");
  const [publisherStatus, setPublisherStatus] = useState<{ active: boolean; message?: string }>({ active: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => obsClient.subscribePublisherStatus(setPublisherStatus), []);

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
    if (!canImportPgn) {
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];

    if (file) {
      const pgn = await file.text();

      loadPgn(pgn);

      event.target.value = "";
    }
  }

  const followLiveControl = (vertical = false) => (
    <FormControlLabel
      control={
        <Switch
          color="secondary"
          checked={followLive}
          onChange={(event) => onFollowLiveChange(event.target.checked)}
        />
      }
      label="Follow live"
      className={vertical ? "m-0" : "m-0!"}
    />
  );

  const controls = (vertical = false) => (
    <div className={vertical ? "flex w-full flex-col items-stretch gap-3" : "flex flex-1 items-center gap-3"}>
      <Button
        size="small"
        variant={publisherStatus.active ? "contained" : "outlined"}
        color={publisherStatus.active ? "success" : "primary"}
        onClick={() => setPublisherOpen(true)}
      >
        {publisherStatus.active ? "Vysílání aktivní" : "Zapnout vysílání"}
      </Button>
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
        disabled={!canImportPgn}
      >
        <UploadFileIcon sx={{ fontSize: 28 }} />
      </IconButton>
      <FormControlLabel
        control={
          <Switch
            color="secondary"
            checked={showEngineArrow}
            onChange={(event) => setShowEngineArrow(event.target.checked)}
          />
        }
        labelPlacement="end"
        label="Engine arrows"
        className={vertical ? "m-0" : "flex h-8 justify-center ml-2! -mr-2!"}
      />
      {followLiveControl(vertical)}
      <div className={vertical ? "flex flex-col px-3" : "-mt-7 ml-6 flex flex-col items-center"}>
        <Typography variant="body2" className={vertical ? "text-center" : undefined} sx={{ fontSize: 15, p: 0.5 }}>
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
          className={vertical ? "w-full! p-0!" : "w-[120px]! p-0!"}
        />
      </div>
    </div>
  );

  return (
    <>
      <input ref={pgnInputRef} type="file" accept=".pgn,text/plain" onChange={handleLoadPgn} disabled={!canImportPgn} className="hidden" />
      <div className="flex min-w-0 border-white/10 max-[1276px]:hidden">
        <TournamentsMenu tournaments={tournaments} onRoundChange={handleRoundChange} />
        {controls()}
      </div>

      <div className="hidden justify-end border-white/10 p-2 max-[1276px]:flex">
        <IconButton onClick={() => setMobileMenuOpen(true)} aria-label="Otevřít nabídku" aria-expanded={mobileMenuOpen}>
          <MenuIcon />
        </IconButton>
      </div>
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        slotProps={{ paper: { sx: { width: "100%", height: "100%", p: 3 } } }}
      >
        <div className="flex justify-end">
          <IconButton onClick={() => setMobileMenuOpen(false)} aria-label="Zavřít nabídku">
            <CloseIcon />
          </IconButton>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-col gap-8">
          <TournamentsMenu tournaments={tournaments} onRoundChange={handleRoundChange} className="flex-col items-stretch gap-4" />
          {controls(true)}
        </div>
      </Drawer>
      <Dialog open={publisherOpen} onClose={() => setPublisherOpen(false)}>
        <DialogTitle>Broadcasting client</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Vysílací token"
            value={publisherToken}
            onChange={event => setPublisherToken(event.target.value.toUpperCase())}
            placeholder="CHESS-PUB-XXXX-XXXX-XXXX-XXXX"
            slotProps={{ htmlInput: { autoCapitalize: "characters", spellCheck: false } }}
            type="password"
          />
          <Typography variant="body2" sx={{ mt: 1 }}>
            {publisherStatus.message ?? "Po ověření bude tento klient jediným zdrojem všech vysílaných šachovnic."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublisherOpen(false)}>Zavřít</Button>
          <Button
            variant="contained"
            onClick={() => {
              obsClient.activatePublisher(publisherToken);
              setPublisherOpen(false);
            }}
          >
            Ověřit a vysílat
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
