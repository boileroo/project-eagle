import { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
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
import { signUpSchema, type SignUpInput } from '@/lib/validators';
import { useSignUp, useSignInWithOAuth } from '@/lib/auth';
import { ValidationError } from '@/components/ui/validation-error';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';

export function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [signUp, { isPending }] = useSignUp();
  const [signInWithOAuth, { isPending: oauthPending }] = useSignInWithOAuth();

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
    },
  });

  async function onSubmit(values: SignUpInput) {
    setError(null);
    await signUp({
      variables: {
        email: values.email,
        password: values.password,
        displayName: values.displayName,
      },
      onSuccess: async () => {
        await router.navigate({ to: '/', reloadDocument: true });
      },
      onError: (err) => {
        setError(err.message);
      },
    });
  }

  async function handleGoogleSignUp() {
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
          <Heading level={1}>Create an account</Heading>
          <Text size="sm" color="muted" className="mt-1">
            Join and start tracking your game
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
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Tiger Woods"
                        autoComplete="name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Email address</FormLabel>
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
                    <FormLabel required>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Confirm password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
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
                {isPending ? 'Creating account…' : 'Create account'}
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
            onClick={handleGoogleSignUp}
            isLoading={oauthPending}
          />
        </div>
      </div>

      <Text size="sm" color="muted" className="pb-2 text-center">
        Already have an account?{' '}
        <Link to="/login" search={{ next: undefined }}>
          Sign in
        </Link>
      </Text>
    </div>
  );
}
