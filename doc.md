# College ERP Database and Academic Lifecycle

## Database commands

Run commands from the repository root:

| Command | Purpose | Data impact |
| --- | --- | --- |
| `npm run db:start` | Start PostgreSQL in Docker | Preserves existing data |
| `npm run db:sync` | Generate Prisma Client and sync schema | Adds/updates schema; does not clear rows |
| `npm run db:deploy` | Apply tracked Prisma migrations | Use for deployment environments |
| `npm run db:seed` | Seed faculty, current roster, semester, subjects, and timetable | Replaces student roster; preserves faculty upserts |
| `npm run db:clear` | Clear application data | Destructive; removes users, semesters, marks, attendance, and related records |
| `npm run db:constraints` | Apply role-field database constraints | Safe and idempotent |
| `npm run db:setup` | Start, sync, apply constraints, then clear | Destructive reset; does not seed |
| `npm run db:setup:dev` | Run `db:setup` followed by `db:seed` | Destructive reset, then seed |
| `npm run db:stop` | Stop PostgreSQL containers | Database volume remains |

`db:sync` is the normal command after pulling schema changes. It does not reset the
database. `db:seed` regenerates Prisma Client before running, but the database schema
must still be synchronized first with `db:sync` (or reset with `db:setup:dev`).
Before running `db:clear`, `db:setup`, or `db:setup:dev`, export or back up any data
that must be retained.

## Student academic data

Students are identified by USN, program, and section. Faculty use `department` only as
informational metadata. Student academic-period history is stored in
`StudentEnrollment`, which preserves program, section, and semester number for every
academic period. Updating a later term does not overwrite earlier enrollment history.

The student roster seed is sourced from the July 9 seating-allotment PDF. It currently
contains all 228 unique `1HC24*` USNs and excludes `1HC25*` records until their
timetables are available. `db:seed` replaces student rows intentionally, so do not use
it against a database containing manually maintained students unless that replacement
is intended.

## Automatic semester and batch derivation

Semester numbers are derived from:

1. The two-digit cohort year in the USN, such as `1HC24`.
2. The academic period `startDate`.
3. The term inferred from the start month: July–December is Odd; January–June is Even.

For an eight-semester course, a cohort's semester is calculated without
year-specific hardcoding. For example, `1HC24` is semester 5 in Odd 2026–27 and
semester 6 in Even 2026–27. A newly added `1HC25` student is automatically stored as
batch `2025–2029`; a `1HC26` student is batch `2026–2030`.

The stored `batchStartYear` and `batchEndYear` fields are derived from the USN for
filtering and reports. They are not manually entered. Student imports always derive
the semester from the selected academic period and USN; records with an invalid or
unrecognizable USN are rejected instead of receiving a guessed semester.

An academic year always begins with its Odd semester. For example, a period starting
in August 2026 is Odd 2026-27 (semester 1 for `1HC26`), while a period starting in
January 2027 is Even 2026-27 (semester 2 for the same cohort). The calendar year of
an Even-period start date is therefore treated as the ending year of the academic
year, not as a new cohort year.

## Promotion and completion

Dean, HOD, and Principal can create/edit/copy academic periods, import students, and
use **Promote Students Here**. Promotion creates the next period's enrollment,
advances one semester, updates the current student profile, and preserves history.
Students at semester 8 are not promoted to semester 9. Their account is deactivated
for student-portal login, but the User row, marks, attendance, and backlog data remain
available to authorized staff.

## Safe schema changes

When changing `schema.prisma`, run:

```bash
npm run db:sync
npm --prefix backend run build
cd backend && npx prisma validate
```

For a deployment, create/verify a Prisma migration and use `npm run db:deploy`.
Avoid editing or deleting existing migration files. Refresh
`database/college_erp.sql` only after intentionally changing the local database
snapshot.
