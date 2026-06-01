import { useState } from 'react';
import { useRouter, useSearch } from '@tanstack/react-router';
import { Link } from '@/components/ui/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { ContinueWithGoogleButton } from '@/components/shared/oauth-button/continue-with-google-button';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { useSignIn, useSignInWithOAuth } from '@/lib/auth';
import { ValidationError } from '@/components/ui/validation-error';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';

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
    <div className="flex min-h-screen flex-col justify-between p-6">
      <div className="flex flex-col gap-8">
        <div className="mt-8 text-center">
          <Heading level={1}>Welcome back</Heading>
          <Text size="sm" color="muted" className="mt-1">
            Sign in to your account
          </Text>
        </div>

        <div className="flex flex-col gap-5">
          <ValidationError message={error} />

          <Form {...form}>
            <form
              noValidate
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
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
                        variant="subtle"
                        className="text-xs"
                      >
                        Forgot password?
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
                size="lg"
                className="mt-2 w-full"
                disabled={isPending}
              >
                {isPending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Form>

          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <Text size="xs" color="muted" asChild>
              <span>or continue with</span>
            </Text>
            <span className="bg-border h-px flex-1" />
          </div>

          <ContinueWithGoogleButton
            onClick={handleGoogleSignIn}
            isLoading={oauthPending}
          />
        </div>
      </div>

      <Text size="sm" color="muted" className="pb-2 text-center">
        Don&apos;t have an account? <Link to="/signup">Create one</Link>
      </Text>
    </div>
  );
}
