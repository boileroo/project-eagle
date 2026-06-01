import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { joinByCodeSchema, type JoinByCodeInput } from '@/lib/validators';
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
import { toast } from 'sonner';

const GOLF_WORDS = [
  'ACE',
  'BIRDIE',
  'BOGEY',
  'BUNKER',
  'CHIP',
  'EAGLE',
  'GREEN',
  'HOOK',
  'IRON',
  'LINKS',
  'LOFT',
  'PARS',
  'PITCH',
  'PUTT',
  'ROUGH',
  'SCORE',
  'SLICE',
  'SWING',
  'TEE',
  'WEDGE',
  'WOOD',
];

function formatInviteCodeInput(value: string) {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10);

  const matchedWord = GOLF_WORDS.find((word) => cleaned.startsWith(word));
  if (!matchedWord) {
    return cleaned;
  }

  if (cleaned.length >= matchedWord.length) {
    const suffix = cleaned.slice(matchedWord.length);
    return `${matchedWord}-${suffix}`;
  }

  return cleaned;
}

interface JoinTournamentFormProps {
  open: boolean;
  onComplete: () => void;
}

export function JoinTournamentForm({
  open,
  onComplete,
}: JoinTournamentFormProps) {
  const navigate = useNavigate();

  const form = useForm<JoinByCodeInput>({
    resolver: zodResolver(joinByCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ code: '' });
    }
  }, [open, form]);

  const handleSubmit = async (data: JoinByCodeInput) => {
    onComplete();
    toast.message('Choose how you want to join on the next screen.');
    await navigate({
      to: '/join/$code',
      params: { code: data.code },
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-6"
      >
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Invite Code</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. BIRDIE-12b7"
                  {...field}
                  onChange={(e) =>
                    field.onChange(formatInviteCodeInput(e.target.value))
                  }
                  onKeyDown={(e) => {
                    const { value, selectionStart, selectionEnd } =
                      e.currentTarget;

                    if (
                      e.key === 'Backspace' &&
                      value.endsWith('-') &&
                      selectionStart === value.length &&
                      selectionEnd === value.length
                    ) {
                      e.preventDefault();
                      field.onChange(value.slice(0, -2));
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="lg">
          Continue
        </Button>
      </form>
    </Form>
  );
}
