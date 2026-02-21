// ──────────────────────────────────────────────
// GroupSelector — native select for switching playing group
// Only visible to commissioners and markers, or when >1 group exists
// ──────────────────────────────────────────────

type Group = {
  id: string;
  groupNumber: number;
  name: string | null;
};

type GroupSelectorProps = {
  groups: Group[];
  selectedGroupId: string;
  onChange: (groupId: string) => void;
};

export function GroupSelector({
  groups,
  selectedGroupId,
  onChange,
}: GroupSelectorProps) {
  if (groups.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="group-select"
        className="text-muted-foreground text-sm font-medium"
      >
        Group
      </label>
      <select
        id="group-select"
        className="border-input bg-background rounded-md border px-3 py-1.5 text-sm"
        value={selectedGroupId}
        onChange={(e) => onChange(e.target.value)}
      >
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name ?? `Group ${g.groupNumber}`}
          </option>
        ))}
      </select>
    </div>
  );
}
