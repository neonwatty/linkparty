# Remember Party - Development Status

**Date:** January 25, 2026

## Overview

**Remember Party** is a collaborative task/reminder queue app for couples to save and organize things together. Supports web (PWA) and iOS native via Capacitor.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Real-time)
- **Mobile:** Capacitor for iOS

## Completed Features

### Core Functionality
- Multi-user shared queues with 6-character party codes
- Real-time synchronization via Supabase subscriptions
- Drag-and-drop queue reordering
- Item statuses: pending, showing, shown

### Content Types
- YouTube videos (title, channel, duration, thumbnails)
- Tweets (author, content, timestamp)
- Reddit posts (subreddit, title, upvotes)
- Notes/Reminders with due dates

### Authentication
- Google OAuth sign-in
- Email/password authentication with sign-up
- Password reset functionality
- Emoji avatar system (15 party-themed avatars)

### Platform Support
- PWA with service worker and manifest
- iOS native app via Capacitor
- Push notification infrastructure
- TV mode for presentations

## Recent Commits

1. `567aa20` - Email/password authentication
2. `29492ab` - TV mode exit button visibility fix
3. `ab46801` - Sign in link visibility on iOS WebView
4. `47b2b12` - Due date indicator for reminders
5. `c34b4ae` - iOS workflow testing documentation

## Project Structure

```
src/
├── App.tsx              # Main UI component
├── contexts/AuthContext.tsx  # Auth state
├── hooks/useParty.ts    # Party/queue logic
├── lib/
│   ├── supabase.ts      # DB client & utilities
│   ├── auth.ts          # Authentication functions
│   ├── validation.ts    # Input validation
│   └── notifications.ts # Push notification setup
ios/                     # Native iOS project
workflows/               # QA test procedures
```

## Current State

**Phase:** Production-ready core with active feature development

- Authentication fully implemented (Google + Email/Password)
- Real-time queue sync working
- iOS app functional
- Testing infrastructure in place (Vitest)
- Deployed on Vercel

## Next Steps (Suggested)

- Android support via Capacitor
- Enhanced push notification triggers
- Offline support improvements
- Additional content type integrations
