import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCourseSchema, type CreateCourseInput } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CourseFormProps {
  defaultValues?: CreateCourseInput
  onSubmit: (data: CreateCourseInput) => Promise<void>
  submitLabel: string
  submitting: boolean
}

function generateDefaultHoles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    holeNumber: i + 1,
    par: 4,
    strokeIndex: i + 1,
    yardage: null as number | null,
  }))
}

export function CourseForm({
  defaultValues,
  onSubmit,
  submitLabel,
  submitting,
}: CourseFormProps) {
  const form = useForm<CreateCourseInput>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: defaultValues ?? {
      name: '',
      location: '',
      numberOfHoles: 18,
      holes: generateDefaultHoles(18),
    },
  })

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'holes',
  })

  const numberOfHoles = form.watch('numberOfHoles')

  const handleHoleCountChange = (value: 9 | 18) => {
    form.setValue('numberOfHoles', value)
    // Only regenerate if current holes don't match
    const currentHoles = form.getValues('holes')
    if (currentHoles.length !== value) {
      replace(generateDefaultHoles(value))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Course info */}
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Royal Melbourne" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Melbourne, Australia"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <FormLabel>Number of Holes</FormLabel>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  variant={numberOfHoles === 9 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleHoleCountChange(9)}
                >
                  9 holes
                </Button>
                <Button
                  type="button"
                  variant={numberOfHoles === 18 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleHoleCountChange(18)}
                >
                  18 holes
                </Button>
              </div>
              {form.formState.errors.numberOfHoles && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.numberOfHoles.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Holes table */}
        <Card>
          <CardHeader>
            <CardTitle>Hole Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Hole</TableHead>
                  <TableHead className="w-24">Par</TableHead>
                  <TableHead className="w-24">SI</TableHead>
                  <TableHead className="w-28">Yards</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={3}
                        max={6}
                        className="h-8 w-16"
                        {...form.register(`holes.${index}.par`, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={18}
                        className="h-8 w-16"
                        {...form.register(`holes.${index}.strokeIndex`, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={50}
                        max={700}
                        className="h-8 w-20"
                        placeholder="—"
                        {...form.register(`holes.${index}.yardage`, {
                          setValueAs: (v: string) =>
                            v === '' ? null : Number(v),
                        })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {form.formState.errors.holes && (
              <p className="text-sm text-destructive mt-2">
                Please check hole data for errors
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
