import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })

async function run() {
  const filePath = resolve(process.argv[2] || 'supabase/setup.sql')
  console.log(`⚡ Running SQL from ${filePath}...`)

  const content = readFileSync(filePath, 'utf-8')

  // Parse statements respecting dollar-quoted blocks ($$...$$)
  const statements: string[] = []
  let current = ''
  let inDollarQuote = false

  for (const line of content.split('\n')) {
    const trimmed = line.trim()

    // Skip pure comment lines outside statements
    if (!current && trimmed.startsWith('--')) continue

    // Track dollar-quoting
    const dollarMatches = line.match(/\$\$/g)
    if (dollarMatches) {
      for (const _ of dollarMatches) {
        inDollarQuote = !inDollarQuote
      }
    }

    current += line + '\n'

    // Statement ends at `;` only when not inside a dollar-quoted block
    if (!inDollarQuote && trimmed.endsWith(';')) {
      const stmt = current.trim()
      if (stmt.length > 1) statements.push(stmt)
      current = ''
    }
  }

  // Catch any trailing statement without semicolon
  if (current.trim()) statements.push(current.trim())

  for (const statement of statements) {
    // Get first meaningful line for logging
    const firstLine = statement
      .split('\n')
      .find((l) => l.trim() && !l.trim().startsWith('--'))
    console.log(`  → ${firstLine?.trim().substring(0, 70)}...`)

    try {
      await sql.unsafe(statement)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      // Skip "already exists" errors for idempotency
      if (msg.includes('already exists')) {
        console.log(`    ⚠ Already exists, skipping`)
      } else {
        console.error(`    ✗ ${msg}`)
        throw err
      }
    }
  }

  console.log('\n✅ SQL executed successfully!')
  await sql.end()
  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Failed:', err.message)
  process.exit(1)
})
