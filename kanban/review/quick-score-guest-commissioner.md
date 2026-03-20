# Quick score - guests shown as commissioners

## What

Fix the bug where the quick score view sometimes displays guest users as if they were the commissioner.

## Context

During smoke testing the quick score UI occasionally renders a "recording as commissioner" indicator next to users who are guests (not the actual commissioner). This is confusing and can lead to incorrect assumptions about who is recording scores.

Possible causes:

- The permission/context lookup for the quick score view is falling back to an incorrect user identity
- A memoization/cache layer is returning stale session or role data for guest users
- The UI component that decides whether to show the commissioner pill is using the wrong predicate (eg. checking for any "isAdmin" flag instead of exact commissioner id)

Reproduction steps:

1. Create or join a round where a guest user participates and the commissioner is a different user
2. Open Quick Score view and advance through a few score entries
3. Observe the guest shown with "recording as commissioner" pill in some instances

## Done When

- Quick score view never shows guest users as commissioners
- The commissioner's identity is derived from a single reliable source (session or round membership) and not from a transient cache
- Add unit or integration tests for the quick score permission rendering logic covering guest scenarios
- Manual QA: reproduce the original scenario and confirm the UI correctly identifies the commissioner
