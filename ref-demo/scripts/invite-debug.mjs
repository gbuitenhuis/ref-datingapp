#!/usr/bin/env node

const { chromium } = await import('playwright');

const APP_URL = process.env.APP_URL || 'https://ref-demo-three.vercel.app';
const API_URL =
  process.env.API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://ref-backend.vercel.app';
const INVITE_USER_ID = process.env.INVITE_USER_ID;
const LOGIN_EMAIL = process.env.E2E_EMAIL || '';
const LOGIN_PASSWORD = process.env.E2E_PASSWORD || '';

if (!INVITE_USER_ID) {
  console.error('Missing INVITE_USER_ID');
  process.exit(1);
}

const inviteUrl = `${API_URL}/invite?userId=${encodeURIComponent(INVITE_USER_ID)}&web=${encodeURIComponent(APP_URL)}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleMessages = [];
const pageErrors = [];

page.on('console', (message) => {
  consoleMessages.push(`${message.type()}: ${message.text()}`);
});

page.on('pageerror', (error) => {
  pageErrors.push(String(error));
});

try {
  await page.goto(inviteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);

  const continueLink = page.getByRole('link', { name: /continue on web/i });
  if (await continueLink.isVisible()) {
    await continueLink.click();
    await page.waitForTimeout(1500);
  }

  if (LOGIN_EMAIL && LOGIN_PASSWORD) {
    await page.getByText(/sign in to accept/i).click();
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('your.email@example.com').fill(LOGIN_EMAIL);
    await page.getByPlaceholder('Enter your password').fill(LOGIN_PASSWORD);
    await page.getByText(/^sign in$/i).last().click();
    await page.waitForTimeout(2500);
  }

  const url = page.url();
  const body = await page.locator('body').innerText();

  console.log(JSON.stringify({ url, body, consoleMessages, pageErrors }, null, 2));
} finally {
  await browser.close();
}
