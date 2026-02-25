import { useState } from 'react';
import { updateRoundFn } from '@/lib/rounds.server';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function EditRoundDialog({
  round,
  courses,
  onSaved,
}: {
  round: {
    id: string;
    courseId: string | null;
    date: string | Date | null;
    teeTime?: string | null;
  };
  courses: {
    id: string;
    name: string;
    location: string | null;
    numberOfHoles: number;
  }[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [courseId, setCourseId] = useState(round.courseId ?? '');
  const [date, setDate] = useState(() => {
    if (!round.date) return '';
    const d = new Date(round.date);
    return d.toISOString().split('T')[0];
  });
  const [teeTime, setTeeTime] = useState(
    (round as { teeTime?: string | null }).teeTime ?? '',
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateRoundFn({
        data: {
          id: round.id,
          courseId: courseId || undefined,
          date: date || undefined,
          teeTime: teeTime || undefined,
        },
      });
      toast.success('Round updated.');
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update round',
      );
    }
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setCourseId(round.courseId ?? '');
      setDate(() => {
        if (!round.date) return '';
        const d = new Date(round.date);
        return d.toISOString().split('T')[0];
      });
      setTeeTime((round as { teeTime?: string | null }).teeTime ?? '');
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Round</DialogTitle>
          <DialogDescription>
            Change the course, date, or tee time for this round.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-round-course">Course</Label>
            <Select
              id="edit-round-course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="" disabled>
                Select a course
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.numberOfHoles}h)
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-round-date">Date</Label>
              <Input
                id="edit-round-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-round-tee-time">Tee Time</Label>
              <Input
                id="edit-round-tee-time"
                type="time"
                value={teeTime}
                onChange={(e) => setTeeTime(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !courseId}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
