import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateMyAccount } from '@/lib/persons';
import { updateAccountSchema, type UpdateAccountInput } from '@/lib/validators';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ThemeSelector } from './theme-selector';
import { type AccountData } from '@/types';

export function AccountForm({ account }: { account: AccountData }) {
  const navigate = useNavigate();
  const [updateMyAccount, { isPending }] = useUpdateMyAccount();

  const form = useForm<UpdateAccountInput>({
    resolver: zodResolver(updateAccountSchema),
    defaultValues: {
      displayName: account.profile.displayName ?? '',
      currentHandicap: account.person?.currentHandicap
        ? Number(account.person.currentHandicap)
        : null,
    },
  });

  const handleSubmit = async (data: UpdateAccountInput) => {
    await updateMyAccount({
      variables: data,
      onSuccess: () => {
        toast.success('Account updated!');
        navigate({ to: '/account' });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Account Info
          <Badge variant="secondary">{account.profile.email}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. John Smith" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your name as it appears in tournaments and leaderboards.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="currentHandicap"
              render={() => (
                <FormItem>
                  <FormLabel>Handicap</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min={-10}
                      max={54}
                      placeholder="e.g. 18.4"
                      className="w-32"
                      {...form.register('currentHandicap', {
                        setValueAs: (v) =>
                          v === '' || v == null ? null : Number(v),
                      })}
                    />
                  </FormControl>
                  <FormDescription>
                    Your current playing handicap. Used as the default when
                    joining tournaments.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <ThemeSelector />

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
