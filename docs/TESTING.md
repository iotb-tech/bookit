# BookIt Cross-Role Testing Checklist

Use this checklist after running `supabase/migrations/20260901_mentor_portal.sql` on the shared Supabase project.

## Test accounts

Prepare at least three accounts:

- **Mentee A** - `profiles.role = 'mentee'`
- **Mentee B** - `profiles.role = 'mentee'`
- **Mentor A** - `profiles.role = 'mentor'` and owns one `resources` row of type `mentor`

Optional security test:

- **Mentor B** - a second mentor who owns a different mentor resource

## 1. Mentee authentication

- [ ] Mentee can select **Mentee Login** and sign in with email/password.
- [ ] Mentee lands on `/dashboard`.
- [ ] Mentee can use Google/GitHub OAuth in Mentee mode.
- [ ] Mentee cannot open `/mentor/dashboard`, `/mentor/sessions`, `/mentor/availability`, or `/mentor/profile`.
- [ ] Direct mentor-route access redirects the mentee to their normal dashboard.

## 2. Mentor authentication

- [ ] Mentor can select **Mentor Login** and sign in with email/password.
- [ ] Mentor lands on `/mentor/dashboard`.
- [ ] Mentor OAuth returns to `/mentor/dashboard` when Mentor Login was selected.
- [ ] Mentor can click **Switch to Mentee View** and use the normal BookIt dashboard/resources flow.
- [ ] Mentor can return to mentor mode by opening `/login?mode=mentor` or a mentor route while authenticated.

## 3. Role escalation protection

- [ ] A mentee who selects Mentor Login is rejected with a clear message.
- [ ] The rejected user can choose **Switch to Mentee Login**.
- [ ] Selecting Mentor Login does **not** change `profiles.role`.
- [ ] A normal authenticated user cannot update their own `profiles.role` from `mentee` to `mentor`.
- [ ] Mentor role is assigned only by an authorised SQL/admin action.

## 4. Mentor profile

- [ ] Mentor can edit name, headline, bio, skills, session duration, timezone, and meeting link.
- [ ] If a mentor has no owned mentor resource, saving the mentor profile creates one.
- [ ] The resource `owner_id` equals the mentor's auth user ID.
- [ ] Updated public mentor information appears on `/resources/[id]` for mentees.
- [ ] Meeting link is not displayed publicly on the resource browse/detail page.

## 5. Pause/resume bookings

- [ ] Mentor can pause new bookings.
- [ ] Pausing changes the mentor resource to `unavailable`.
- [ ] Existing confirmed bookings remain intact.
- [ ] Mentee can still view the mentor but cannot create a new booking while paused.
- [ ] Mentor can resume bookings and new availability becomes bookable again.

## 6. Single availability slot

- [ ] Mentor can add one future date/start/end time.
- [ ] Past availability is rejected.
- [ ] End time before/equal to start time is rejected.
- [ ] A new slot cannot overlap an existing availability slot.
- [ ] The new slot appears on the mentor Availability page.
- [ ] The same slot appears to mentees on the mentor Resource Details page.

## 7. Preferred weekly availability

- [ ] Mentor can choose weekdays.
- [ ] Mentor can choose a daily start/end window.
- [ ] Mentor can choose session duration and break duration.
- [ ] Mentor can choose how many weeks to generate.
- [ ] Generate Schedule creates the expected future slots.
- [ ] Generating a replacement schedule removes/replaces future **unbooked** slots only.
- [ ] Existing booked slots are preserved.

## 8. Mentee booking from mentor availability

- [ ] Mentee opens the mentor resource.
- [ ] Day selector only contains dates with available slots.
- [ ] Time selector only contains open slots for the selected date.
- [ ] Continue to Booking passes the exact `slot` ID in the URL.
- [ ] Booking confirmation shows the exact selected date and time.
- [ ] Send Booking Request creates exactly one pending booking and reserves the selected slot.
- [ ] The booked availability slot changes from `available` to `booked`.
- [ ] The booked slot disappears from the mentee's available time selector.

## 9. Double-booking protection

- [ ] Mentee A books a slot successfully.
- [ ] Mentee B cannot book the same availability slot.
- [ ] Two simultaneous requests for the same slot result in at most one active pending/confirmed booking.
- [ ] Back-to-back non-overlapping sessions remain possible.

