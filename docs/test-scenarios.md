# Test Scenarios Matrix

Comprehensive smoke-testing scenarios covering all tournament/round configurations, competition formats, team/group setups, and player counts.

---

## Dimensions

| Dimension        | Values                                                                                |
| ---------------- | ------------------------------------------------------------------------------------- |
| **Structure**    | Single round (standalone), Tournament with 1 round, Tournament with 2 rounds          |
| **Teams**        | Disabled, Enabled (2 teams)                                                           |
| **Groups**       | Single group (all players), Multiple groups                                           |
| **Player count** | 2 players, 3 players, 4 players, 6+ players                                           |
| **Format**       | stableford, stroke_play, match_play, best_ball, hi_lo, rumble, wolf, six_point, chair |
| **Group scope**  | `all` (cross-group), `within_group`                                                   |
| **Bonus**        | nearest_pin (standalone), nearest_pin (contributor), longest_drive                    |

### Format Constraints Quick Reference

| Format      | Min players per group | Requires teams | Notes                          |
| ----------- | --------------------- | -------------- | ------------------------------ |
| stableford  | 1                     | No             | Any count works                |
| stroke_play | 1                     | No             | Any count works                |
| match_play  | 2                     | No             | Pairs of 2; even number needed |
| best_ball   | 4                     | Yes            | 2v2 team match                 |
| hi_lo       | 4                     | Yes            | 2v2, two sub-matches per hole  |
| rumble      | 4                     | Yes            | All 4 in group on same team    |
| wolf        | 4                     | No             | Exactly 4 per group            |
| six_point   | 3                     | No             | Exactly 3 per group            |
| chair       | 4                     | No             | Exactly 4 per group            |

---

## 1. Individual Formats (No Teams)

These scenarios have teams **disabled**.

### 1.1 Stableford

| #    | Structure       | Players | Groups         | Scope        | Notes                                   |
| ---- | --------------- | ------- | -------------- | ------------ | --------------------------------------- |
| 1.1a | Single round    | 2       | 1 group        | all          | Minimum viable round                    |
| 1.1b | Single round    | 4       | 1 group        | all          | Standard fourball                       |
| 1.1c | Single round    | 6       | 2 groups (3+3) | all          | Cross-group ranking                     |
| 1.1d | Single round    | 6       | 2 groups (3+3) | within_group | Separate leaderboard per group          |
| 1.1e | Tournament (1R) | 4       | 1 group        | all          | Tournament wrapper, single round        |
| 1.1f | Tournament (2R) | 4       | 1 group        | all          | Multi-round aggregation                 |
| 1.1g | Tournament (2R) | 6       | 2 groups (3+3) | all          | Multi-round, different groups per round |

### 1.2 Stroke Play

| #    | Structure       | Players | Groups         | Scope        | Scoring basis | Notes                          |
| ---- | --------------- | ------- | -------------- | ------------ | ------------- | ------------------------------ |
| 1.2a | Single round    | 4       | 1 group        | all          | gross_strokes | Gross stroke ranking           |
| 1.2b | Single round    | 4       | 1 group        | all          | net_strokes   | Net stroke ranking             |
| 1.2c | Single round    | 6       | 2 groups (3+3) | within_group | net_strokes   | Per-group net results          |
| 1.2d | Tournament (2R) | 4       | 1 group        | all          | net_strokes   | Multi-round stroke aggregation |

### 1.3 Match Play (Singles)

| #    | Structure       | Players | Groups         | Scope        | Notes                              |
| ---- | --------------- | ------- | -------------- | ------------ | ---------------------------------- |
| 1.3a | Single round    | 2       | 1 group        | all          | Single match, explicit pairing     |
| 1.3b | Single round    | 4       | 1 group        | within_group | Auto-pairs: 1v2, 3v4               |
| 1.3c | Single round    | 6       | 2 groups (3+3) | all          | 3 explicit cross-group pairings    |
| 1.3d | Single round    | 8       | 2 groups (4+4) | within_group | Auto-pairs within each group       |
| 1.3e | Tournament (2R) | 4       | 1 group        | within_group | Multi-round match wins aggregation |

### 1.4 Wolf

| #    | Structure       | Players | Groups        | Notes                       |
| ---- | --------------- | ------- | ------------- | --------------------------- |
| 1.4a | Single round    | 4       | 1 group       | Standard wolf game          |
| 1.4b | Single round    | 8       | 2 groups of 4 | Two independent wolf games  |
| 1.4c | Tournament (2R) | 4       | 1 group       | Wolf across multiple rounds |

