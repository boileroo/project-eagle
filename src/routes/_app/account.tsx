import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getMyAccountFn, updateMyAccountFn } from '@/lib/persons.server';
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
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_app/account')({
  loader: async () => {
    const account = await getMyAccountFn();
    return { account };
  },
  component: AccountPage,
});

function AccountPage() {
  const { account } = Route.useLoaderData();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);
    try {
      await updateMyAccountFn({ data });
      toast.success('Account updated!');
      navigate({ to: '/account' });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update account',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground">
          Manage your player profile and settings.
        </p>
      </div>

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

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
