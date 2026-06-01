import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
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
      <div className="text-center">
        <Heading level={2}>Tournament Details</Heading>
        <Text size="sm" color="muted" className="mt-1">
          Give your tournament a name and an optional description.
        </Text>
      </div>

      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
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

          <div className="flex flex-col gap-3 pt-2">
            <Button type="submit" size="lg" className="w-full">
              Next
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={onBack}
            >
              Back
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
