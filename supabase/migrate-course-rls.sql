-- Drop old course policies
drop policy if exists "Course creator can update" on public.courses;
drop policy if exists "Authenticated users can manage course holes" on public.course_holes;
drop policy if exists "Authenticated users can update course holes" on public.course_holes;

-- Recreate with ownership checks
create policy "Course creator can update"
  on public.courses for update
  to authenticated
  using (created_by_user_id = auth.uid())
  with check (created_by_user_id = auth.uid());

create policy "Course creator can delete"
  on public.courses for delete
  to authenticated
  using (created_by_user_id = auth.uid());

create policy "Course owner can insert holes"
  on public.course_holes for insert
  to authenticated
  with check (
    exists (
      select 1 from public.courses
      where id = course_id and created_by_user_id = auth.uid()
    )
  );

create policy "Course owner can update holes"
  on public.course_holes for update
  to authenticated
  using (
    exists (
      select 1 from public.courses
      where id = course_id and created_by_user_id = auth.uid()
    )
  );

create policy "Course owner can delete holes"
  on public.course_holes for delete
  to authenticated
  using (
    exists (
      select 1 from public.courses
      where id = course_id and created_by_user_id = auth.uid()
    )
  );
