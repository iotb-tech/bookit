# BookIt

BookIt is a full-stack learning-session scheduling platform developed by our team to simplify mentor office hours, one-to-one learning sessions, and Study Group coordination.

The platform allows mentees to discover mentors and Study Groups, view real availability, request sessions, manage bookings, request reschedules, receive notifications, and participate in group-learning sessions without relying on repeated direct messages.

Mentors have a dedicated portal for managing availability, booking requests, Study Groups, recurring schedules, attendance, cancellations, and reschedule requests.

---

## The Problem

Mentor office hours and Study Group sessions were commonly coordinated through direct messages and informal conversations.

During our validation exercise, we asked fellows how they normally know whether a mentor or Study Group partner is available.

Some of the responses we received were:

> "I dont know,i just message"

> "When he replies and also we must have established an agreement about when am available"

> "I don’t"

> "I will reach out to them upfront to know when they will be free"

These responses showed that scheduling depended heavily on manually contacting another person and waiting for confirmation.

We also identified cases where a user selected a time only to discover that the same period had already been scheduled with another Study Group.

Our questionnaire showed a **71% occurrence of scheduling conflicts where participants discovered that a selected time had already been scheduled with another Study Group.**

BookIt was created to reduce this back-and-forth by allowing users to see real available slots before requesting a session and by protecting against conflicting bookings at the database level.

---

## Questionnaire Data

Our questionnaire focused on how fellows currently schedule learning sessions, determine availability, experience scheduling conflicts, and whether they would use a dedicated booking platform.

### Role and Frequency of Scheduled Meetings

![Role and frequency of scheduled meetings](./images/mform1.jpg)


### Availability of Mentor or Peer

![Availability of mentor or peer](./images/mform2.jpg)



### Missed or Conflicting Slots

![Missed or conflicting slots](./images/mform3.jpg)


### Interest in a Dedicated Booking Tool

![People who would like a dedicated tool for booking](./images/mform4.jpg)


The questionnaire results informed the core BookIt workflow:

```text
Discover Resource
        ↓
View Availability
        ↓
Choose Available Time
        ↓
Send Booking Request
        ↓
Mentor Confirms
        ↓
Manage Session
```

---

## What BookIt Solves

BookIt provides a structured alternative to arranging sessions entirely through chat.

The application helps users:

- see when a mentor is actually available;
- request a specific session without repeated scheduling messages;
- prevent conflicting one-to-one bookings;
- keep pending and confirmed sessions in one place;
- request another session time when plans change;
- receive booking and cancellation updates;
- participate in shared Study Group sessions;
- manage Study Group capacity and waitlists;
- keep mentor and mentee workflows separate but connected.

---

# Core Features

## Authentication

BookIt uses Supabase Authentication.

Supported authentication methods include:

- Email and password
- Google OAuth
- GitHub OAuth
- Protected authenticated routes
- Role-aware routing
- Application session expiry
- Global sign-out

Users enter BookIt through the same authentication system, while their account role determines whether they use the mentee experience or mentor portal.

---

## Mentee Experience

A mentee can:

- create an account;
- log in with email/password, Google, or GitHub;
- browse available mentors and Study Groups;
- search and filter resources;
- view mentor availability;
- choose an available date and time;
- send a booking request;
- see pending mentor confirmation;
- view confirmed sessions;
- view previous and cancelled sessions;
- cancel an eligible booking;
- request a reschedule;
- join Study Groups;
- leave Study Groups;
- join a Study Group waitlist when capacity is full;
- view recurring Study Group schedules;
- view upcoming Study Group sessions;
- receive notifications;
- filter notifications by All, Unread, and Read;
- mark notifications as read;
- clear delivered notifications;
- manage account and reminder settings;
- use Light, Dark, or System theme.

---

## Mentor Experience

Mentors use a dedicated mentor portal.

A mentor can:

- manage their mentor profile;
- create availability;
- create multiple future availability slots;
- clear open availability;
- preserve already-booked sessions when clearing availability;
- review pending booking requests;
- confirm booking requests;
- cancel sessions;
- provide a required cancellation reason;
- review reschedule requests;
- approve or decline proposed reschedules;
- create Study Groups;
- manage Study Group members;
- configure recurring Study Group days and times;
- generate future Study Group sessions;
- schedule one-off Study Group sessions;
- cancel Study Group sessions with a reason;
- manage Study Group capacity;
- manage Study Group waitlists;
- record attendance;
- receive booking and Study Group notifications;
- switch to the mentee view when needed.

