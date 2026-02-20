import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { createRoundFn } from '@/lib/rounds.server';
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

export function AddRoundDialog({
  tournamentId,
  courses,
  onAdded,
}: {
  tournamentId: string;
  courses: {
    id: string;
    name: string;
    location: string | null;
    numberOfHoles: number;
  }[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState('');
  const [date, setDate] = useState('');
  const [teeTime, setTeeTime] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!courseId) {
      toast.error('Please select a course');
      return;
    }
    setAdding(true);
    try {
      await createRoundFn({
        data: {
          tournamentId,
          courseId,
          date: date || undefined,
          teeTime: teeTime || undefined,
        },
      });
      toast.success('Round created! All tournament players have been added.');
      setOpen(false);
      setCourseId('');
      setDate('');
      setTeeTime('');
      onAdded();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create round',
      );
    }
    setAdding(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setCourseId('');
          setDate('');
          setTeeTime('');
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Add Round</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Round</DialogTitle>
          <DialogDescription>
            Select a course and optionally set a date and tee time. All current
            tournament players will be automatically added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="courseSelect">Course</Label>
            <Select
              id="courseSelect"
              className="h-9 py-1"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.numberOfHoles} holes)
                  {c.location ? ` — ${c.location}` : ''}
                </option>
              ))}
            </Select>
            {courses.length === 0 && (
              <p className="text-muted-foreground mt-1 text-xs">
                No courses yet.{' '}
                <Link to="/courses/new" className="text-primary underline">
                  Create one first
                </Link>
                .
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="roundDate">Date (optional)</Label>
              <Input
                id="roundDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="roundTeeTime">Tee Time (optional)</Label>
              <Input
                id="roundTeeTime"
                type="time"
                value={teeTime}
                onChange={(e) => setTeeTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleAdd} disabled={adding || !courseId}>
            {adding ? 'Creating…' : 'Create Round'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
