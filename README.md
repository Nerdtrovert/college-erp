# College ERP Portal

Welcome to the College ERP Portal. This project is a state-of-the-art academic resource planning system designed to streamline database management, course materials distribution, announcement publishing, student/teacher timetables, internal grading, and attendance tracking.

The repository is split into a robust Express.js backend API and a fast Vite React frontend client, coordinated by a central workspace setup.

## Technology Stack & Architectural Decisions

### 1. Node.js & Express (Backend Server)
We selected Node.js due to its asynchronous, event-driven nature which is excellent for handling high volumes of concurrent I/O operations (such as multi-student logging or bulk attendance saving). Express.js serves as our minimalist web framework, providing a routing tree, middleware processing hooks, and cross-origin resource support without adding bloated packages.

### 2. Prisma ORM (Object-Relational Mapping)
Prisma v6 acts as the data access layer between Node.js and PostgreSQL. It enforces strong type-safety at the compiler level. By writing a unified schema file, Prisma automatically generates TypeScript typings representing our models. This prevents database queries from breaking at runtime and makes writing relational queries intuitive through autocomplete.

### 3. PostgreSQL & Docker (Database)
PostgreSQL is used as the relational database due to its ACID compliance and handling of structured relationships (e.g. cascading updates for student grades and subject references). Using containerization via Docker Compose ensures that developers do not have to install or configure PostgreSQL natively. Spawning a local Postgres server requires a single command, keeping local environments identical.

### 4. React, TypeScript & Vite (Frontend)
The client dashboard is built on React for responsive UI components. TypeScript is integrated across the client to validate forms and data structures. Vite is used as the build tool to achieve near-instantaneous hot module replacement during development. Axios coordinates communication with the backend APIs using central interceptors to automatically transmit JWT authorization tokens.

### 5. Styling and Tailwind CSS
Tailwind CSS is utilized to build a custom responsive layout. The design features sleek modern components, dynamic cards, glassmorphic filters, and interactive hover effects. We use customized color maps to designate distinct visual cues for attendance percentages and grading assessments.

## Developer Prerequisites

Before setting up the project locally, please ensure your system has these dependencies installed:

- **Node.js (v20+ recommended)**: The server runtime environment.
- **NPM (v10+ recommended)**: The package manager to download and manage node modules.
- **Docker Desktop**: Required to run the PostgreSQL container. Download it from the official Docker website.
- **Git**: For source control management.

## Directory Layout

```
college-erp/
├── backend/            # Express REST API application
│   ├── prisma/         # Prisma DB schema & seed data
│   └── src/            # Controllers, middleware, routes, and validations
├── database/           # PostgreSQL Docker configuration
├── frontend/           # Vite React user dashboard
├── README.md           # Developer documentation
└── package.json        # Workspace dev scripts
```

## Developer Onboarding Guide

Setting up a new development environment is straightforward:

1. **Install Dependencies**: Run `npm install` inside the `backend` and `frontend` directories to download the packages.
2. **Configure Environment Variables**: Copy `backend/.env.example` to `backend/.env`. The included local configuration connects to the Docker database at `localhost:5432`.
3. **Database Setup**: With Docker Desktop running, run `npm run db:setup` from the repository root. This starts PostgreSQL, generates the Prisma client, creates the database schema, and seeds mock data.
4. **State Persistence**: The database container maps a volume on your machine. This means records are preserved when you stop the services.

## Main Project Models

A new developer should understand the central data representations stored in the PostgreSQL database:

- **User**: Credentials, hashed passwords, roles (student/teacher), and base metadata.
- **Subject**: Master records for courses including name, code, class group, and teacher associations.
- **AttendanceSession & Record**: History tracking of classes conducted, mapped to student present/absent states.
- **Mark**: Assessment logs scoring students on IA-1, IA-2, Assignment, and Lab parts.
- **Announcement**: Targeted communications published by faculty for sections.
- **Note**: Base64 converted study materials uploaded by instructors and hosted locally.
- **TimetableSlot**: A 5-day, 8-period slot database table defining rooms, sections, and subjects.

