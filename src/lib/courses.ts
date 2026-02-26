import { useMutation } from '@tanstack/react-query';
import {
  createCourseFn,
  updateCourseFn,
  deleteCourseFn,
} from '@/lib/courses.server';
import type { CreateCourseInput, UpdateCourseInput } from '@/lib/validators';
import type { MutationCallOptions, MutationHookReturn } from '@/lib/mutation';

// ──────────────────────────────────────────────
// useCreateCourse
// ──────────────────────────────────────────────

type CreateCourseVariables = CreateCourseInput;
type CreateCourseResult = { courseId: string };

export function useCreateCourse(): MutationHookReturn<
  CreateCourseVariables,
  CreateCourseResult
> {
  const mutation = useMutation({
    mutationFn: (variables: CreateCourseVariables) =>
      createCourseFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<CreateCourseVariables, CreateCourseResult>) => {
    try {
      const result = await mutation.mutateAsync(variables);
      await onSuccess?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return [
    mutate,
    {
      isPending: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    },
  ] as const;
}

// ──────────────────────────────────────────────
// useUpdateCourse
// ──────────────────────────────────────────────

type UpdateCourseVariables = UpdateCourseInput;
type UpdateCourseResult = { courseId: string };

export function useUpdateCourse(): MutationHookReturn<
  UpdateCourseVariables,
  UpdateCourseResult
> {
  const mutation = useMutation({
    mutationFn: (variables: UpdateCourseVariables) =>
      updateCourseFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<UpdateCourseVariables, UpdateCourseResult>) => {
    try {
      const result = await mutation.mutateAsync(variables);
      await onSuccess?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return [
    mutate,
    {
      isPending: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    },
  ] as const;
}

// ──────────────────────────────────────────────
// useDeleteCourse
// ──────────────────────────────────────────────

type DeleteCourseVariables = { courseId: string };
type DeleteCourseResult = { success: boolean };

export function useDeleteCourse(): MutationHookReturn<
  DeleteCourseVariables,
  DeleteCourseResult
> {
  const mutation = useMutation({
    mutationFn: (variables: DeleteCourseVariables) =>
      deleteCourseFn({ data: variables }),
  });

  const mutate = async ({
    variables,
    onSuccess,
    onError,
  }: MutationCallOptions<DeleteCourseVariables, DeleteCourseResult>) => {
    try {
      const result = await mutation.mutateAsync(variables);
      await onSuccess?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return [
    mutate,
    {
      isPending: mutation.isPending,
      isError: mutation.isError,
      error: mutation.error,
    },
  ] as const;
}
