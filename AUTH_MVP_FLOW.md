# MVP Auth Flow

This is the launch flow for new and returning users.

## Goals

- Users can always sign up and log in without getting stuck.
- New users always complete a minimal profile before entering the app.
- Invite flows preserve context from the shared link through auth and onboarding.

## Minimal Profile For MVP

Required:
- `name`
- `relationshipStatus`

Optional for MVP:
- `photo`

## Screen-by-Screen Flows

### 1. Normal Sign Up

1. User opens `/`
2. Taps `Sign Up`
3. Creates account on `/auth/register`
4. App routes to `/onboarding/welcome`
5. User completes name + relationship status
6. App routes to `/home`

### 2. Normal Log In

1. User opens `/`
2. Taps `Sign In`
3. Logs in on `/auth/login`
4. If profile is incomplete, app routes to `/onboarding/welcome`
5. If profile is complete, app routes to `/home`

### 3. Invite Sign Up

1. User opens backend invite link
2. User continues to web invite screen
3. User taps `Sign up to accept`
4. App opens `/auth/register?inviteUserId=<inviterId>`
5. After account creation, app routes to `/onboarding/welcome?inviteUserId=<inviterId>`
6. After onboarding, app routes to `/invite-accept?userId=<inviterId>`
7. User can accept the invite

### 4. Invite Log In

1. User opens backend invite link
2. User continues to web invite screen
3. User taps `Sign in to accept`
4. App opens `/auth/login?inviteUserId=<inviterId>`
5. If profile is incomplete, app routes to `/onboarding/welcome?inviteUserId=<inviterId>`
6. If profile is complete, app routes to `/invite-accept?userId=<inviterId>`
7. User can accept the invite

## Technical Rules

- Protected API calls must not start until the auth token is available.
- Stored sessions must restore both user identity and protected app data.
- Root route `/` should only decide between:
  - logged out -> landing page
  - logged in + incomplete profile -> onboarding
  - logged in + complete profile -> home

## MVP Test Checklist

- Sign up creates account and reaches onboarding
- Login reaches home for complete users
- Login reaches onboarding for incomplete users
- Invite sign up preserves inviter through onboarding
- Invite login preserves inviter through login
- Accept invite works after auth
