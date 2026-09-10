#!/usr/bin/env node

const APP_URL = process.env.APP_URL || 'https://ref-demo-three.vercel.app';
const API_URL =
  process.env.API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://ref-backend.vercel.app';
const INVITER_ID = process.env.INVITER_ID || '';
const INVITER_NAME = process.env.INVITER_NAME || 'Emma';

if (!INVITER_ID) {
  console.error('Missing INVITER_ID');
  process.exit(1);
}

const timestamp = Date.now();
const email = `mvp-auth-${timestamp}@example.com`;
const password = 'MvpCheck123';
const name = 'MVP Check';

async function loadPlaywright() {
  const mod = await import('playwright');
  return mod.chromium;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loginViaApi() {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  assert(response.ok, `Post-onboarding login failed with ${response.status}`);
  return response.json();
}

async function loadFriends(userId) {
  const response = await fetch(`${API_URL}/friends/${encodeURIComponent(userId)}`);
  assert(response.ok, `Friends lookup failed with ${response.status}`);
  return response.json();
}

async function run() {
  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const checks = [];

  try {
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByText(/^sign up$/i).click();
    checks.push('landing page routes to signup');

    await page.getByPlaceholder('your.email@example.com').fill(email);
    await page.getByPlaceholder('At least 6 characters').fill(password);
    await page.getByText(/^create account$/i).last().click();

    await page.getByText(/welcome to ref/i).waitFor({ state: 'visible', timeout: 15000 });
    checks.push('signup reaches onboarding');

    await page.getByText(/^get started$/i).click();
    await page.getByPlaceholder('Your first name').fill(name);
    await page.getByText(/^continue$/i).click();
    await page.getByText(/i'm single/i).click();
    await page.getByText(/^continue$/i).click();
    await page.getByText(/^get started$/i).last().click();

    await page.waitForURL(/\/home$/, { timeout: 15000 });
    await page.getByText(/hello,\s*mvp check/i).waitFor({ state: 'visible', timeout: 15000 });
    checks.push('onboarding completes and lands on home');

    const loginResult = await loginViaApi();
    assert(
      loginResult.user?.name === name && loginResult.user?.relationshipStatus === 'single',
      `Profile persistence mismatch: ${JSON.stringify(loginResult.user)}`,
    );
    checks.push('onboarding data persisted to backend profile');

    await page.goto(`${APP_URL}/invite-accept?userId=${encodeURIComponent(INVITER_ID)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.getByText(/^accept invite$/i).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText(/^accept invite$/i).click();

    await page.waitForURL(/\/home\?connected=/, { timeout: 15000 });
    await page.getByText(new RegExp(`friends with ${INVITER_NAME}`, 'i')).waitFor({
      state: 'visible',
      timeout: 15000,
    });
    checks.push('accept invite routes to home with confirmation');

    await page.getByText(/view friends/i).click();
    await page.waitForURL(/\/friends\?connected=/, { timeout: 15000 });
    checks.push('home banner links to friends');

    const friendsResult = await loadFriends(loginResult.user.id);
    const friendNames = (friendsResult.items ?? []).map((item) => item.name);
    assert(
      friendNames.includes(INVITER_NAME),
      `Inviter not found in friend list: ${JSON.stringify(friendNames)}`,
    );
    checks.push('invite acceptance creates friendship');

    console.log('PASS');
    console.log(JSON.stringify({ email, userId: loginResult.user.id, checks }, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('FAIL:', error.message);
  process.exit(1);
});
