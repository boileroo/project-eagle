# Share code for single round

## What

Enable sharing a single round via a share code so another user can join the round.

## Context

Currently there is no way to generate or use a share code for a single round (unlike tournaments). That prevents adding another user to a single round via the share flow. This was discovered during smoke testing where the "Share code" action is unavailable for single rounds.

Possible approaches:

- Reuse the existing tournament share code mechanism (if applicable) with a distinct flow for single rounds
- Create a lightweight share token tied to the single round record that can be redeemed by another user to join

Reproduction steps:

1. Create a single round
2. Attempt to use "share code" or similar action to invite another user
3. Observe option is missing or disabled

## Done When

- Users can generate a share code for single rounds and other users can redeem it to join the round
- Backend endpoints and validation are added and covered by tests
- Manual QA: generate a share code, redeem it from another account and confirm the user is added to the round
