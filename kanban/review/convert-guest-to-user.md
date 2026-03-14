# Guest to user conversino

## What

Convert guests in a round/tournament to users

## Context

As a commissioner it is helpful to be able to configure a round or tournament ahead of time, before other users have been invited or accepted their invitation to join the tournament.

I want to be able to configure a tournament/round using guests, before later either converting the guests to real users, or leaving them as-is as per our current implementation.

I am unsure how the conversion should work. I am thinking that when a user enters a 'join code' they are first presented with a list of guests and can select one to replace in the tournament, or alternatively if they are not in the list then they can proceed as present.

Please review and propose a potential implementation in terms of both the UX and also the code

## Done When

- A tournament can be configured with guests and later replaced with real users
- Guests can still remain in the tournament as per current implementation.
