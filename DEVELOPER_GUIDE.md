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
├── DEVELOPER_GUIDE.md  # This developer documentation
└── package.json        # Workspace dev scripts
```

## 2. Local Setup & Environment

Setting up your development environment is straightforward:

1. **Install Dependencies**: 
   Run `npm install` inside both the `backend` and `frontend` directories, or run `npm install` in the root workspace.
2. **Configure Environment Variables**: 
   Copy `backend/.env.example` to `backend/.env`. The default local configuration connects to the Docker database at `localhost:5432`. 
3. **Start the Database**: 
   Ensure Docker Desktop is running, then execute `npm run db:start` or `npm run db:setup` from the repository root to start PostgreSQL, generate the Prisma client, and apply the schema.
4. **Seed Mock Data (Optional but Recommended)**: 
   Run `npm run db:seed` (or `cd backend && npx prisma db seed`) to insert mock faculty, students, semesters, subjects, and timetable data.
5. **Start Development Servers**:
   Open separate terminal windows and run:
   - `npm run dev:backend` (Starts Express server on port 5001)
   - `npm run dev:frontend` (Starts Vite React app on port 5173)

### Seed User Profiles (for testing)
- **Student Portal**: Username: `student email (e.g., student@example.com)`, Password: `password` (check seed data for specific emails based on generated data).
- **Teacher Portal**: Username: `faculty email`, Password: `password`
- **Admin/Dean Portal**: See `admin` role profiles in seed data.

## 3. Database Commands & Lifecycle

Prisma manages the database schema and queries. Run these from the repository root or `backend` folder:

| Command | Purpose | Data impact |
| --- | --- | --- |
| `npm run db:start` | Start PostgreSQL in Docker | Preserves existing data |
| `npx prisma migrate deploy` | Apply tracked Prisma migrations | Use for deployment environments |
| `npx prisma db seed` | Seed core academic data | Replaces student roster; idempotent safely |
| `npx prisma migrate dev` | Apply local schema changes | Prompts for reset if history diverges |

**Safe schema changes**: When changing `schema.prisma`, always run `npx prisma migrate dev --name <migration_name>` to safely push schema additions locally, then `npm run build` to verify types.

## 4. Main Project Models & Architecture

- **User**: Credentials, hashed passwords, roles (`student`, `teacher`, `dean`, `principal`, `hod`). Fields like `numberOfBacklogs` and `backlogSubjects` are dynamically updated.
- **Subject**: Course definitions mapped to class groups. Includes `courseType` classification (`STANDALONE`, `INTEGRATED`, `PROJECT`).
- **Semester**: Academic periods tracked by status (ACTIVE, UPCOMING, ARCHIVED).
- **StudentEnrollment**: Junction tracking a student's program, section, and semester number over time.
- **TimetableSlot**: Weekly schedules defined by day and slot index. Lookups are made via `subjectCode` and `teacherId` (Email UUID mapping).
- **AttendanceSession & Record**: History mapping classes to student presences.
- **Mark**: Assessment scores (IA1, IA2, assignment, lab).

## 5. Core Business Logic: Academic Lifecycle

### Student Academic Data
Students are identified by USN, program, and section. Faculty use `department` merely as metadata. A student's historical progress is tracked in `StudentEnrollment`, ensuring that later terms do not overwrite historical enrollments.

### Automatic Semester and Batch Derivation
Semester numbers and batches are derived dynamically based on:
1. The **cohort year** embedded in the USN.
2. The academic period's `startDate`.
3. The inferred term (July–December = Odd; January–June = Even).

For an eight-semester course, calculations avoid hardcoding. For example, `1HC24` is in semester 5 in Odd 2026–27. 
`batchStartYear` and `batchEndYear` fields are derived directly from the USN during imports.

### Timetable Architecture
The application features a modern Timetable Management module. Timetable slots link directly to a `Subject` via `subjectCode` and a `User` (faculty) via `teacherId`. 
The `SubjectCourseType` enum classifies courses to govern specific constraints (e.g., whether a subject requires a co-teacher or lab facility).

## 6. Developer Best Practices

- **Type Safety**: Avoid using `any`. Use robust TypeScript interfaces.
- **Data Integrity**: The database heavily leverages referential actions (Cascading updates/deletes). Understand Prisma relation configurations before modifying them.
- **Form Submissions**: When uploading files (like grade-cards), use `FormData`.
- **API Security**: Ensure endpoints are protected by `authenticate` and `authorize(['roles'])` middleware.

## 7. Troubleshooting

- **Database Connection Issues**: Run `docker ps` to verify the container. Inspect `.env` in the backend.
- **Prisma Client Stale**: Run `npx prisma generate` inside the `backend` directory.
- **Merge Conflicts in Schema/Seed**: If conflicts occur in `schema.prisma` or `seed.ts`, resolve them manually, drop local changes if necessary, and re-run migrations `npx prisma migrate dev`.
