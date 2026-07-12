# EduPortal Backend API

This is the Node.js + Express + Prisma ORM + PostgreSQL backend for the College ERP system. It features JWT-based role authorization, input validation with Zod, file uploads via Multer, and robust data models that perfectly mirror the frontend's structures.

## Technology Stack
- **Node.js** & **Express.js** (TypeScript)
- **Prisma ORM** with **PostgreSQL**
- **JWT** (JSON Web Tokens) for role-based authorization
- **bcryptjs** for secure password hashing
- **Zod** for request payload validation
- **Multer** for file/notes uploads
- **Helmet** & **CORS** for HTTP header security and frontend integration

---

## Directory Structure
```
backend/
├── prisma/
│   ├── schema.prisma       # Database schema mappings
│   └── seed.ts             # Seeding script with mock accounts, schedules, marks, etc.
├── src/
│   ├── config/             # Multer and environment configuration
│   ├── controllers/        # Express controllers (auth, attendance, marks, announcements, etc.)
│   ├── middleware/         # Auth validation, RBAC, and Zod validation middlewares
│   ├── routes/             # Unified Express routers
│   ├── services/           # Services directory
│   ├── prisma/             # Prisma client singleton exporter
│   ├── types/              # Extended Express and JWT TypeScript definitions
│   ├── utils/              # Helper utilities
│   ├── validations/        # Zod input schemas
│   ├── app.ts              # Express application configuration
│   └── server.ts           # HTTP server runner and graceful shutdown handlers
├── tsconfig.json           # TypeScript configuration
├── package.json            # Scripts and dependencies
└── .env                    # Environment variables (Port, Database URLs, JWT secrets)
```

---

## Get Started

### 1. Spin up the Database
Make sure Docker is running on your machine, then run the database container:
```bash
cd ../database
docker compose up -d
```

### 2. Install Dependencies
Run this in the `backend` directory to verify dependencies are installed:
```bash
npm install
```

### 3. Generate Prisma Client & Run Migrations
Create your database tables and generate Prisma types:
```bash
npx prisma migrate dev --name init
```

### 4. Seed the Database
Seed the database with all the mock users (Students/Faculty), timetable classes, subjects, internal marks, and announcements:
```bash
npm run prisma:seed
```
*Note: This creates the default demo accounts (`CS21B042` with password `student123` and `FAC2018` with password `teacher123`).*

### 5. Start Development Server
Start the hot-reloading development server:
```bash
npm run dev
```

---

## API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Logs in student/teacher. Returns a Bearer token and user profile object.
- `POST /api/auth/register`: Helper to register new users during local setup.
- `GET /api/auth/me`: Decodes and returns the authenticated user's context.

### Timetable (`/api/timetable`)
- `GET /api/timetable/student` [Student Role]: Returns the 8-period Mon-Fri timetable matching the student's section (e.g. `CSE-B`).
- `GET /api/timetable/teacher` [Teacher Role]: Returns the 8-period Mon-Fri timetable showing classrooms and target student groups.
- `GET /api/timetable/teacher-subjects` [Teacher Role]: Returns the list of subjects a faculty member teaches.

### Attendance (`/api/attendance`)
- `GET /api/attendance/student` [Student Role]: Returns percentage counters and session-by-session history for all subjects.
- `GET /api/attendance/teacher/:subjectCode` [Teacher Role]: Fetches the student roster for a class and their saved status for a specific date (passed as query param `?date=YYYY-MM-DD`).
- `POST /api/attendance/teacher` [Teacher Role]: Submits a date-wise attendance list (`present` / `absent`) for a class.

### Marks (`/api/marks`)
- `GET /api/marks/student` [Student Role]: Returns the student's breakdown for `ia1`, `ia2`, `assignment`, and `lab` marks across all subjects.
- `GET /api/marks/teacher/:subjectCode/:assessmentType` [Teacher Role]: Fetches the student registry with their entered marks for a specific assessment.
- `POST /api/marks/teacher` [Teacher Role]: Submits/Updates marks scores for a list of students.

### Announcements (`/api/announcements`)
- `GET /api/announcements`: Returns all pinned and unpinned announcements (students only receive announcements targeted to their class section or "all").
- `POST /api/announcements` [Teacher Role]: Publishes a new notice (exam, info, or event).
- `DELETE /api/announcements/:id` [Teacher Role]: Deletes a notice.

### Study Notes (`/api/notes`)
- `GET /api/notes`: Lists all notes. Notes are automatically compiled into Base64 strings on-the-fly, allowing the frontend download trigger to work seamlessly.
- `POST /api/notes` [Teacher Role]: Uploads a PDF or text file under `uploads/` using Multer.
- `DELETE /api/notes/:id` [Teacher Role]: Deletes a study note and cleans up the physical file on the disk.
