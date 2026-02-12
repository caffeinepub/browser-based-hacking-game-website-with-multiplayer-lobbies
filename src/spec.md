# Specification

## Summary
**Goal:** Reduce Solo Mode startup latency and prevent premature “The game server may be slow or experiencing issues” failures during normal-but-slower initialization.

**Planned changes:**
- Update SoloGamePage initialization to stay in a loading state with clear English progress messaging and only transition to an error panel after a longer, explicit timeout.
- Keep the existing error panel actions (RETRY and BACK_TO_MENU) when the explicit timeout is reached.
- Optimize Solo readiness handling to immediately use the lobby returned by startMatchAndGetLobby when it is already active and has a non-null currentChallenge; otherwise, apply a bounded retry/polling strategy that avoids failing early due to transient latency.
- Update backend startMatchAndGetLobby to return the current LobbyView (when already active and currentChallenge is present) instead of trapping with “Match is already active”, while preserving host-only authorization and leaving startMatch behavior unchanged.

**User-visible outcome:** Entering Solo Mode shows a stable loading experience with clear progress text, reaches the terminal view sooner when the lobby is already ready, and only shows a retryable error after a longer explicit timeout.