---

# Booking Workflow

One-to-one bookings use real mentor availability.

The workflow is:

```text
Mentee
   ↓
Select Mentor
   ↓
Select Available Day
   ↓
Select Available Time
   ↓
Send Booking Request
   ↓
Pending Mentor Confirmation
   ↓
Mentor Reviews Request
   ↓
Confirm or Cancel
```

A selected slot is reserved while the booking request is pending.

This prevents another user from taking the same active time while the mentor is reviewing the request.

The database remains the final authority for booking conflicts.

---

## Booking Confirmation

New one-to-one booking requests are created as **pending** rather than being immediately confirmed.

The mentor can:

```text
Pending Request
      ↓
Confirm
      ↓
Confirmed Session
```

or:

```text
Pending Request
      ↓
Cancel
      ↓
Cancellation Reason
```

After confirmation, the booking becomes an active confirmed session.

The mentee receives a notification when the mentor responds.

---

# Rescheduling

Mentees can request another available time for an active booking.

The workflow is:

```text
Existing Booking
      ↓
Choose Another Available Slot
      ↓
Send Reschedule Request
      ↓
Proposed Slot Reserved
      ↓
Mentor Reviews Request
      ↓
Approve or Decline
```

If the mentor approves the request:

- the booking moves to the proposed slot;
- the original slot is released;
- the mentee receives a notification.

If the mentor declines the request:

- the original booking remains unchanged;
- the proposed slot is released;
- the mentee receives the mentor's decision.

---

# Cancellation

Both mentors and mentees can cancel eligible bookings.

## Mentor Cancellation

A mentor must provide a reason when cancelling a booking.

The cancellation reason is stored with the booking and is shown to the mentee through BookIt.

## Mentee Cancellation

A mentee can cancel an eligible pending or confirmed booking.

The mentor receives a cancellation notification.

Booking and availability updates are handled by the BookIt database workflow.

---

# Study Groups

Study Groups use a membership model rather than one booking per member.

A member joining a Study Group does not consume the group session for other members.

Study Group functionality includes:

- group membership;
- capacity limits;
- waitlists;
- recurring schedules;
- one-off sessions;
- generated future sessions;
- member management;
- session cancellation;
- cancellation reasons;
- notifications;
- attendance.

---

## Recurring Study Group Schedule

Mentors can configure regular Study Group meeting times using:

- weekday;
- start time;
- end time;
- multiple recurring schedule rows.

Future sessions can then be generated from the saved recurring schedule.

BookIt also checks for scheduling conflicts with the mentor's other active sessions.

---

## Study Group Waitlist

When a Study Group reaches capacity, a user can join its waitlist.

The flow is:

```text
Study Group Full
      ↓
Join Waitlist
      ↓
Capacity Becomes Available
      ↓
Eligible Waiting Member Promoted
      ↓
Notification Sent
```

---

## Attendance

Mentors can record attendance for eligible Study Group sessions.

Supported attendance statuses are:

- Present
- Absent
- Excused

Attendance remains associated with the correct Study Group session and member.

---

# Notifications

BookIt contains an in-app notification centre for mentors and mentees.

Notifications are used for events such as:

- new booking requests;
- booking confirmations;
- mentor cancellations;
- cancellation reasons;
- mentee cancellations;
- reschedule requests;
- reschedule approvals;
- reschedule declines;
- Study Group sessions;
- Study Group cancellations;
- waitlist promotion;
- session reminders.

Users can filter notifications using:

```text
All
Unread
Read
```

Users can also:

- mark all notifications as read;
- clear delivered notifications;
- see unread notification counts in the navigation.

---

# Settings

BookIt includes account and application preferences.

Users can manage:

- Light theme
- Dark theme
- System theme
- Booking update preferences
- Study Group update preferences
- Reminder preferences
- Reminder lead time
- Password
- Global sign-out

---

# Technology Stack

BookIt is built with:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase Authentication
- Supabase PostgreSQL
- TanStack Query
- React Hook Form
- Zod
- Lucide React
- Git
- GitHub
- Vercel

---

# Architecture

The application follows a layered structure:

```text
Page
  ↓
Component
  ↓
Hook / Server Action / Application Logic
  ↓
Supabase Client / RPC
  ↓
PostgreSQL
```

Main project directories:

```text
src/
  app/
  components/
  hooks/
  lib/
  providers/
  schemas/
  types/

supabase/
  schema.sql
  seed.sql
  migrations/

images/
  mform1.jpg
  mform2.jpg
  mform3.jpg
  mform4.jpg
```

