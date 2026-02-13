import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createCourseFn } from '@/lib/courses.server'
import { CourseForm } from '@/components/course-form'
import { type CreateCourseInput } from '@/lib/validators'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/_app/courses/new')({
  component: NewCoursePage,
})

function NewCoursePage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (data: CreateCourseInput) => {
    setSubmitting(true)
    try {
      const result = await createCourseFn({ data })
      toast.success('Course created!')
      navigate({ to: '/courses/$courseId', params: { courseId: result.courseId } })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create course',
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Course</h1>
        <p className="text-muted-foreground">
          Add a new course to the library.
        </p>
      </div>
      <CourseForm
        onSubmit={handleSubmit}
        submitLabel="Create Course"
        submitting={submitting}
      />
    </div>
  )
}
