# Chess analysis

## Description
This project is used to analyze chess games from the livechesscloud app.

Demo version is available on my domain [chess-analysis.michalsmajzr.cz](https://chess-analysis.michalsmajzr.cz/)

## Project structure

```
.
├── src/
│   ├── app/                Next.js pages and routes
│   ├── components/         React UI components
│   ├── features/analysis/  Chess analysis feature
│   ├── stockfish/          Browser Stockfish integration
│   ├── api/                LiveChessCloud client
│   ├── websocket/          Browser WebSocket clients
│   ├── utils/              Shared utility functions
│   ├── types/              Shared TypeScript types
│   ├── providers/          Application providers
│   └── lib/                Integrated cm-chessboard library
├── public/                 Static assets
├── Dockerfile              Web application images
```