Wolf is always `within_group` and requires exactly 4 per group. Test partner selection (lone wolf vs pick partner) across various holes.

### 1.5 Six Point

| #    | Structure       | Players | Groups        | Notes                                    |
| ---- | --------------- | ------- | ------------- | ---------------------------------------- |
| 1.5a | Single round    | 3       | 1 group       | Standard 3-player game, stableford basis |
| 1.5b | Single round    | 3       | 1 group       | Gross scoring basis                      |
| 1.5c | Single round    | 6       | 2 groups of 3 | Two independent six-point games          |
| 1.5d | Tournament (2R) | 3       | 1 group       | Multi-round six-point                    |

Six Point is always `within_group` and requires exactly 3 per group.

### 1.6 Chair

| #    | Structure       | Players | Groups        | Notes                       |
| ---- | --------------- | ------- | ------------- | --------------------------- |
| 1.6a | Single round    | 4       | 1 group       | Standard chair game         |
| 1.6b | Single round    | 8       | 2 groups of 4 | Two independent chair games |
| 1.6c | Tournament (2R) | 4       | 1 group       | Multi-round chair           |

Chair is always `within_group` and requires exactly 4 per group.

---

## 2. Team Formats (Teams Enabled)

These scenarios have teams **enabled** with at least 2 teams.

### 2.1 Best Ball

| #    | Structure       | Players | Teams         | Groups        | Scope        | Notes                                      |
| ---- | --------------- | ------- | ------------- | ------------- | ------------ | ------------------------------------------ |
| 2.1a | Single round    | 4       | 2 teams (2+2) | 1 group of 4  | all          | Single match, explicit team pairing        |
| 2.1b | Single round    | 4       | 2 teams (2+2) | 1 group of 4  | within_group | Auto-derived pairing from group membership |
| 2.1c | Single round    | 8       | 2 teams (4+4) | 2 groups of 4 | within_group | Two independent 2v2 matches                |
| 2.1d | Single round    | 6       | 2 teams (3+3) | 1 group of 4  | within_group | 4 of 6 players in group; 2 sitting out     |
| 2.1e | Tournament (2R) | 4       | 2 teams (2+2) | 1 group of 4  | all          | Multi-round best ball aggregation          |

### 2.2 Hi-Lo

| #    | Structure       | Players | Teams         | Groups        | Notes                                |
| ---- | --------------- | ------- | ------------- | ------------- | ------------------------------------ |
| 2.2a | Single round    | 4       | 2 teams (2+2) | 1 group of 4  | Standard hi-lo: high ball + low ball |
| 2.2b | Single round    | 8       | 2 teams (4+4) | 2 groups of 4 | Two independent hi-lo matches        |
| 2.2c | Tournament (2R) | 4       | 2 teams (2+2) | 1 group of 4  | Multi-round hi-lo                    |

Hi-Lo is always `within_group`, requires exactly 2 teams with 2 players each per group.

### 2.3 Rumble

| #    | Structure       | Players | Teams         | Groups        | Notes                                          |
| ---- | --------------- | ------- | ------------- | ------------- | ---------------------------------------------- |
| 2.3a | Single round    | 8       | 2 teams (4+4) | 2 groups of 4 | Each group = 1 full team; team totals compared |
| 2.3b | Tournament (2R) | 8       | 2 teams (4+4) | 2 groups of 4 | Multi-round rumble                             |

Rumble is always `within_group`. Each group must be 4 players all from the same team. Groups across teams produce team totals.

---

## 3. Bonus Competitions (Layered On)

Bonus competitions are added **on top of** any other format. Test these in combination with scenarios above.

| #   | Bonus type    | Mode        | Points | Combine with         | Notes                                         |
| --- | ------------- | ----------- | ------ | -------------------- | --------------------------------------------- |
| 3.1 | nearest_pin   | standalone  | --     | Any stableford round | Winner gets badge only, no score effect       |
| 3.2 | nearest_pin   | contributor | 1      | Stableford (1.1a)    | +1 to winner's total on individual scoreboard |
| 3.3 | nearest_pin   | contributor | 2      | Stableford (1.1f)    | +2 per NTP; verify multi-round aggregation    |
| 3.4 | longest_drive | standalone  | --     | Any round            | Badge only                                    |
| 3.5 | longest_drive | contributor | 1      | Stroke play (1.2a)   | Verify bonus points affect scoreboard total   |
| 3.6 | Multiple NTP  | contributor | 1 each | 1.1c (6 players)     | Multiple bonus comps on different holes       |

