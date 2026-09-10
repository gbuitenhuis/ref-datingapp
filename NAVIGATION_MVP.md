# MVP Navigation

## Primary Navigation

These screens are the main app destinations and should always be easy to reach:

- `Home`
- `Friends`
- `Inbox`

They are connected by the shared bottom tab bar.

## Role Of Each Screen

- `Home`: app hub, confirmations, summary, next actions
- `Friends`: network and friend relationships
- `Inbox`: requests, suggestions, and updates

## Secondary Screens

These are task screens, not hubs:

- `Invite`
- `Invite Accept`
- `Discover`
- `Push`
- `Pull`
- `Matches`
- `Friend Detail`

Secondary screens should either:
- return to a primary screen after a task, or
- include the shared primary navigation if they are likely to be revisited often

## Invite Flow

1. Open invite
2. Sign in or sign up
3. Complete onboarding if needed
4. Accept invite
5. Land on `Home` with confirmation
6. Use CTA to open `Friends`

## Product Principle

After an important action, send the user to the hub first if they need orientation.
Send them to a detail screen only if inspecting the result is clearly the next job.
