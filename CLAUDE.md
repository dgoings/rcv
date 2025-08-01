# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `bun run dev` - Start both frontend (Vite dev server) and backend (Convex dev server) in parallel
- `bun run dev:frontend` - Start only the Vite frontend dev server (opens browser automatically)
- `bun run dev:backend` - Start only the Convex backend dev server
- `bun run build` - Build the frontend for production
- `bun run lint` - Run comprehensive linting including TypeScript checking for both frontend and backend, Convex deployment validation, and Vite build
- Use `bun` instead of `npm` for all commands (preferential recommendation)

## Architecture Overview

This is a **Ranked Choice Voting (RCV) application** built with the Chef template using Convex as the backend.

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Convex (real-time database with serverless functions)
- **Authentication**: Convex Auth with anonymous authentication
- **Routing**: React Router v7
- **UI**: Tailwind CSS with Sonner for toast notifications

### Core Architecture

**Database Schema** (`convex/schema.ts`):
- `ballots` - Main ballot entities with RCV configuration (time/count/manual duration types)
- `votes` - Individual vote submissions with ranked choice data
- `userBallotActivity` - Tracks user creation/voting activity
- Uses Convex Auth tables for user management

**Key Backend Logic** (`convex/ballots.ts`):
- RCV algorithm implementation with round-by-round elimination
- Ballot lifecycle management (creation, voting, closing)
- Anonymous and authenticated voting support
- Real-time result calculations

**Frontend Structure**:
- `src/App.tsx` - Main app with routing and authentication states
- `src/components/` - Page components (Home, CreateBallot, BallotView, Dashboard, etc.)
- Uses Convex React hooks for real-time data binding

### Convex-Specific Patterns

- **Queries**: Real-time data fetching (e.g., `getBallotByUrl`, `getBallotResults`)
- **Mutations**: Data modifications (e.g., `createBallot`, `submitVote`, `closeBallot`)
- **Authentication**: Uses `getAuthUserId()` for user context
- **Indexes**: Optimized queries with `by_url_id`, `by_creator`, `by_ballot`, etc.

### Key Features

1. **Ballot Creation**: Flexible duration settings (time-based, vote count, or manual closing)
2. **Anonymous Voting**: IP-based voter identification without requiring accounts
3. **Real-time Results**: Live RCV calculation with round-by-round breakdown
4. **User Dashboard**: Track created and voted ballots for authenticated users
5. **URL-based Sharing**: Each ballot gets a unique shareable URL

### Development Notes

- The project uses Convex deployment `dutiful-ptarmigan-514`
- TypeScript is configured with relaxed linting rules for easier development
- ESLint includes React hooks and refresh plugins
- The frontend uses path alias `@/` for `./src/` imports
- Chef development tools are injected in development mode for screenshots/debugging