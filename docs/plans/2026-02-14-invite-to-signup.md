# Phase 5: Invite-to-Signup Flow (Growth Loop)

## Overview

When a host sends an email invite, the recipient should be able to sign up and seamlessly join the party with an auto-created friendship with the inviter.

## Flow

```
Host → InviteModal (email tab) → POST /api/emails/invite (with auth)
  → Creates invite_token row (inviter_id, invitee_email, party_code)
  → Sends email with link: /join/CODE?inviter=USER_ID

Recipient clicks link:
  If authenticated → /join/CODE?inviter=USER_ID → joins → claims invite → auto-friendship
  If not authenticated → middleware redirects to /login?redirect=/join/CODE?inviter=USER_ID
    → User clicks "Sign up" → /signup?redirect=/join/CODE?inviter=USER_ID
    → Signs up → email confirmation → /auth/callback → redirects to /join/CODE?inviter=USER_ID
    → Joins party → claims invite → auto-friendship
```

## Tasks

1. **Migration 023**: invite_tokens table + RLS
2. **Modify email invite API**: Add auth, create invite_token row
3. **Modify email template**: Include inviter param in join URL
4. **Modify InviteModal**: Send auth token with email invite
5. **Redirect chain**: Login passes redirect to signup link, signup stores + passes to emailRedirectTo, auth callback reads redirect
6. **Create claim API**: `/api/invites/claim` — match email, auto-create mutual friendship
7. **Modify join pages**: After join success, call claim API if inviter param present
8. **Wire up Add-as-friend in PartyRoomClient**: Fetch friendship statuses, pass to MembersList
9. **E2E tests**
