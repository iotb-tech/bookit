# BookIt Mentor + Study Group Update — Files Changed

This release is based on the supplied `BOOKIT(6)` design. Existing visual patterns were preserved. The one-to-one Mentor booking experience remains intact; Study Groups now use membership and shared sessions.

## New files

### Database
- `supabase/migrations/20260902_study_groups.sql`

### Mentee Study Groups
- `src/app/my-study-groups/page.tsx`
- `src/components/study-groups/MyStudyGroupsList.tsx`
- `src/components/resources/StudyGroupJoinPanel.tsx`
- `src/hooks/useStudyGroupSummary.ts`

### Mentor Study Groups
- `src/app/mentor/study-groups/page.tsx`
- `src/app/mentor/study-groups/[id]/page.tsx`
- `src/components/mentor/MentorStudyGroupsList.tsx`
- `src/components/mentor/MentorStudyGroupDetail.tsx`

### Study Group data/actions
- `src/lib/study-groups/index.ts`
- `src/lib/study-groups/actions.ts`
- `src/schemas/studyGroupSchema.ts`
- `src/types/studyGroup.ts`

### Documentation
- `docs/STUDY_GROUP_UPDATE.md`

## Existing files updated in this phase

- `README.md`
- `docs/CROSS_ROLE_TESTING.md`
- `docs/FILES_CHANGED.md`
- `supabase/schema.sql`
- `supabase/migrations/20260901_mentor_portal.sql`
- `src/app/book/[id]/page.tsx`
- `src/app/mentor/sessions/page.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/mentor/MentorAppShell.tsx`
- `src/components/mentor/MentorProfileForm.tsx`
- `src/components/mentor/MentorSidebar.tsx`
- `src/components/resources/ResourceCard.tsx`
- `src/components/resources/ResourceDetails.tsx`
- `src/lib/mentor/actions.ts`
- `src/lib/mentor/index.ts`
- `src/lib/resources.ts`
- `src/types/database.ts`
- `src/types/mentor.ts`
- `src/types/resource.ts`

## Functional changes

1. Mentor Sessions resolves real mentee name/email through a guarded database function.
2. Study Groups have capacity and membership.
3. Study Group cards use **Join Group** rather than Mentor booking language.
4. Study Group details use Join Group membership instead of selecting an exclusive slot.
5. Mentees have **My Study Groups**.
6. Mentors have **Study Groups** management.
7. Mentors can create/edit/archive groups.
8. Mentors can schedule shared group sessions.
9. Owning mentors can see group member names/emails.
10. Members can leave; owning mentors can remove members.
11. Mentor profiles use deactivate/reactivate rather than hard delete.
12. One-to-one Mentor booking stays on the existing availability/booking flow.
