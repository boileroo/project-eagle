# Minor updates

## What

A few minor updates found in smoke tests.

## Context - UI/UX Improvements

- When a round/tournament only has one player, the +Game, +Team Match, +Bonus buttons should be disabled on the setup page
- When a round/tournament only has one player, the +Game, +Team Match, +Bonus buttons should be disabled on the setup page
- Standardise the Header component(s) of both the Tournament Detail and Single Round Detail pages.
- Once a tournament or single round is part the initial setup state and in 'awaiting start' or later, hide the tabs in the participants section that are not applicable, i.e. if no teams or groups enabled, just hide the tabs altogether.
- When starting a single round tournament, I get error toasts saying can't transition from open to open as though the mutation is firing multiple times
- An in play round should not show the Participants section any more, it is redundant by that point
- An in play round with no competitions should not show the competitions section, only the scorecard and scoreboard
- An in play round without full scorecards for all players: the 'finish round' button should show a warning along the lines of 'some players are yet to complete their rounds; are you sure you want to finish scoring?'
- An in play round with at least one score by one player should not be able to go back to 'awaiting start'
- Move the Quick Score button into the scorecard panel
- A commissioner entering their own score should not see the 'recording as commissioner' pill
- the individual scoreboard is not updating as scores are enterred during a round. It only updates if you leave and return to the page.
- in quick score mode the next/prev buttons should be pinned to the bottom edge of the screen at all times with scrolling in the content panel
- When creating a round, default the date and time to 'now' rather than blank
- Two players in a round together (not as part of teams) should still be able to play matchplay against one another, but it's not an option in the games list. Also applicable for four players in a group playing pairs matchplay. Perhaps this should be a 'match' rather than a game thinking about it? New categort of 'Match' separately from 'Team Match'?
- Games need reviewing: wolf is only 3 or 4 players. 6-point game is only 3 players. Chair is only 3 or 4 players.
- When a round is 'awaiting start' the handicaps should no longer be editable. Currently a user's HC can be edited (could also be down to being the commissioner)
- The scorecard keeps track of strokes and score to par at the bottom. It should only consider the score to par of holes played so far, not the whole course.
- on a round page make the scorecard section collapsible

## Logic issues / bug fixes

- Team match config incorrectly assessing that a 2v2 setup has no valid 2v2 setup wehn the round consists of 4 players in a 2v2 setup. I think this is due to confusion with how the 'groups' works - because it is 4 players there is only 1 group but it seems to be treated as though there are no groups. In reality there is always at least 1 group. Likewise the 'configure matches' when selecting singles says 'No groups have been created. Set up groups in the Players & Groups section above, then come back to configure matches.' but there is always a group even if it just has 1-4 players in it.
- quick score view is incorrectly showing guests as commissioners in some instances
- Can't use 'share code' for a single round, so there is no way of adding another user