## Seed User Profiles

Use these seeded records to log in and inspect the dashboard portals:

### Student Portal
- **Username (Roll)**: `CS21B042`
- **Password**: `student123`
- *Inspect*: Attendance stats, timetable grids, and graded internal assessments.

### Teacher Portal
- **Username (Faculty ID)**: `FAC2018`
- **Password**: `teacher123`
- *Inspect*: Mark student attendance, insert student test marks, and upload study documents.

## Production Deployment & Builds

When deploying to production, compile the optimized web app and server using:
1. Run `npm run build` in the `frontend` folder to output static assets inside `dist/`.
2. Run `npm run build` in the `backend` folder to compile TypeScript files to Node-runnable Javascript inside `dist/`.
3. Update connection URLs in `backend/.env` pointing to your cloud PostgreSQL database instance.

## Developer Best Practices

To keep the codebase clean, follow these guidelines:
- **Type Safety**: Avoid using the `any` keyword in TypeScript wherever possible. Declare clear interface shapes for API responses.
- **Database Mutations**: When changing schema fields, run `npx prisma db push` and ensure seed data is updated in `prisma/seed.ts`.
- **API Security**: Secure routes by adding the auth token interceptors. Always authenticate roles before processing CRUD routes.
- **Form Submissions**: When uploading files in React, wrap files inside a `FormData` object to enable parsing on the backend server.

## Troubleshooting Commands

If you face connection issues with PostgreSQL, run these diagnostic checks:
- Check active containers: `docker ps`
- Fetch container logs: `docker logs college-erp-postgres`
- Verify database connection: `npx prisma db pull --schema=backend/prisma/schema.prisma`
- Clear stale volume storage: `docker volume prune`

## Docker Configuration Details

The Docker Compose template defines a containerized instance running `postgres:15-alpine`. This lightweight image guarantees minimal resource usage while keeping full database functionality. The container runs on port `5432` and utilizes a bridge network mapping for isolated and secure network transport between backend servers and the database engine.

## Prisma Engine Execution

Prisma communicates using its query engine binary. In development, the engine is loaded automatically during command calls. When running Prisma commands, Prisma reads the environment properties from the nearest `.env` file. In this project, all workspace triggers are routed through context-switching scripts, eliminating directory mismatches.

## Frontend Bundling Details

Vite compiles CSS files dynamically using PostCSS configurations. Tailwind CSS utilities are bundled into an optimized minified single asset during production builds. This ensures that unused CSS utilities are purged, resulting in faster load times and enhanced performance metrics across mobile devices.

## Security Policies

The Express application uses Helmet to set headers protecting against common attacks (e.g. cross-site scripting and clickjacking). CORS configurations are set up to only allow trusted clients, preventing malicious origin requests.

## Future Features Roadmap

- **Real-time Notifications**: Integrate web sockets for immediate announcements updates.
- **Grade Analytics**: Add visual charts showcasing student performance trends.
- **Parent Portal**: Enable parents to check attendance records and semester grades.
- **Online Fees Payment**: Secure integration with payment gateway APIs.

## Contributing Guidelines

We welcome contributions to this ERP portal. To contribute, fork this repository, create a descriptive branch, commit your updates, and open a pull request. Make sure all files compile cleanly and typescript validation checks pass.

---

## Testing Status

All backend endpoints and frontend interfaces compile and validate cleanly with zero compiler warnings.
## Setup Instructions

The following commands work the same in macOS, Windows, and Linux. Run the backend and frontend in separate terminals.

1. One-time setup: copy `backend/.env.example` to `backend/.env`, then seed mock data:
   ```bash
   npm run db:setup
   ```
2. Start the database whenever you begin development:
   ```bash
   npm run db:start
   ```
3. Start the backend:
   ```bash
   cd backend
   npm run dev
   ```
4. Start the frontend (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```
