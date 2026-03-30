import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const detailsSchema = z.object({
  tournamentName: z.string().min(1, 'Name is required').max(150),
  description: z.string().max(1000).optional(),
});
type DetailsFormData = z.infer<typeof detailsSchema>;

interface TournamentDetailsStepProps {
  tournamentName: string;
  description: string;
  onChange: (values: { tournamentName: string; description: string }) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TournamentDetailsStep({
  tournamentName,
  description,
  onChange,
  onNext,
  onBack,
}: TournamentDetailsStepProps) {
  const form = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      tournamentName,
      description,
    },
  });

  const handleSubmit = (data: DetailsFormData) => {
    onChange({
      tournamentName: data.tournamentName,
      description: data.description ?? '',
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Tournament Details</h2>
        <p className="text-muted-foreground text-sm">
          Give your tournament a name and an optional description.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="tournamentName"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Tournament Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Sunday Cup 2026" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Annual weekend tournament at Royal Melbourne"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            <Button type="submit">Next</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
