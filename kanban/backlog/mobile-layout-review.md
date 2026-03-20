# Mobile Layout Review

## What

Comprehensive review and fix of mobile layouts across tournament and round detail pages.

## Context

The mobile layout for tournament and round detail pages has issues with buttons overflowing the screen and generally poor layout on small viewports. This was identified during smoke testing (minor-updates.md line 28):

> mobile layout for a tournament / round has lots of buttons overflowing the screen. Layout is generally poor on mobile.

This requires a systematic review of all pages at mobile breakpoints (320px, 375px, 414px) to identify and fix overflow, spacing, and usability issues.

### Suggested approach

- Use Playwright viewport testing to systematically screenshot pages at mobile breakpoints
- Focus on: action button groups, tab navigation, scorecard tables, competition sections, dialog forms
- Consider responsive patterns: horizontal scroll for wide tables, stacked buttons, collapsible sections

### Key pages to review

- Tournament detail page (all tabs: Players, Teams, Groups, Rounds)
- Round detail page (setup, in-play, and finalized states)
- Live scoring / quick score page
- Score entry dialog
- Competition creation dialogs

## Done When

- No horizontal overflow on any page at 375px viewport width
- All action buttons are accessible without horizontal scrolling
- Scorecard tables are usable on mobile (horizontal scroll or responsive layout)
- Dialog forms are properly sized and scrollable on mobile
- Tab navigation does not overflow on mobile
