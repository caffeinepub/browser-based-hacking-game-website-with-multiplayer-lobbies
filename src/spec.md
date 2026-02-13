# Specification

## Summary
**Goal:** Reduce Solo Mode startup latency and make the loading experience feel more responsive and informative while the lobby becomes ready.

**Planned changes:**
- Tighten the Solo readiness fallback path when `startMatchAndGetLobby` returns a lobby that isn’t ready by tuning the bounded retry/backoff schedule to favor faster early retries while still respecting the overall Solo init timeout.
- Keep readiness polling bounded and preserve the existing failure behavior that transitions to `INITIALIZATION_FAILED` with Retry/Back controls when readiness is not reached in time.
- Improve Solo initialization loading UI messaging with phase-specific English progress text and a continuously updating elapsed-time display during `INITIALIZING_SOLO_MODE`, which disappears once ready or on error.

**User-visible outcome:** Solo Mode reaches the playable terminal state faster in common transient-delay cases, and during slower startups users see clearer phase progress plus an updating elapsed-time indicator until the terminal is ready (or an error is shown).