---

## 4. Multi-Format Rounds (Stacking Competitions)

A single round can have **multiple competitions simultaneously**. These scenarios test combinations.

| #   | Structure    | Players | Teams | Groups        | Competitions stacked                          | Notes                                         |
| --- | ------------ | ------- | ----- | ------------- | --------------------------------------------- | --------------------------------------------- |
| 4.1 | Single round | 4       | No    | 1 group of 4  | Stableford + Chair                            | Individual scoring + group game               |
| 4.2 | Single round | 4       | No    | 1 group of 4  | Stableford + Wolf + NTP (contributor)         | Three comps, one with bonus                   |
| 4.3 | Single round | 4       | Yes   | 1 group of 4  | Stableford + Best Ball + NTP (standalone)     | Individual + team match + bonus               |
| 4.4 | Single round | 4       | Yes   | 1 group of 4  | Stroke Play (net) + Hi-Lo                     | Individual strokes + team game                |
| 4.5 | Single round | 3       | No    | 1 group of 3  | Stableford + Six Point                        | Individual + 3-player game                    |
| 4.6 | Single round | 4       | Yes   | 1 group of 4  | Best Ball + Match Play (singles) + Stableford | Team match + individual matches + leaderboard |
| 4.7 | Single round | 8       | Yes   | 2 groups of 4 | Stableford (all) + Wolf (within_group) + NTP  | Cross-group stableford + per-group wolf       |

---

## 5. Tournament Lifecycle Scenarios

These verify status transitions and round sequencing work correctly.

| #   | Structure       | Scenario                                                | Notes                                            |
| --- | --------------- | ------------------------------------------------------- | ------------------------------------------------ |
| 5.1 | Tournament (2R) | Lock tournament (setup -> scheduled)                    | All draft rounds become scheduled                |
| 5.2 | Tournament (2R) | Unlock tournament (scheduled -> setup)                  | All scheduled rounds revert to draft             |
| 5.3 | Tournament (2R) | Open R1, score, finalize R1, then open R2               | Sequential round progression                     |
| 5.4 | Tournament (2R) | Attempt to open R2 before R1 is finalized               | Should be blocked by sequential guard            |
| 5.5 | Tournament (2R) | Finalize R1, open R2, then reopen R1                    | Should be blocked (R2 is open)                   |
| 5.6 | Tournament (2R) | Finalize both rounds                                    | Tournament status should become `complete`       |
| 5.7 | Tournament (2R) | Reopen a finalized round for score corrections          | finalized -> open, tournament back to `underway` |
| 5.8 | Single round    | Full lifecycle: draft -> scheduled -> open -> finalized | Standalone round through all states              |

---

## 6. Player & Participant Edge Cases

| #    | Scenario                                                         | Structure       | Notes                                             |
| ---- | ---------------------------------------------------------------- | --------------- | ------------------------------------------------- |
| 6.1  | Add participant to tournament; verify auto-added to draft rounds | Tournament (2R) | Both rounds should get the participant            |
| 6.2  | Create new round; verify all tournament participants auto-added  | Tournament (2R) | New R2 should inherit all tournament participants |
| 6.3  | Player present in R1 but absent from R2                          | Tournament (2R) | Leaderboard should show `absent` for R2           |
| 6.4  | Player in R1 with incomplete scores (not all 18 holes)           | Tournament (2R) | Leaderboard should show `incomplete` for R1       |
| 6.5  | Guest player (non-registered) in a round                         | Single round    | Person without a user account                     |
| 6.6  | Marker (isMarker=true) in a group                                | Single round    | Marker can record scores for others               |
| 6.7  | Handicap override at tournament level                            | Tournament (1R) | Should cascade to round participant               |
| 6.8  | Handicap override at round level (overriding tournament)         | Tournament (1R) | Round override takes precedence                   |
| 6.9  | Player with handicap 0 (scratch golfer)                          | Single round    | No stroke index adjustments                       |
| 6.10 | Player with high handicap (e.g., 36+)                            | Single round    | Multiple strokes on some holes                    |
| 6.11 | Player with negative handicap (plus golfer, e.g., -2)            | Single round    | Negative stableford adjustments                   |

