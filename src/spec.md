# Specification

## Summary
**Goal:** Fix remaining Solo Mode runtime issues and backend/frontend API mismatches by hardening Solo Mode initialization and replacing the frontend’s simulated terminal command processing with a real backend `processCommand` API.

**Planned changes:**
- Harden Solo Mode initialization flow end-to-end (create lobby → start match → load first challenge) so failures/incomplete state/poll timeouts reliably transition to the existing error panel instead of sticking on “INITIALIZING_SOLO_MODE...”.
- Add a backend canister method `processCommand(lobbyId, commandText)` that returns structured terminal output compatible with the frontend’s `CommandOutput` shape and supports per-lobby progress (including multi-step solving).
- Update the frontend `useProcessCommand` hook to call the typed backend `processCommand` directly (remove `any` actor access and remove simulation fallback) and surface backend command-processing failures as clear English terminal output/errors.
- Fix backend Solo Mode authorization/identity handling so anonymous users can create and play solo lobbies without traps, while preserving existing permission checks for multiplayer actions.

**User-visible outcome:** Navigating to `/solo` reliably reaches the playable terminal view or shows a clear “INITIALIZATION_FAILED” error with Retry/Back, and terminal commands are processed by the backend (with clear English error output if processing fails), including for anonymous Solo Mode users.
