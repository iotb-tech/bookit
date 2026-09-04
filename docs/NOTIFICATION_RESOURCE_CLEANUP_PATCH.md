# BookIt Notification + Resource Cleanup Patch

This patch changes only:

1. Reschedule-feedback alignment.
2. Notifications:
   - All
   - Unread
   - Read
   - Mark all as read
   - Clear all
   - improved notification counts
3. Archives the old sample resources:
   - Abdulsalam Idris
   - Adewuyi Awwal
   - Balogun Waliyat
   - Study Group: Team 1
   - Study Group: Team 2
   - Study Group: Team 3
   - Study Group: Team 4

It intentionally preserves:

- Harry Williams
- ELITE
- historical bookings
- historical cancellations
- booking approval workflow
- rescheduling workflow
- availability
- attendance
- waitlist functionality

## Supabase

After applying the patch, run:

supabase/migrations/20260904_notification_cleanup_and_sample_resource_archive.sql

in the Supabase SQL Editor.

The legacy resources are archived instead of hard-deleted so historic
bookings are not damaged.

Future approved mentors may create new active mentor resources, and new
Study Groups can be created normally.