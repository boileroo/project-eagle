import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CourseData } from '@/types';

interface CourseScorecardProps {
  holes: CourseData['holes'];
}

export function CourseScorecard({ holes }: CourseScorecardProps) {
  const sortedHoles = [...(holes ?? [])].sort(
    (a, b) => a.holeNumber - b.holeNumber,
  );
  const totalPar = sortedHoles.reduce((sum, h) => sum + h.par, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Scorecard</span>
          <span className="text-muted-foreground text-sm font-normal">
            Par {totalPar}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedHoles.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hole data available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Hole</TableHead>
                  <TableHead className="w-16">Par</TableHead>
                  <TableHead className="w-16">SI</TableHead>
                  <TableHead className="w-20">Yards</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoles.map((hole) => (
                  <TableRow key={hole.id}>
                    <TableCell className="font-medium">
                      {hole.holeNumber}
                    </TableCell>
                    <TableCell>{hole.par}</TableCell>
                    <TableCell>{hole.strokeIndex}</TableCell>
                    <TableCell>
                      {hole.yardage != null ? hole.yardage : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
