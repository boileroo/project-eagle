import 'dotenv/config'
import { db } from './index'
import { courses, courseHoles } from './schema'

async function seed() {
  console.log('🌱 Seeding database...')

  // ── Sample course: Royal Melbourne West ─────
  const [royalMelbourne] = await db
    .insert(courses)
    .values({
      name: 'Royal Melbourne (West)',
      location: 'Black Rock, VIC',
      numberOfHoles: 18,
    })
    .returning()

  console.log(`  ✓ Course: ${royalMelbourne.name} (${royalMelbourne.id})`)

  // Holes: par, stroke index, yardage (from whites)
  const holesData: { holeNumber: number; par: number; strokeIndex: number; yardage: number }[] = [
    { holeNumber: 1, par: 4, strokeIndex: 7, yardage: 395 },
    { holeNumber: 2, par: 5, strokeIndex: 15, yardage: 480 },
    { holeNumber: 3, par: 4, strokeIndex: 1, yardage: 333 },
    { holeNumber: 4, par: 4, strokeIndex: 11, yardage: 375 },
    { holeNumber: 5, par: 3, strokeIndex: 5, yardage: 176 },
    { holeNumber: 6, par: 4, strokeIndex: 3, yardage: 428 },
    { holeNumber: 7, par: 3, strokeIndex: 17, yardage: 148 },
    { holeNumber: 8, par: 4, strokeIndex: 9, yardage: 305 },
    { holeNumber: 9, par: 4, strokeIndex: 13, yardage: 380 },
    { holeNumber: 10, par: 4, strokeIndex: 8, yardage: 420 },
    { holeNumber: 11, par: 4, strokeIndex: 2, yardage: 395 },
    { holeNumber: 12, par: 5, strokeIndex: 14, yardage: 475 },
    { holeNumber: 13, par: 4, strokeIndex: 10, yardage: 354 },
    { holeNumber: 14, par: 3, strokeIndex: 16, yardage: 175 },
    { holeNumber: 15, par: 4, strokeIndex: 6, yardage: 383 },
    { holeNumber: 16, par: 3, strokeIndex: 18, yardage: 145 },
    { holeNumber: 17, par: 4, strokeIndex: 4, yardage: 410 },
    { holeNumber: 18, par: 4, strokeIndex: 12, yardage: 378 },
  ]

  await db.insert(courseHoles).values(
    holesData.map((h) => ({
      courseId: royalMelbourne.id,
      ...h,
    })),
  )

  console.log(`  ✓ ${holesData.length} holes inserted`)

  // ── Sample course: St Andrews (Old Course) ──
  const [stAndrews] = await db
    .insert(courses)
    .values({
      name: 'St Andrews (Old Course)',
      location: 'St Andrews, Scotland',
      numberOfHoles: 18,
    })
    .returning()

  console.log(`  ✓ Course: ${stAndrews.name} (${stAndrews.id})`)

  const stAndrewsHoles: { holeNumber: number; par: number; strokeIndex: number; yardage: number }[] = [
    { holeNumber: 1, par: 4, strokeIndex: 10, yardage: 376 },
    { holeNumber: 2, par: 4, strokeIndex: 14, yardage: 453 },
    { holeNumber: 3, par: 4, strokeIndex: 6, yardage: 397 },
    { holeNumber: 4, par: 4, strokeIndex: 8, yardage: 480 },
    { holeNumber: 5, par: 5, strokeIndex: 12, yardage: 570 },
    { holeNumber: 6, par: 4, strokeIndex: 2, yardage: 412 },
    { holeNumber: 7, par: 4, strokeIndex: 16, yardage: 371 },
    { holeNumber: 8, par: 3, strokeIndex: 18, yardage: 175 },
    { holeNumber: 9, par: 4, strokeIndex: 4, yardage: 352 },
    { holeNumber: 10, par: 4, strokeIndex: 9, yardage: 386 },
    { holeNumber: 11, par: 3, strokeIndex: 15, yardage: 174 },
    { holeNumber: 12, par: 4, strokeIndex: 3, yardage: 348 },
    { holeNumber: 13, par: 4, strokeIndex: 5, yardage: 465 },
    { holeNumber: 14, par: 5, strokeIndex: 1, yardage: 618 },
    { holeNumber: 15, par: 4, strokeIndex: 11, yardage: 456 },
    { holeNumber: 16, par: 4, strokeIndex: 13, yardage: 423 },
    { holeNumber: 17, par: 4, strokeIndex: 7, yardage: 455 },
    { holeNumber: 18, par: 4, strokeIndex: 17, yardage: 357 },
  ]

  await db.insert(courseHoles).values(
    stAndrewsHoles.map((h) => ({
      courseId: stAndrews.id,
      ...h,
    })),
  )

  console.log(`  ✓ ${stAndrewsHoles.length} holes inserted`)

  console.log('\n✅ Seeding complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err)
  process.exit(1)
})