---

## 7. Group Configuration Edge Cases

| #   | Scenario                                             | Format     | Players | Groups         | Notes                                      |
| --- | ---------------------------------------------------- | ---------- | ------- | -------------- | ------------------------------------------ |
| 7.1 | Auto-assign groups with default size (4)             | Stableford | 8       | 2 groups of 4  | Even split                                 |
| 7.2 | Auto-assign groups with uneven count                 | Stableford | 7       | 2 groups (4+3) | One group has fewer                        |
| 7.3 | Auto-assign groups, group size = 3                   | Six Point  | 6       | 2 groups of 3  | Matching format requirement                |
| 7.4 | Auto-assign groups, group size = 2                   | Match Play | 4       | 2 groups of 2  | Minimal groups for match play              |
| 7.5 | Single group with 8 players, within_group stableford | Stableford | 8       | 1 group of 8   | Large single group                         |
| 7.6 | Player not assigned to any group                     | Wolf       | 5       | 1 group of 4   | 5th player unassigned; excluded from game? |
| 7.7 | Different group assignments between R1 and R2        | Stableford | 8       | Vary by round  | Groups are round-level, not persistent     |

---

## 8. Team Edge Cases

| #   | Scenario                          | Format    | Players | Teams           | Notes                                         |
| --- | --------------------------------- | --------- | ------- | --------------- | --------------------------------------------- |
| 8.1 | Uneven teams (3 vs 2)             | Best Ball | 5       | 2 teams (3+2)   | One team has more players                     |
| 8.2 | Player not on any team            | Best Ball | 5       | 2 teams (2+2)   | 5th player teamless; excluded from team comp  |
| 8.3 | Disable teams mid-setup           | --        | 4       | 2 teams         | Should delete teams AND all game-format comps |
| 8.4 | Re-enable teams after disabling   | Best Ball | 4       | 0 teams         | Teams must be recreated from scratch          |
| 8.5 | Move player from Team A to Team B | Best Ball | 4       | 2 teams (2+2)   | Auto-removes from old team                    |
| 8.6 | 3+ teams in a tournament          | Rumble    | 12      | 3 teams (4+4+4) | Three groups, one per team                    |

---

## 9. Scoring Edge Cases

| #    | Scenario                                            | Format     | Notes                                            |
| ---- | --------------------------------------------------- | ---------- | ------------------------------------------------ |
| 9.1  | All players tie on a hole (same stableford)         | Chair      | Chair holder retains; no change                  |
| 9.2  | All players tie on first hole (no chair holder yet) | Chair      | No point awarded; chair remains vacant           |
| 9.3  | All 3 players tie on a hole                         | Six Point  | 2/2/2 split                                      |
| 9.4  | Two players tie for 1st, one 3rd                    | Six Point  | 3/3/0 split                                      |
| 9.5  | Match decided early (e.g., 5&4)                     | Match Play | Remaining holes should not affect result         |
| 9.6  | Match all square after 18                           | Match Play | Halved match, each side gets pointsPerHalf       |
| 9.7  | Lone wolf wins                                      | Wolf       | Wolf gets 4 points, others get 0                 |
| 9.8  | Lone wolf loses                                     | Wolf       | Each opponent gets 2 points                      |
| 9.9  | Both teams score 0 stableford on a hole             | Best Ball  | Hole is halved (0 vs 0)                          |
| 9.10 | Only one team member has a score on a hole          | Best Ball  | That score counts as team's best ball            |
| 9.11 | Neither team member has a score on a hole           | Hi-Lo      | Hole skipped (all must have scores for hi-lo)    |
| 9.12 | Very high score on a hole (e.g., 12 on a par 3)     | Stableford | 0 stableford points; gross still recorded        |
| 9.13 | Hole-in-one on a par 3                              | Stableford | Eagle = 4 stableford points (+ handicap strokes) |
| 9.14 | Score submitted by commissioner vs player vs marker | Any        | recordedByRole should differ; all valid          |
| 9.15 | Score correction (overwrite via new score event)    | Any        | Latest event per (participant, hole) wins        |

---

## 10. Individual Scoreboard & Tournament Leaderboard

