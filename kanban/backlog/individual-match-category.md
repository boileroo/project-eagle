# Individual Match Category

## What

Add a new "Match" competition category that allows individual players (not teams) to play matchplay against one another.

## Context

Currently, matchplay is only available as a "Team Match" — requiring teams to be configured. Two players in a round together (not as part of teams) should still be able to play matchplay against one another. Similarly, four players in a group could play pairs matchplay.

This should be a distinct "Match" category, separate from the existing "Team Match" category. It would sit alongside "Game" and "Bonus" in the individual competitions section.

Relevant reference from the original requirements (minor-updates.md line 23):

> Two players in a round together (not as part of teams) should still be able to play matchplay against one another, but it's not an option in the games list. Also applicable for four players in a group playing pairs matchplay. Perhaps this should be a 'match' rather than a game thinking about it? New category of 'Match' separately from 'Team Match'?

## Done When

- A new "Match" button appears in the competitions section alongside +Game and +Bonus
- Two individual players can be paired for head-to-head matchplay without requiring team configuration
- Four players in a group can play pairs matchplay (2v2) without requiring tournament-level teams
- Match results are tracked and displayed on the scoreboard
- The existing "Team Match" functionality remains unchanged
- test-scenarios.md is updated to reflect new additions
- new kanban tickets in kanban/backlog/test are raised to cover any new tests required