---

# Getting Started

Clone the repository:

```bash
git clone https://github.com/NetsGit/BOOKIT.git
```

Move into the project:

```bash
cd BOOKIT
```

Install dependencies:

```bash
npm install
```

Create:

```text
.env.local
```

using the team's Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Do not commit `.env.local`.

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# Database Setup

BookIt uses Supabase PostgreSQL.

## Fresh Database

For a completely new Supabase project, use:

```text
supabase/schema.sql
```

as the current schema reference.

## Existing Database

Existing BookIt databases should be upgraded using the migration files in:

```text
supabase/migrations/
```

Migrations should be applied in chronological order.

Do not repeatedly run:

```text
supabase/schema.sql
```

against an existing live BookIt database.

`schema.sql` is maintained as a reference for creating a fresh database.

---

# Google and GitHub OAuth

BookIt uses the Supabase OAuth flow for Google and GitHub authentication.

For each provider:

1. Enable the provider under Supabase Authentication.
2. Add the provider client ID and secret.
3. Configure the allowed redirect URLs.
4. Add the local application URL:

```text
http://localhost:3000/**
```

5. Add the deployed BookIt callback URL:

```text
https://<your-vercel-domain>/auth/callback
```

OAuth returns through:

```text
src/app/auth/callback/route.ts
```

The callback exchanges the authentication code for a Supabase session and routes the authenticated user to the appropriate BookIt experience.

---

# Quality Checks

Before major changes are merged, we run:

```bash
npm run typecheck
npm run lint
npm run build
```

The current project has successfully passed:

```text
TypeScript check     PASS
ESLint               PASS
Production build     PASS
```

---

# Regression Testing

Our testing covers the main cross-role workflows.

## Authentication

- Signup
- Login
- Logout
- Google OAuth
- GitHub OAuth
- Protected route handling
- Role-aware navigation
- Session expiry

## Booking

- Availability loading
- Day selection
- Time selection
- Booking request
- Pending state
- Mentor confirmation
- Conflict rejection
- Cancellation
- Cancellation reason
- Rescheduling
- Reschedule approval
- Reschedule decline

## Study Groups

- Join
- Leave
- Capacity
- Waitlist
- Promotion
- Recurring schedule
- Session generation
- Cancellation
- Attendance

## Notifications

- New notification
- Unread count
- All filter
- Unread filter
- Read filter
- Mark all as read
- Clear all

## Interface

- Desktop layout
- Mobile layout
- Light mode
- Dark mode
- Mentee navigation
- Mentor navigation

---

# Deployment

BookIt is deployed with Vercel.

Git-connected deployments allow our team to test changes through Preview deployments before updating the production application.

The normal deployment workflow is:

```text
Feature Branch
      ↓
Vercel Preview Deployment
      ↓
Test
      ↓
Merge into Main
      ↓
Production Deployment
```

This allows a new version of BookIt to be built and tested without intentionally taking the existing production application offline.

---

# Team Development

BookIt is maintained as a shared team project.

Our workflow separates feature development from the main production branch so changes can be tested before they are merged.

Before merging major changes, we run:

```bash
npm run typecheck
npm run lint
npm run build
```

Shared changes involving authentication, database migrations, types, dependencies, or common components are reviewed carefully because they affect multiple areas of the application.

---

# Team Contributions

Add the actual Group 4 member names and responsibilities below.

Do not list responsibilities that were not completed by the named member.

### Member 1 — Name

- Responsibility
- Features implemented
- Integration work
- Testing responsibilities

### Member 2 — Name

- Responsibility
- Features implemented
- Integration work
- Testing responsibilities

### Member 3 — Name

- Responsibility
- Features implemented
- Integration work
- Testing responsibilities

### Member 4 — Name

- Responsibility
- Features implemented
- Integration work
- Testing responsibilities

### Member 5 — Name

- Responsibility
- Features implemented
- Integration work
- Testing responsibilities

### Member 6 — Name

- Responsibility
- Features implemented
- Integration work
- Testing responsibilities

---

# Project Goal

Our goal with BookIt is to replace an informal scheduling process such as:

```text
Message mentor
      ↓
Wait for response
      ↓
Suggest time
      ↓
Discover conflict
      ↓
Suggest another time
```

with:

```text
See real availability
      ↓
Choose a slot
      ↓
Send request
      ↓
Mentor confirms
      ↓
Manage the session in BookIt
```

BookIt gives mentors, mentees, and Study Group members one structured place to coordinate learning sessions.