| #    | Scenario                                                         | Structure       | Notes                                  |
| ---- | ---------------------------------------------------------------- | --------------- | -------------------------------------- |
| 10.1 | Scoreboard shows gross, net, stableford for all players          | Single round    | Basic scoreboard with all columns      |
| 10.2 | Scoreboard with contributor bonus (NTP adds to total)            | Single round    | Bonus points reflected in Total column |
| 10.3 | Scoreboard with standalone bonus (badge only)                    | Single round    | Badge shown, no score effect           |
| 10.4 | Leaderboard aggregates across 2 finalized rounds                 | Tournament (2R) | Sum of stableford, gross as tiebreaker |
| 10.5 | Leaderboard with one round finalized, one pending                | Tournament (2R) | Pending round shows as `pending`       |
| 10.6 | Leaderboard with player absent from one round                    | Tournament (2R) | Absent round excluded (not zeroed)     |
| 10.7 | Leaderboard with player incomplete in one round                  | Tournament (2R) | Incomplete round excluded              |
| 10.8 | Primary scoring basis set to `net_strokes`                       | Tournament (1R) | Net strokes column highlighted         |
| 10.9 | Primary scoring basis set at round level (overriding tournament) | Tournament (1R) | Round-level override takes precedence  |

---

## 11. Tournament Standings (Multi-Round Aggregation)

| #    | Aggregation method | Format(s) per round      | Rounds | Notes                                |
| ---- | ------------------ | ------------------------ | ------ | ------------------------------------ |
| 11.1 | sum_stableford     | Stableford               | 2      | Total stableford across rounds       |
| 11.2 | sum_stableford     | Stableford + NTP contrib | 2      | Bonus points added after aggregation |
| 11.3 | lowest_strokes     | Stroke Play (net)        | 2      | Lowest net total across rounds       |
| 11.4 | lowest_strokes     | Stroke Play (gross)      | 2      | Lowest gross total across rounds     |
| 11.5 | match_wins         | Match Play               | 2      | Count wins/halves across rounds      |
| 11.6 | match_wins         | Best Ball (teams)        | 2      | Team match wins across rounds        |

---

## 12. Comprehensive End-to-End Scenarios

These are full workflow scenarios combining multiple dimensions for realistic smoke testing.

### 12.1 Casual Single Round (Simplest)

- **Structure**: Single round (standalone)
- **Players**: 4
- **Teams**: No
- **Groups**: 1 group
- **Competitions**: Stableford (all)
- **Workflow**: Create round -> open -> all 4 players score 18 holes -> finalize -> verify scoreboard

### 12.2 Casual Round with Side Games

- **Structure**: Single round (standalone)
- **Players**: 4
- **Teams**: No
- **Groups**: 1 group of 4
- **Competitions**: Stableford (all) + Wolf (within_group) + Chair (within_group) + NTP (contributor, hole 7)
- **Workflow**: Create round -> add all competitions -> open -> score all 18 -> handle wolf partner selections -> award NTP -> finalize -> verify all results

### 12.3 Weekend Fourball with Matches

- **Structure**: Single round (standalone)
- **Players**: 4
- **Teams**: Yes (2 teams of 2)
- **Groups**: 1 group of 4
- **Competitions**: Stableford (all) + Match Play (within_group, 1v2 3v4) + Best Ball (within_group) + NTP (standalone, hole 12) + LD (standalone, hole 5)
- **Workflow**: Create round -> enable teams -> assign teams -> add competitions -> open -> score -> award bonuses -> finalize

### 12.4 Club Day: 3 Groups, No Teams

- **Structure**: Single round (standalone)
- **Players**: 12
- **Teams**: No
- **Groups**: 3 groups of 4
- **Competitions**: Stableford (all) + Chair (within_group) + NTP (contributor, hole 3) + LD (contributor, hole 14)
- **Workflow**: Create -> assign groups -> add competitions -> open -> score all groups -> award bonuses -> finalize -> verify overall stableford ranking + per-group chair results

### 12.5 Two-Round Tournament: Individual Stableford

- **Structure**: Tournament with 2 rounds
- **Players**: 6
- **Teams**: No
- **Groups**: R1: 2 groups (3+3), R2: 2 groups (3+3, different composition)
- **Competitions per round**: Stableford (all)
- **Aggregation**: sum_stableford
- **Workflow**: Create tournament -> add 2 rounds (different courses) -> add participants -> lock -> open R1 -> score -> finalize R1 -> open R2 -> score (one player absent) -> finalize R2 -> verify tournament leaderboard

### 12.6 Two-Round Tournament: Team Best Ball

