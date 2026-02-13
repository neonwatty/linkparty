# Multi-User Browser Workflows Design

## Goal

Create multi-user browser workflows that run against production (linkparty.app) using Claude Code agent teams. Two agents (Host and Guest) each control a separate Chrome tab, coordinating via messages to test realtime collaborative features. Captures screenshots and GIFs for QA evidence.

## Architecture

### Agent Teams

- **Team Lead**: Parses workflow file, creates tasks per scenario, assigns to agents, coordinates execution
- **Host Agent** (`host`): Controls Chrome Tab 1 — creates parties, adds content, advances queue
- **Guest Agent** (`guest`): Controls Chrome Tab 2 — joins parties, adds content, verifies sync

Both agents are `general-purpose` subagents spawned via `Task` tool with `team_name` parameter.

### Coordination

- `SendMessage` (type: "message") for sync points between agents
- `TaskCreate`/`TaskUpdate` for scenario tracking
- `SendMessage` (type: "shutdown_request") for teardown

### Session Isolation

Each agent injects a unique `session_id` into its tab's localStorage via `browser_evaluate` before any party interaction. This prevents the session ID collision documented in MEMORY.md.

## Workflow File Format

Single file at `workflows/multi-user-workflows.md` with labeled steps:

- `[HOST]` / `[GUEST]` labels indicate which agent acts
- `**SYNC → TARGET: message**` marks coordination points
- Screenshots captured at each step

## Scenarios (10 workflows)

1. **Create and Join Party** — foundation flow
2. **Realtime Content Sync** — HOST adds YouTube, GUEST adds note, both see updates
3. **Queue Advance Sync** — HOST advances, GUEST sees NOW SHOWING update
4. **Toggle Completion Sync** — complete/uncomplete notes sync between users
5. **Drag-and-Drop Reorder Sync** — HOST reorders queue, GUEST sees new order
6. **Password-Protected Join** — wrong password rejected, correct password succeeds
7. **TV Mode Sync** — HOST in TV mode, GUEST in regular view, updates sync
8. **Guest Leave and Rejoin** — member count updates on leave/rejoin
9. **Deep Link Join** — GUEST joins via /join/CODE URL
10. **Simultaneous Content Adds** — both add content at same time, both see results

## Execution

Team lead runs one scenario at a time:

1. Creates task for the scenario
2. Host agent starts, performs steps, messages Guest at sync points
3. Guest agent acts on messages, performs steps, messages Host
4. Both capture screenshots
5. Both mark task complete
6. Team lead proceeds to next scenario
