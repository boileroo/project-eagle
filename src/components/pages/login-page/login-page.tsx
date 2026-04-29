import { useState } from 'react';
import { Link, useRouter, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ContinueWithGoogleButton } from '@/components/shared/oauth-button/continue-with-google-button';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { useSignIn, useSignInWithOAuth } from '@/lib/auth';
import { Heading } from '@/components/ui/heading';
import { AerieTextLogo } from '@/components/ui/aerie-text-logo';
import { ValidationError } from '@/components/ui/validation-error';
import { Text } from '@/components/ui/text';

export function LoginPage() {
  const router = useRouter();
  const search = useSearch({ from: '/_auth/login' });
  const [error, setError] = useState<string | null>(null);
  const [signIn, { isPending }] = useSignIn();
  const [signInWithOAuth, { isPending: oauthPending }] = useSignInWithOAuth();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginInput) {
    setError(null);
    await signIn({
      variables: values,
      onSuccess: async () => {
        await router.navigate({
          to: search.next || '/',
          reloadDocument: true,
        });
      },
      onError: (err) => {
        setError(err.message);
      },
    });
  }

  async function handleGoogleSignIn() {
    setError(null);
    await signInWithOAuth({
      variables: { provider: 'google' },
      onError: (err) => {
        setError(err.message);
      },
    });
  }

  return (
    <div className="flex flex-col items-center">
      <AerieTextLogo className="text-tokyo-red" />

      <Heading level={1} className="text-tokyo-red mt-6 text-center">
        Welcome back<span className="text-primary dark:text-foreground">.</span>
      </Heading>

      <Card className="mt-10 w-full max-w-100">
        <CardContent className="space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <ValidationError message={error} />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@domain.com"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        to="/login"
                        search={{ next: undefined }}
                        className="label-caps text-foreground/90 hover:text-foreground text-xs"
                      >
                        Forgotten?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                size="xl"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>

          <div className="flex items-center gap-4 text-xs">
            <span className="border-border/60 flex-1 border-t" />
            <Text size="xs" className="label-caps" asChild>
              <span>Or continue with</span>
            </Text>
            <span className="border-border/60 flex-1 border-t" />
          </div>

          <ContinueWithGoogleButton
            onClick={handleGoogleSignIn}
            isLoading={oauthPending}
          />
        </CardContent>
      </Card>

      <CardFooter className="mt-8 justify-center px-0">
        <Text size="sm">
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="text-tokyo-green hover:text-tokyo-green/90 font-semibold"
          >
            Join the club.
          </Link>
        </Text>
      </CardFooter>
    </div>
  );
}