- **Structure**: Tournament with 2 rounds
- **Players**: 8
- **Teams**: Yes (2 teams of 4)
- **Groups**: 2 groups of 4 per round (2 from each team per group)
- **Competitions per round**: Stableford (all) + Best Ball (within_group) + NTP (contributor)
- **Aggregation**: match_wins (for best ball), sum_stableford (for individual)
- **Workflow**: Full tournament lifecycle with team-based results aggregated across rounds

### 12.7 Three-Player Six Point Round

- **Structure**: Single round (standalone)
- **Players**: 3
- **Teams**: No
- **Groups**: 1 group of 3
- **Competitions**: Stableford (all) + Six Point (within_group, stableford basis)
- **Workflow**: Create -> score -> verify 6-point distributions including tie scenarios

### 12.8 Irish Rumble Tournament

- **Structure**: Tournament with 2 rounds
- **Players**: 8
- **Teams**: Yes (2 teams of 4)
- **Groups**: 2 groups of 4 (each group = one full team)
- **Competitions per round**: Rumble (within_group) + Stableford (all)
- **Workflow**: Create tournament -> set up teams -> create groups (all same-team groups) -> score both rounds -> verify progressive counting (1/2/3/4) and team totals

### 12.9 Minimum Viable: 2-Player Stroke Play

- **Structure**: Single round (standalone)
- **Players**: 2
- **Teams**: No
- **Groups**: 1 group
- **Competitions**: Stroke Play (net) + Match Play (all, explicit pairing)
- **Workflow**: Create -> pair the 2 players -> score -> verify stroke totals and match result

### 12.10 Large Field: 8 Groups

- **Structure**: Single round (standalone)
- **Players**: 32
- **Teams**: No
- **Groups**: 8 groups of 4
- **Competitions**: Stableford (all) + Chair (within_group)
- **Workflow**: Create -> auto-assign groups -> score all groups -> verify overall ranking across 32 players + 8 independent chair games

---

## Scenario Checklist

Use this checklist to track smoke-testing progress.

