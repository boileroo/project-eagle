export function LeaderboardEmptyState({
  kind,
  isCommissioner,
}: {
  kind: 'no-finalised-rounds' | 'no-complete-scores';
  isCommissioner: boolean;
}) {
  if (kind === 'no-finalised-rounds') {
    return (
      <>
        <p className="text-muted-foreground text-sm">
          Leaderboard results appear once at least one round is finalised.
        </p>
        {isCommissioner && (
          <p className="text-muted-foreground mt-2 text-sm">
            Individual totals only count completed scorecards from finalised
            rounds. Team and game outcomes will sit alongside the overall
            leaderboard once those rounds are locked in.
          </p>
        )}
      </>
    );
  }

  return (
    <p className="text-muted-foreground text-sm">
      Finalised rounds exist, but nobody has a fully completed round to count
      yet.
    </p>
  );
}
