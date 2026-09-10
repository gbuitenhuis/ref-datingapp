#!/usr/bin/env node

const APP_URL = process.env.APP_URL || 'https://ref-demo-three.vercel.app';
const INVITE_USER_ID = process.env.INVITE_USER_ID || 'test';
const API_URL =
  process.env.API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://ref-backend.vercel.app';
const LOGIN_EMAIL = process.env.E2E_EMAIL || '';
const LOGIN_PASSWORD = process.env.E2E_PASSWORD || '';

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod.chromium;
  } catch {
    console.error('Playwright is not installed. Run: npm i -D playwright');
    process.exit(1);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const chromium = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const inviteUrl = `${API_URL}/invite?userId=${encodeURIComponent(INVITE_USER_ID)}&web=${encodeURIComponent(APP_URL)}`;

  const checks = [];
  let inviteProfileExists = false;

  try {
    try {
      const profileResponse = await fetch(
        `${API_URL}/profiles/${encodeURIComponent(INVITE_USER_ID)}`,
      );
      inviteProfileExists = profileResponse.ok;
    } catch {
      inviteProfileExists = false;
    }

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const homeStatus = page.url();
    assert(!homeStatus.includes('404'), `Home page opened with invalid route: ${homeStatus}`);
    checks.push('home route opens');

      await page.goto(inviteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(800);

      const bodyText = await page.locator('body').innerText();

    if (inviteProfileExists) {
      assert(
        /you're invited!|join ref/i.test(bodyText),
        'Invite landing page did not render expected invite content',
      );
      checks.push('invite landing page is visible');

      const continueLink = page.getByRole('link', { name: /continue on web/i });
      assert(await continueLink.isVisible(), 'Continue on Web link missing on invite landing page');
      checks.push('invite landing actions shown');

      await continueLink.click();
      await page.waitForURL(
        new RegExp(`/invite-accept\\?userId=${encodeURIComponent(INVITE_USER_ID)}`),
        { timeout: 10000 },
      );
      const inviteAcceptUrl = page.url();
      assert(
        inviteAcceptUrl.includes('/invite-accept') &&
          inviteAcceptUrl.includes(`userId=${encodeURIComponent(INVITE_USER_ID)}`),
        `Continue on Web did not preserve invite user id: ${inviteAcceptUrl}`,
      );
      checks.push('web continuation keeps inviter id');

      const signInButton = page.getByText(/sign in to accept/i);
      const signUpButton = page.getByText(/sign up to accept/i);
      await signInButton.waitFor({ state: 'visible', timeout: 10000 });
      await signUpButton.waitFor({ state: 'visible', timeout: 10000 });
      assert(await signInButton.isVisible(), 'Sign in button missing on web invite page');
      assert(await signUpButton.isVisible(), 'Sign up button missing on web invite page');
      checks.push('web invite actions shown for signed-out user');

      await signInButton.click();
      await page.waitForTimeout(700);
      const loginUrl = page.url();
      assert(loginUrl.includes('/auth/login'), `Did not redirect to login screen: ${loginUrl}`);
      assert(
        loginUrl.includes(`inviteUserId=${encodeURIComponent(INVITE_USER_ID)}`),
        'inviteUserId query param missing on login redirect',
      );
      checks.push('invite login redirect keeps inviteUserId');

      if (LOGIN_EMAIL && LOGIN_PASSWORD) {
        await page.getByPlaceholder('your.email@example.com').fill(LOGIN_EMAIL);
        await page.getByPlaceholder('Enter your password').fill(LOGIN_PASSWORD);
        await page.getByText(/^sign in$/i).last().click();
        await page.waitForURL(
          new RegExp(`/invite-accept\\?userId=${encodeURIComponent(INVITE_USER_ID)}`),
          { timeout: 15000 },
        );
        const postLoginUrl = page.url();
        assert(
          postLoginUrl.includes('/invite-accept') &&
            postLoginUrl.includes(`userId=${encodeURIComponent(INVITE_USER_ID)}`),
          `After login, expected invite accept redirect. Got: ${postLoginUrl}`,
        );
        checks.push('post-login returns to invite accept');
      }
    } else {
      assert(
        !/404: NOT_FOUND|Code: NOT_FOUND/i.test(bodyText),
        'Invite route returned a hard 404 page',
      );
      assert(
        /invalid invite link|user not found|loading invite|sign in|sign up|invited you/i.test(
          bodyText,
        ),
        'Invite route did not render expected app state for unknown inviter id',
      );
      checks.push('invalid inviter id handled gracefully');
    }

    console.log('PASS');
    checks.forEach((item, index) => console.log(`${index + 1}. ${item}`));
    console.log(`Checked URL: ${inviteUrl}`);
    if (!inviteProfileExists) {
      console.log(
        `Note: inviter profile '${INVITE_USER_ID}' does not exist on ${API_URL}; ran invalid-link scenario.`,
      );
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error('FAIL:', error.message);
  process.exit(1);
});
