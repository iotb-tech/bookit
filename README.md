# BookIt

BookIt is a mentor and Study Group scheduling platform developed by Group 4.

The application provides one place for mentees to discover mentors and Study Groups, view availability, request sessions and manage their learning schedule. Mentors can manage availability, booking requests and Study Groups through a dedicated mentor portal.

## Problem

Mentor and peer-learning sessions are often coordinated through direct messages and group chats.

This creates several problems:

- users cannot easily see when a mentor is available;
- scheduling requires repeated messages;
- conflicting bookings can occur;
- mentors have to track sessions manually;
- users do not have one place to manage upcoming and previous sessions.

BookIt provides a shared scheduling workflow for mentors, mentees and Study Groups.

## Problem Validation

This section must contain only the actual findings collected by Group 4 during the project's user-validation exercise.

The final submission should include:

- number of participants;
- who was interviewed or surveyed;
- recurring scheduling problems identified;
- how those findings affected the features implemented in BookIt.

No assumed or generated survey findings should be added here.

## Users

BookIt currently supports two application roles:

### Mentee

A mentee can:

- create an account;
- log in with email/password, Google or GitHub;
- browse available mentors and Study Groups;
- view mentor availability;
- request a one-to-one session;
- view pending, confirmed, past and cancelled bookings;
- request a reschedule;
- cancel a session;
- join or leave a Study Group;
- join a Study Group waitlist when capacity is full;
- view Study Group schedules;
- receive booking and Study Group notifications;
- manage account and notification preferences.

### Mentor

A mentor can:

- access the mentor portal;
- manage open availability;
- clear future open availability without deleting booked sessions;
- review new booking requests;
- confirm or cancel one-to-one sessions;
- provide a cancellation reason;
- approve or decline reschedule requests;
- create and manage Study Groups;
- manage Study Group members;
- create recurring Study Group schedules;
- generate Study Group sessions;
- cancel Study Group sessions with a reason;
- record attendance;
- manage their profile;
- use the mentee view when required.

## Authentication

BookIt uses Supabase Authentication.

Supported sign-in methods are:

- email and password;
- Google OAuth;
- GitHub OAuth.

All new users are created as mentees unless their role is changed to mentor through the application's role-management process.

BookIt also applies a 24-hour application session policy.

Protected routes require an authenticated user.

## Booking Workflow

The one-to-one booking workflow is:

```text
Mentee
→ Resource
→ Available Day
→ Available Time
→ Booking Request
→ Pending Mentor Confirmation
→ Mentor Confirms
→ Confirmed Session