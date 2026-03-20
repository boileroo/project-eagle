# Team match config

## What

Fix the bug where the team match configurator incorrectly reports that a valid 2v2 setup does not exist when the round contains four players arranged as 2v2.

## Context

Observed during smoke testing: when a round is set up with 4 players in a 2v2 arrangement the "configure matches" flow shows messages like "No groups have been created. Set up groups in the Players & Groups section above, then come back to configure matches." and refuses to let you configure the 2v2 match. The code appears to confuse how the "groups" concept is represented (a round with 4 players can be a single group but still be a valid 2v2). In practice there is always at least one group, so the configurator should treat a group containing multiple players as valid for team match setup.

Possible causes:

- Predicate that checks for groups treats a single group as "no groups" when its size is >1
- Mismatch between UI representation of teams/groups and the config validation logic

Reproduction steps:

1. Create a round with 4 players arranged as a 2v2 setup (either by assigning teams or by grouping)
2. Open Players & Groups then go to Configure Matches
3. Observe the erroneous "No groups have been created" message or inability to create 2v2 matches

## Done When

- The team match configurator recognises a 2v2 setup when 4 players are present and allows configuring the match
- The erroneous "No groups have been created" message no longer appears for valid group configurations
- Add a unit or integration test that covers a 4-player 2v2 configuration and validates the configurator accepts it
- Manual QA: follow reproduction steps and confirm the flow works as intended
