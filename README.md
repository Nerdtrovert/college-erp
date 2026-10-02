# College ERP

**A unified, automated academic management system for modern educational institutions.**

## About the Project
College ERP is a comprehensive, production-ready full-stack application designed to streamline academic administration. It bridges the gap between students, faculty, and administrators by centralizing data, automating grade document processing, and eliminating manual entry redundancies. Built for colleges and universities, this ERP adapts to institutional workflows while providing a secure and scalable digital campus environment.

## Key Features & Modules

### Academic & Student Management
- **Student & Faculty Management**: Comprehensive role-based access (Student, Teacher, HOD, Principal, Dean) with robust profiles.
- **Academic & Semester Management**: Organize active, upcoming, and archived semesters and handle batch enrollments.
- **Attendance Tracking**: Manage subject-wise attendance sessions and individual student records.
- **Timetable Management**: Define structured day and slot-based schedules, assigning rooms and faculty to sections.
- **Announcements & Study Materials**: Centralized campus notices with category filtering, alongside faculty-uploaded course materials.
- **Authentication**: Secure login system with role-based routing and password encryption.

### Automated Results & Document Processing
- **Marks & Results Management**: Detailed tracking of internal assessments (IA1, IA2), assignments, and laboratory scores.
- **Grade-Card Document Upload & Parsing**: Bulk process student results directly from university grade-cards and spreadsheets.
  - **Native Document Parsing**: Built-in parsers for extracting data from PDF, DOCX, Excel, and CSV files natively.
  - **OCR Support**: Integrated Optical Character Recognition (OCR) to process scanned or image-based documents.
- **Student Verification**: Validates uploaded grade data against database records using a strict combination of USN/Roll Number and Student Name.
- **Automatic Backlog Detection**: Intelligently identifies student backlogs and tracks failed subject codes based on parsed results.
- **Dashboards & Reporting**: Features specialized reports such as "Verge of Backlog" warnings and consolidated Attendance & Assignment status reports.

## Technology Stack

- **Frontend**: React (via Vite) with TypeScript for a fast, responsive Single Page Application.
- **Backend API**: Node.js and Express.js RESTful API, fully typed with TypeScript.
- **Database**: PostgreSQL (containerized via Docker) managed with the Prisma ORM for type-safe database queries and migrations.
- **Document Processing Toolkit**: Leverages `pdf-parse`, `mammoth`, `exceljs`, and PaddleOCR via `@gutenye/ocr-node` for robust data extraction.

## High-Level Architecture
The application employs a standard client-server architecture. The Vite-powered React frontend communicates with the Express backend via secure HTTP requests. The API layer enforces role-based authorization, validates payloads, and processes complex business logic—including heavy tasks like OCR and document parsing natively in the Node runtime. The database layer utilizes PostgreSQL managed through Prisma to ensure strict relational integrity.

## Security & Data Handling
- **Authentication**: Secure, stateless user sessions utilizing JSON Web Tokens (JWT).
- **Password Protection**: Industry-standard password hashing using `bcryptjs`.
- **API Security**: Implements `helmet` for robust HTTP header protections against common web vulnerabilities (XSS, Clickjacking).
- **CORS Configuration**: Restricts backend API access strictly to authorized client domains.
- **Data Integrity**: Database constraints and cascading deletes maintain clean relational mapping across all records.

## Deployment Architecture
Designed for scalable production deployments:
- **Containerized Database**: PostgreSQL operates in a Docker container, ensuring consistent environments and simple cloud portability.
- **Optimized Frontend Builds**: Vite compiles highly optimized, minified static assets suitable for CDN or standard web server delivery.
- **Stateless Backend**: The Node API relies entirely on stateless JWT authentication, making it trivial to scale horizontally across multiple instances behind a load balancer.
- **Scalability**: The structured relational schema and stateless API allow the system to efficiently handle concurrent traffic typical of mid-to-large institutions.

## Why Institutions Can Adopt It
- **Centralized Academic Data**: Establishes a single source of truth for student enrollments, faculty assignments, and grading metrics.
- **Automated Document Processing**: Eradicates manual data entry for grade-cards via powerful native parsing and OCR capabilities.
- **Consistent Validation**: Automated validation checks (USN + Name verification) prevent data entry errors and mismatched records.
- **Reduced Administrative Workload**: Empowers faculty to directly manage attendance and marks while giving administrators macro-level insights.
- **Extensibility**: A clean, modular TypeScript architecture allows institutional IT teams to easily build custom workflows.

## For Colleges & Institutions
College ERP provides a robust technical foundation that can be adapted to an institution's existing academic workflows. The system is designed to be aligned with specific departmental structures, local grading terminologies, and deployment requirements. By integrating with existing infrastructure, it enables a tailored digital transformation without disrupting core academic processes. 

*(Note: The platform provides essential technical capabilities but does not make out-of-the-box claims regarding enterprise-scale SLAs, guaranteed uptime, or specific government compliance certifications. Custom adaptations should be thoroughly evaluated by your institutional IT department.)*

## Project Status / Contact / Adoption
- **Project Status**: Active Development / Production-Ready Foundation. Core modules (Authentication, Attendance, Marks, Document Parsing) are fully implemented.
- **Adoption**: Educational institutions interested in evaluating, customizing, or deploying this ERP are encouraged to review the codebase. For adoption inquiries or integration support, please contact the repository maintainers or fork the project to begin your custom implementation.