| #      | Scenario                                      | Status |
| ------ | --------------------------------------------- | ------ |
| 1.1a   | Stableford, 2 players, single round           | [ ]    |
| 1.1b   | Stableford, 4 players, single group           | [ ]    |
| 1.1c   | Stableford, 6 players, 2 groups, all scope    | [ ]    |
| 1.1d   | Stableford, 6 players, 2 groups, within_group | [ ]    |
| 1.1e   | Stableford, tournament 1R                     | [ ]    |
| 1.1f   | Stableford, tournament 2R, aggregation        | [ ]    |
| 1.1g   | Stableford, tournament 2R, multi-group        | [ ]    |
| 1.2a   | Stroke Play, gross                            | [ ]    |
| 1.2b   | Stroke Play, net                              | [ ]    |
| 1.2c   | Stroke Play, within_group, net                | [ ]    |
| 1.2d   | Stroke Play, tournament 2R                    | [ ]    |
| 1.3a   | Match Play, 2 players                         | [ ]    |
| 1.3b   | Match Play, 4 players, within_group           | [ ]    |
| 1.3c   | Match Play, 6 players, cross-group pairings   | [ ]    |
| 1.3d   | Match Play, 8 players, within_group           | [ ]    |
| 1.3e   | Match Play, tournament 2R                     | [ ]    |
| 1.4a   | Wolf, 4 players                               | [ ]    |
| 1.4b   | Wolf, 8 players, 2 groups                     | [ ]    |
| 1.4c   | Wolf, tournament 2R                           | [ ]    |
| 1.5a   | Six Point, stableford basis                   | [ ]    |
| 1.5b   | Six Point, gross basis                        | [ ]    |
| 1.5c   | Six Point, 6 players, 2 groups                | [ ]    |
| 1.5d   | Six Point, tournament 2R                      | [ ]    |
| 1.6a   | Chair, 4 players                              | [ ]    |
| 1.6b   | Chair, 8 players, 2 groups                    | [ ]    |
| 1.6c   | Chair, tournament 2R                          | [ ]    |
| 2.1a   | Best Ball, all scope                          | [ ]    |
| 2.1b   | Best Ball, within_group                       | [ ]    |
| 2.1c   | Best Ball, 8 players, 2 groups                | [ ]    |
| 2.1d   | Best Ball, uneven teams                       | [ ]    |
| 2.1e   | Best Ball, tournament 2R                      | [ ]    |
| 2.2a   | Hi-Lo, 4 players                              | [ ]    |
| 2.2b   | Hi-Lo, 8 players, 2 groups                    | [ ]    |
| 2.2c   | Hi-Lo, tournament 2R                          | [ ]    |
| 2.3a   | Rumble, 8 players                             | [ ]    |
| 2.3b   | Rumble, tournament 2R                         | [ ]    |
| 3.1    | NTP standalone                                | [ ]    |
| 3.2    | NTP contributor, 1 point                      | [ ]    |
| 3.3    | NTP contributor, 2 points, multi-round        | [ ]    |
| 3.4    | LD standalone                                 | [ ]    |
| 3.5    | LD contributor                                | [ ]    |
| 3.6    | Multiple NTP on different holes               | [ ]    |
| 4.1    | Stableford + Chair                            | [ ]    |
| 4.2    | Stableford + Wolf + NTP                       | [ ]    |
| 4.3    | Stableford + Best Ball + NTP                  | [ ]    |
| 4.4    | Stroke Play + Hi-Lo                           | [ ]    |
| 4.5    | Stableford + Six Point                        | [ ]    |
| 4.6    | Best Ball + Match Play + Stableford           | [ ]    |
| 4.7    | Stableford (all) + Wolf (within_group) + NTP  | [ ]    |
| 5.1    | Lock tournament                               | [ ]    |
| 5.2    | Unlock tournament                             | [ ]    |
| 5.3    | Sequential round progression                  | [ ]    |
| 5.4    | Block opening R2 before R1 finalized          | [ ]    |
| 5.5    | Block reopening R1 while R2 open              | [ ]    |
| 5.6    | Complete tournament (both rounds finalized)   | [ ]    |
| 5.7    | Reopen finalized round                        | [ ]    |
| 5.8    | Single round full lifecycle                   | [ ]    |
| 6.1    | Auto-add participant to draft rounds          | [ ]    |
| 6.2    | New round inherits participants               | [ ]    |
| 6.3    | Player absent from R2                         | [ ]    |
| 6.4    | Player with incomplete scores                 | [ ]    |
| 6.5    | Guest player                                  | [ ]    |
| 6.6    | Marker in a group                             | [ ]    |
| 6.7    | Handicap override at tournament level         | [ ]    |
| 6.8    | Handicap override at round level              | [ ]    |
| 6.9    | Scratch golfer (handicap 0)                   | [ ]    |
| 6.10   | High handicap (36+)                           | [ ]    |
| 6.11   | Plus golfer (negative handicap)               | [ ]    |
| 7.1    | Auto-assign groups, even split                | [ ]    |
| 7.2    | Auto-assign groups, uneven count              | [ ]    |
| 7.3    | Auto-assign, group size 3                     | [ ]    |
| 7.4    | Auto-assign, group size 2                     | [ ]    |
| 7.5    | Large single group (8 players)                | [ ]    |
| 7.6    | Player not assigned to group                  | [ ]    |
| 7.7    | Different groups across rounds                | [ ]    |
| 8.1    | Uneven teams                                  | [ ]    |
| 8.2    | Teamless player with team comp                | [ ]    |
| 8.3    | Disable teams mid-setup                       | [ ]    |
| 8.4    | Re-enable teams                               | [ ]    |
| 8.5    | Move player between teams                     | [ ]    |
| 8.6    | 3+ teams                                      | [ ]    |
| 9.1-15 | Scoring edge cases                            | [ ]    |
| 10.1-9 | Scoreboard & leaderboard cases                | [ ]    |
| 11.1-6 | Tournament standings aggregation              | [ ]    |
| 12.1   | E2E: Casual single round                      | [ ]    |
| 12.2   | E2E: Round with side games                    | [ ]    |
| 12.3   | E2E: Weekend fourball with matches            | [ ]    |
| 12.4   | E2E: Club day, 3 groups                       | [ ]    |
| 12.5   | E2E: 2-round individual stableford tournament | [ ]    |
| 12.6   | E2E: 2-round team best ball tournament        | [ ]    |
| 12.7   | E2E: Three-player six point                   | [ ]    |
| 12.8   | E2E: Irish rumble tournament                  | [ ]    |
| 12.9   | E2E: 2-player stroke play                     | [ ]    |
| 12.10  | E2E: Large field, 32 players                  | [ ]    |
