# Chess analysis

## Description
This project is used to analyze chess games from the livechesscloud app.

Demo version is available on my domain [chess-analysis.michalsmajzr.cz](https://chess-analysis.michalsmajzr.cz/)

## Project structure

```
src/
  api/                    LiveChessCloud config, games and players
  app/                    Next.js routes
  components/             React UI components
    analysis/
    broadcast/
  features/
    analysis/
      tree/               GameTree and chess-tree operations
      workspace/          Open games, active tree and follow-live
      pgn/                PGN import and export
      hooks/              React hooks for analysis
      types/              Analysis-specific types
  websocket/              EvaluationClient and ObsClient
  stockfish/              Browser Stockfish integration
  types/                  Shared application types
  utils/                  Small shared helpers
```
