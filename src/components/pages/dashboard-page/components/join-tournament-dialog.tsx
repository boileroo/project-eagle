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
    .slice(0, 10); // max: 6-char word + 4-char suffix

  const matchedWord = GOLF_WORDS.find((word) => cleaned.startsWith(word));
  if (!matchedWord) {
    return cleaned;
  }

  // If the input is exactly a matched word or more, format with dash
  if (cleaned.length >= matchedWord.length) {
    const suffix = cleaned.slice(matchedWord.length);
    return `${matchedWord}-${suffix}`;
  }

  return cleaned;
}

interface JoinTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinTournamentDialog({
  open,
  onOpenChange,
}: JoinTournamentDialogProps) {
  const navigate = useNavigate();

  const form = useForm<JoinByCodeInput>({
    resolver: zodResolver(joinByCodeSchema),
    defaultValues: {
      code: '',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({ code: '' });
    }
  }, [open, form]);

  const handleSubmit = async (data: JoinByCodeInput) => {
    onOpenChange(false);
    toast.message('Choose how you want to join on the next screen.');
    await navigate({
      to: '/join/$code',
      params: { code: data.code },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="group bg-card hover:bg-background w-full rounded-lg border p-6 text-left transition-colors">
          <h3 className="mb-1 font-semibold">Join Tournament</h3>
          <p className="text-muted-foreground text-sm">
            Enter a code to join an existing tournament
          </p>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Tournament</DialogTitle>
          <DialogDescription>
            Enter the invite code shared by the tournament commissioner
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Continue</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
