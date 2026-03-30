import { useState } from 'react';
import { Link, useRouter } from '@tanstack/react-router';
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
import { signUpSchema, type SignUpInput } from '@/lib/validators';
import { useSignUp, useSignInWithOAuth } from '@/lib/auth';
import { Heading } from '@/components/ui/heading';
import { AerieTextLogo } from '@/components/ui/aerie-text-logo';
import { ValidationError } from '@/components/ui/validation-error';
import { Text } from '@/components/ui/text';

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
    <div className="flex flex-col items-center">
      <AerieTextLogo className="text-tokyo-red" />

      <Heading level={1} className="text-tokyo-red mt-6 text-center">
        Join the club
        <span className="text-primary dark:text-foreground">.</span>
      </Heading>

      <Card className="mt-10 w-full max-w-100">
        <CardContent className="space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <ValidationError message={error} />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
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
                    <FormLabel>Password</FormLabel>
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
                    <FormLabel>Confirm password</FormLabel>
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
                size="xl"
                className="w-full"
                disabled={isPending}
              >
                {isPending ? 'Creating account...' : 'Sign up'}
              </Button>
            </form>
          </Form>

          <div className="flex items-center gap-4 text-xs">
            <span className="border-border/60 flex-1 border-t" />
            <Text variant="label" asChild>
              <span>Or continue with</span>
            </Text>
            <span className="border-border/60 flex-1 border-t" />
          </div>

          <ContinueWithGoogleButton
            onClick={handleGoogleSignUp}
            isLoading={oauthPending}
          />
        </CardContent>
      </Card>

      <CardFooter className="mt-8 justify-center px-0">
        <Text variant="small">
          Already a member?{' '}
          <Link
            to="/login"
            search={{ next: undefined }}
            className="text-success font-semibold"
          >
            Come on in
          </Link>
        </Text>
      </CardFooter>
    </div>
  );
}