## 10. Mentor Sessions / who booked me

- [ ] Mentor A sees bookings only for Mentor A's owned resource.
- [ ] Pending/Upcoming session shows the real mentee name and email.
- [ ] Past completed sessions appear under Past.
- [ ] Cancelled sessions appear under Cancelled.
- [ ] If Mentor B exists, Mentor A cannot read Mentor B's sessions through the mentor UI/data policies.

## 11. Meeting link

- [ ] Mentor can save a valid Google Meet/Zoom/Teams/etc. URL.
- [ ] Mentor sees the meeting link in Upcoming Sessions.
- [ ] A mentee with a confirmed booking sees a Join/meeting link in My Bookings.
- [ ] A user without a confirmed booking does not receive the meeting link through the public resource UI.

## 12. Mentee cancellation

- [ ] Mentee opens the custom cancellation modal.
- [ ] Keep Booking closes the modal without changing data.
- [ ] Confirm Cancel sets booking status to `cancelled`.
- [ ] `cancelled_by` is recorded as `mentee` when the database function supports it.
- [ ] A future slot becomes `available` again.
- [ ] The released slot becomes visible to other mentees.

## 13. Mentor cancellation

- [ ] Mentor can cancel only a booking for their own resource.
- [ ] Mentor sees a centered cancellation modal with mentee/date/time.
- [ ] Mentor can add an optional cancellation reason.
- [ ] Cancellation records `cancelled_by = 'mentor'` and the reason.
- [ ] The future availability slot becomes `unavailable`, not automatically reopened.
- [ ] The cancelled session moves to the Mentor Cancelled tab.
- [ ] The mentee sees the cancelled booking under Past/Cancelled history.

## 14. Production checks

- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes or only documented non-blocking warnings remain.
- [ ] `npm run build` passes.
- [ ] No secret values are committed.
- [ ] Vercel has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Supabase Site URL is the production Vercel URL.
- [ ] Supabase Redirect URLs allow localhost and production `/auth/callback`.
- [ ] Email/password, Google OAuth and GitHub OAuth work in production.
- [ ] Mobile and desktop mentor/mentee navigation work.

## Core acceptance flow

### Mentee

`Mentee Login -> Dashboard -> Resources -> Mentor -> Choose Day -> Choose Time -> Send Booking Request -> My Bookings -> Pending -> Mentor Confirms/Declines`

### Mentor

`Mentor Login -> Mentor Dashboard -> Profile -> Availability -> Generate Slots -> Sessions -> Requests -> Confirm/Cancel -> Notifications -> Switch to Mentee View`

---

# Study Group Membership Tests

## Real mentee identity in Mentor Sessions

1. Log in as a mentee with a real Supabase Auth email/name.
2. Book a one-to-one Mentor slot.
3. Log in as the owning mentor.
4. Open `/mentor/sessions`.
5. Confirm the card shows the mentee's real name and email instead of `BookIt Mentee / Email unavailable`.
6. Confirm a different mentor cannot query that booking through the guarded RPC.

## Create Team 4

1. Log in as Mentor.
2. Open `/mentor/study-groups`.
3. Create `Team 4` with capacity `15`.
4. Confirm it appears in normal `/resources` with **Join Group**.
5. Confirm it does not use `/book/[id]` for membership.

## Join capacity

1. Join Team 4 from separate mentee accounts.
2. Confirm each active join creates membership rather than a booking.
3. Confirm the member count increases.
4. Fill the group to capacity.
5. Confirm an additional user cannot join.

## My Study Groups

1. Join a group as mentee.
2. Open `/my-study-groups`.
3. Confirm the group is listed.
4. Confirm scheduled shared sessions appear.
5. Confirm the meeting link appears only for an active member.

## Shared session behavior

1. With multiple active Team 4 members, schedule one group session as mentor.
2. Confirm all active members see the same session.
3. Confirm one member does not make the shared session unavailable to other members.
4. Cancel the group session as mentor.
5. Confirm all active members stop seeing it as an upcoming scheduled session.

## Member management

1. Open `/mentor/study-groups/[id]` as the owner.
2. Confirm active members show real name and email.
3. Remove one member.
4. Confirm the removed member no longer sees private future group sessions.
5. Confirm historical membership remains in the database as `removed`.

## Leave Group

