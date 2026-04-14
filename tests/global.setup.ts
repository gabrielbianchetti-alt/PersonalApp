/**
 * Global setup: creates the test user (if not exists) via Supabase Admin API,
 * then logs in and saves the browser auth state for all other test suites.
 */
import { test as setup, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const AUTH_FILE = 'tests/.auth/user.json'
const TEST_EMAIL = 'teste@personalhub.com'
const TEST_PASS  = 'Teste123456'
const TEST_NAME  = 'Professor Teste'

setup('create test user and save auth state', async ({ page }) => {
  // ── Ensure .auth dir exists ───────────────────────────────────────────────
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  // ── Create test user via Supabase Admin API ───────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: existing } = await supabase.auth.admin.listUsers()
  const userExists = existing?.users?.some(u => u.email === TEST_EMAIL)

  if (!userExists) {
    const { error } = await supabase.auth.admin.createUser({
      email:          TEST_EMAIL,
      password:       TEST_PASS,
      email_confirm:  true,
      user_metadata:  { full_name: TEST_NAME },
    })
    if (error) console.warn('Could not create test user:', error.message)
    else console.log('✅ Test user created:', TEST_EMAIL)
  } else {
    console.log('ℹ️  Test user already exists:', TEST_EMAIL)
  }

  // ── Log in and capture session ────────────────────────────────────────────
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.locator('input[type="email"]').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASS)
  await page.locator('button[type="submit"]').click()

  await page.waitForURL('**/dashboard**', { timeout: 20_000 })
  expect(page.url()).toContain('/dashboard')

  // Save auth state so other tests can reuse it
  await page.context().storageState({ path: AUTH_FILE })
  console.log('✅ Auth state saved to', AUTH_FILE)
})
