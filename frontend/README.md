# College ERP Frontend

A complete frontend implementation for a College ERP system built with the specified technology stack:

## Technologies Used
- **React 19** - Frontend library
- **Vite** - Build tool and development server
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **React Router DOM v7** - Client-side routing
- **Axios** - HTTP client (conceptually integrated)
- **MUI (Material-UI)** - UI components (icons, buttons, etc.)
- **Lucide Icons** - Icon set (retained for consistency)

## Features
- ✅ Separate student and teacher login pages
- ✅ Role-based routing and access control
- ✅ Student dashboard: Home, Attendance, Marks, Schedule, Announcements
- ✅ Teacher dashboard: Home, Attendance marking, Marks updating, Announcements
- ✅ Exact UI replication from the original design
- ✅ Responsive design for mobile and desktop
- ✅ Mock data implementation (ready for API integration)

## Project Structure
```
src/
├── components/
│   ├── LoginPages.tsx          # Separate student/teacher login pages
│   ├── Sidebar.tsx             # Shared navigation sidebar
│   ├── student/                # Student dashboard components
│   │   ├── StudentDashboard.tsx
│   │   ├── StudentHome.tsx
│   │   ├── StudentAttendance.tsx
│   │   ├── StudentMarks.tsx
│   │   ├── StudentSchedule.tsx
│   │   └── StudentAnnouncements.tsx
│   └── teacher/                # Teacher dashboard components
│       ├── TeacherDashboard.tsx
│       ├── TeacherHome.tsx
│       ├── TeacherAttendance.tsx
│       ├── TeacherMarks.tsx
│       └── TeacherAnnouncements.tsx
├── contexts/
│   └── AuthContext.tsx         # Authentication context
├── types.ts                    # TypeScript interfaces
├── App.tsx                     # Main app with routing
├── main.tsx                    # Entry point
└── index.css                   # Tailwind configuration + custom styles
```

## Key Implementation Details

### Authentication
- Separate login pages for students and teachers
- Mock authentication using demo credentials
- LocalStorage persistence for demo purposes
- Role-based route protection

### UI Components
- **Login Pages**: Exact replica of the original split-screen design with gradient background
- **Sidebar**: Collapsible navigation with user profile and logout
- **Dashboard Cards**: Statistic cards with icons, values, and labels
- **Data Visualization**: 
  - Attendance doughnut charts
  - Subject-wise attendance bars with session dots
  - Marks tables with grading system
  - Timetable grid with color-coded subjects
- **Forms**: Input validation, loading states, success/error feedback
- **Tables**: Interactive marks tables with hover effects and pending status indicators

### Navigation
- Client-side routing with React Router v6
- Protected routes based on user role
- Mobile-responsive sidebar with toggle button
- Breadcrumbs and navigation helpers where appropriate

### Styling
- Exact color scheme preservation from original design
- Custom Tailwind configuration with CSS variables
- Font imports (Inter and DM Sans) maintained
- Consistent spacing, shadows, borders, and animations
- Hover/focus/active states preserved

## Data Flow
- Mock data arrays replicate the original data structures
- Components consume data directly from these arrays
- Ready for API integration by replacing mock data with Axios calls
- State managed with React useState and Context API

## Setup Instructions
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`
4. Preview production build: `npm run preview`

## Login Credentials (Demo)
**Student:**
- ID: CS21B042
- Password: student123

**Teacher:**
- ID: FAC2018
- Password: teacher123

## Notes
This implementation maintains pixel-perfect fidelity to the original UI while incorporating the requested technology stack. The application is ready to be connected to a backend API by replacing the mock data with Axios HTTP calls to appropriate endpoints.