1. As an active member, open `/my-study-groups`.
2. Choose **Leave Group** and confirm.
3. Confirm the group disappears from active My Study Groups.
4. Confirm the database membership becomes `left`, not hard-deleted.
5. If capacity is still available and the group is open, confirm the user can rejoin later.

## Edit and archive

1. Edit Team 4 name, description/topics, capacity and meeting link.
2. Confirm capacity cannot be set below active member count.
3. Archive Team 4.
4. Confirm it disappears from normal Resources.
5. Confirm membership and session records remain.
6. Restore Team 4 and confirm it becomes available again.

## Mentor Profile deactivation

1. Open `/mentor/profile`.
2. Choose **Deactivate Mentor Profile**.
3. Confirm the mentor resource disappears from normal public Resources.
4. Confirm the Supabase user account remains.
5. Confirm booking history and Study Groups remain.
6. Reactivate the profile and confirm the Mentor resource returns.

## Regression: one-to-one Mentor booking

1. Open a normal Mentor resource.
2. Confirm day/time selection remains unchanged.
3. Confirm `/book/[id]?slot=...` still works.
4. Confirm exact-slot database locking still prevents double-booking.
5. Confirm mentee cancellation reopens a future one-to-one slot.
6. Confirm mentor cancellation keeps the future one-to-one slot unavailable.


## 15. Pending mentor confirmation

- [ ] New one-to-one request is `pending`, not immediately confirmed.
- [ ] The selected availability row becomes `booked` while pending.
- [ ] Mentor sees the request under **Requests**.
- [ ] Only the owning mentor can confirm it.
- [ ] Confirm changes status to `confirmed` and creates a mentee notification.
- [ ] Pending bookings remain visible to the mentee under Upcoming.

## 16. Mentor cancellation reason

- [ ] Mentor cannot cancel without entering a reason.
- [ ] Cancel works for both pending and confirmed bookings.
- [ ] Mentee sees the reason in My Bookings and Messages/Notifications.
- [ ] Mentor-cancelled time becomes unavailable rather than automatically reopened.

## 17. Rescheduling

- [ ] Mentee can choose another currently available slot.
- [ ] Proposed slot is reserved while mentor reviews the request.
- [ ] Original booking remains unchanged until approval.
- [ ] Mentor can approve or decline.
- [ ] Approval releases the old slot and moves the booking to the proposed slot.
- [ ] Decline releases the proposed slot.
- [ ] Both outcomes create a mentee notification.

## 18. Bulk mentor availability

- [ ] **Clear Open Availability** removes future `available` and `unavailable` slots.
- [ ] It never deletes a `booked` slot.
- [ ] The confirmation modal shows how many open/booked slots are affected.

## 19. Notifications and reminders

- [ ] New booking request notifies the owning mentor.
- [ ] Mentor confirmation notifies the mentee.
- [ ] Mentor cancellation sends the reason.
- [ ] Study Group schedule/cancellation notifications reach active members.
- [ ] Unread badge appears beside Messages.
- [ ] Mark one notification read works.
- [ ] Mark all as read works.
- [ ] Due reminders become visible at the user's selected lead time.

## 20. Settings

- [ ] Light, Dark and System theme options work.
- [ ] Theme preference survives refresh.
- [ ] Booking/study-group notification preference toggles save.
- [ ] Reminder lead time saves.
- [ ] Email/password user can verify current password and change password.
- [ ] OAuth user can set a BookIt password without a current-password field.
- [ ] Sign out of all devices logs the account out globally.

## 21. Study Group regular schedule and conflict protection

- [ ] Mentor can add multiple weekday/start/end rows.
- [ ] Regular schedule saves.
- [ ] Generate Sessions creates upcoming shared sessions.
- [ ] A group session cannot overlap a pending/confirmed one-to-one session.
- [ ] A group session cannot overlap another scheduled group session owned by the mentor.
- [ ] Manual one-off group sessions use the same conflict protection.

## 22. Group cancellations, attendance and waitlist

- [ ] Cancelling a Study Group session requires a reason.
- [ ] Active members receive the cancellation reason.
- [ ] Completed group sessions appear in Attendance.
- [ ] Mentor can mark Present, Absent or Excused.
- [ ] Full group shows Join Waitlist.
- [ ] Leaving/removing a member promotes the oldest waiting user when capacity opens.
