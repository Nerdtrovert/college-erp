# College ERP: Developer Onboarding & Management Guide

Welcome to the College ERP project! This document serves as your complete guide to setting up the local environment, understanding the architecture, managing the database, and understanding core academic lifecycle rules.

## 1. Project Overview & Tech Stack

This project is a full-stack application built for academic administration.
- **Frontend**: React (Vite) + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Containerized via Docker) managed with Prisma ORM
- **Document Processing**: `pdf-parse`, `mammoth`, `exceljs`, and PaddleOCR via `@gutenye/ocr-node`

### Directory Layout
```text
college-erp/
├── backend/            # Express REST API application
│   ├── prisma/         # Prisma DB schema & seed data
│   └── src/            # Controllers, middleware, routes, validations, utils
├── database/           # PostgreSQL Docker configuration
├── frontend/           # Vite React user dashboard
│   └── src/            # React components, pages, services
├── doc.md              # This developer documentation
└── package.json        # Workspace dev scripts
```

## 2. Local Setup & Environment

Setting up your development environment is straightforward:

1. **Install Dependencies**: 
   Run `npm install` inside both the `backend` and `frontend` directories.
2. **Configure Environment Variables**: 
   Copy `backend/.env.example` to `backend/.env`. The default local configuration connects to the Docker database at `localhost:5432`. 
   *(If you run local Postgres on 5432, you can map the docker port differently, e.g., 5433).*
3. **Start the Database**: 
   Ensure Docker Desktop is running, then execute `npm run db:setup` from the repository root to start PostgreSQL, generate the Prisma client, and apply the schema.
4. **Seed Mock Data (Optional but Recommended)**: 
   Run `npm run db:seed` to insert mock faculty, students, semesters, and timetable data.
5. **Start Development Servers**:
   Open separate terminal windows and run:
   - `npm run dev:backend` (Starts Express server on port 5001)
   - `npm run dev:frontend` (Starts Vite React app on port 5173)

### Seed User Profiles (for testing)
- **Student Portal**: Username: `CS21B042`, Password: `student123`
- **Teacher Portal**: Username: `FAC2018`, Password: `teacher123`
- **Admin/Dean Portal**: See `admin` role profiles in seed data.

## 3. Database Commands & Lifecycle

Prisma manages the database schema and queries. Run these from the repository root:

| Command | Purpose | Data impact |
| --- | --- | --- |
| `npm run db:start` | Start PostgreSQL in Docker | Preserves existing data |
| `npm run db:sync` | Generate Prisma Client and sync schema | Adds/updates schema; does not clear rows |
| `npm run db:deploy` | Apply tracked Prisma migrations | Use for deployment environments |
| `npm run db:seed` | Synchronize schema/client, then seed core data | Replaces student roster; preserves faculty |
| `npm run db:clear` | Clear application data | **Destructive**; removes related records |
| `npm run db:constraints` | Apply role-field database constraints | Safe and idempotent |
| `npm run db:setup` | Start, sync, apply constraints, then clear | **Destructive** reset; does not seed |
| `npm run db:setup:dev` | Run `db:setup`, then seed mock data | **Destructive** reset, then seed |
| `npm run db:stop` | Stop PostgreSQL containers | Database volume remains |

**Safe schema changes**: When changing `schema.prisma`, always run `npm run db:sync` to safely push schema additions locally, then `npm --prefix backend run build` and `cd backend && npx prisma validate`. For production deployments, rely on Prisma migrations (`db:deploy`).

## 4. Main Project Models

- **User**: Credentials, hashed passwords, roles (`student`, `teacher`, `dean`, `principal`, `hod`). Fields like `numberOfBacklogs` and `backlogSubjects` are dynamically updated.
- **Subject**: Course definitions mapped to class groups and teachers.
- **Semester**: Academic periods tracked by status (ACTIVE, UPCOMING, ARCHIVED).
- **StudentEnrollment**: Junction tracking a student's program, section, and semester number over time.
- **AttendanceSession & Record**: History mapping classes to student presences.
- **Mark**: Assessment scores (IA1, IA2, assignment, lab).
- **Announcement & Note**: Communications and study materials.
- **TimetableSlot**: Weekly schedules defined by day and slot index.

## 5. Core Business Logic: Academic Lifecycle

### Student Academic Data
Students are identified by USN, program, and section. Faculty use `department` merely as metadata. A student's historical progress is tracked in `StudentEnrollment`, ensuring that later terms do not overwrite historical enrollments. The `db:seed` script intentionally replaces student records when run, so avoid using it against production-like manual databases.

### Automatic Semester and Batch Derivation
Semester numbers and batches are derived dynamically based on:
1. The **cohort year** embedded in the USN (e.g., `1HC24` implies 2024).
2. The academic period's `startDate`.
3. The inferred term (July–December = Odd; January–June = Even).

For an eight-semester course, calculations avoid hardcoding. For example, `1HC24` is in semester 5 in Odd 2026–27. 
`batchStartYear` and `batchEndYear` fields are derived directly from the USN during imports—they are not manually entered. A student import record missing a valid USN will be rejected instead of being assigned a guessed semester. 

*Note: An academic year always begins with its Odd semester. If an Even period starts in January 2027, it belongs to the 2026-27 academic year.*

### Promotion and Completion
Dean, HOD, and Principal roles can trigger the **Promote Students Here** action on an academic period. Promotion:
- Creates the next period's `StudentEnrollment`.
- Advances the semester count by one.
- Preserves historical records.
- If a student reaches semester 8, they are marked as completed. They are not promoted to semester 9, and their portal login is deactivated, though their historical data remains accessible to staff.

## 6. Developer Best Practices

- **Type Safety**: Avoid using `any`. Use robust TypeScript interfaces for payloads and responses.
- **Form Submissions**: When uploading files (like grade-cards or study materials), use `FormData` to ensure Multer can parse them on the Node server.
- **API Security**: Ensure endpoints are protected by `authenticate` and `authorize(['roles'])` middleware.
- **Document Parsers**: If modifying grade-card parsing, check `backend/src/utils/` where `pdf-parse`, `exceljs`, and `@gutenye/ocr-node` are handled natively.

## 7. Troubleshooting

- **Database Connection Issues**: Run `docker ps` to see if the container is running. Use `docker logs college-erp-postgres` for debug logs.
- **Stale Data/Volume Conflicts**: Run `docker volume prune` or manually delete the Docker volume to force a completely fresh database state.
- **Prisma Client Issues**: Run `npx prisma generate` inside the `backend` directory if the client types are stale.
