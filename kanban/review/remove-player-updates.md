# Remove player

## What

Improvements to the 'remove player from tournament' feature.

## Context

When removing a participant from a tournament using the cross icon on the participants table there are some improvements required.

## Done When

- Players can only be removed when the tournament is in a draft state.
- When clicking the cross, a confirmation dialog ('are you sure you want to remove \_\_\_\_') is shown to confirm the action rather than the current approach of simply removing them instantly.
- Users viewing the tournament participants page should see updates pushed to their device immediately, currently it requires a refresh.
- If a user is viewing the tournament when they are removed, they are informed as such and redirected back to the home page.
