**Backend (NestJS): A Detailed Overview**

The backend is a standard NestJS application built with a modular architecture. It provides a RESTful API for the frontend to consume and uses Prisma for database access. The source code is in the `src` directory.

***

### Core Modules & Endpoints

Here is a detailed breakdown of the core backend modules:

*   **App**
    *   **Description:** The root module of the application.
    *   **Controller:** `AppController`
    *   **Service:** `AppService`

*   **Analytics (`/analytics`)**
    *   **Description:** Handles data aggregation and analytics for the application.
    *   **Controller:** `AnalyticsController`
        *   `GET /`: Retrieves analytics data based on query parameters.
    *   **Service:** `AnalyticsService`
        *   Provides methods to fetch and process analytics data from the database.

*   **Appointments (`/appointments`)**
    *   **Description:** Manages appointments and scheduling.
    *   **Controller:** `AppointmentsController`
        *   `POST /`: Creates a new appointment.
        *   `GET /`: Retrieves all appointments.
        *   `GET /:id`: Retrieves a single appointment by ID.
        *   `PATCH /:id`: Updates an appointment.
        *   `DELETE /:id`: Deletes an appointment.
    *   **Service:** `AppointmentsService`
        *   Contains the business logic for creating, retrieving, updating, and deleting appointments.

*   **Auth (`/auth`)**
    *   **Description:** Handles user authentication and registration.
    *   **Controller:** `AuthController`
        *   `POST /login`: Authenticates a user and returns a token.
        *   `POST /register`: Registers a new user.
    *   **Service:** `AuthService`
        *   Implements user registration and login logic, including password hashing and JWT generation.

*   **Billing (`/billing`)**
    *   **Description:** Manages invoices and payments.
    *   **Controller:** `BillingController`
        *   `POST /invoices`: Creates a new invoice.
        *   `POST /payments`: Processes a payment for an invoice.
    *   **Service:** `BillingService`
        *   Contains the business logic for invoicing and payment processing.

*   **Cases (`/cases`)**
    *   **Description:** Manages legal cases.
    *   **Controller:** `CasesController`
        *   `POST /`: Creates a new case.
        *   `GET /`: Retrieves all cases.
        *   `GET /:id`: Retrieves a single case by ID.
        *   `PATCH /:id`: Updates a case.
        *   `DELETE /:id`: Deletes a case.
    *   **Service:** `CasesService`
        *   Handles the business logic for managing case data.

*   **Communications (`/communications`)**
    *   **Description:** Intended for handling communications (e.g., email, messaging), but appears to be a placeholder.
    *   **Controller:** `CommunicationsController`
    *   **Service:** `CommunicationsService`

*   **Documents (`/documents`)**
    *   **Description:** Manages file uploads and document storage.
    *   **Controller:** `DocumentsController`
        *   `POST /upload`: Uploads a new document.
        *   `GET /`: Retrieves a list of documents.
        *   `GET /:id`: Retrieves a specific document.
    *   **Service:** `DocumentsService`
        *   Interfaces with a file storage service (likely Appwrite) to handle document persistence.

*   **Prisma**
    *   **Description:** This is not a feature module, but a service module that provides the Prisma Client instance to other modules for database interactions.
    *   **Service:** `PrismaService`

*   **Tasks (`/tasks`, `/global-tasks`)**
    *   **Description:** Manages tasks and to-do items.
    *   **Controllers:** `TasksController`, `GlobalTasksController`
        *   `POST /`: Creates a new task.
        *   `GET /`: Retrieves all tasks.
        *   `GET /:id`: Retrieves a single task by ID.
        *   `PATCH /:id`: Updates a task.
        *   `DELETE /:id`: Deletes a task.
    *   **Service:** `TasksService`
        *   Contains the business logic for task management.

*   **Time Tracking (`/time-tracking`)**
    *   **Description:** Manages time entries and timers.
    *   **Controller:** `TimeTrackingController`
        *   `POST /start`: Starts a new timer.
        *   `POST /stop`: Stops an active timer.
        *   `GET /`: Retrieves all time entries.
        *   `PATCH /:id`: Updates a time entry.
    *   **Service:** `TimeTrackingService`
        *   Handles the logic for starting, stopping, and managing time entries.

*   **Users (`/users`)**
    *   **Description:** Manages user profiles and data.
    *   **Controller:** `UsersController`
        *   `GET /`: Retrieves all users.
        *   `GET /:id`: Retrieves a single user by ID.
        *   `PATCH /:id`: Updates a user.
    *   **Service:** `UsersService`
        *   Handles the business logic for managing user data.


***

### **Frontend (Next.js): A Detailed Overview**

The frontend is a Next.js application located in the `caseace-web` directory. It uses Material-UI for UI components and Zustand for state management. It communicates with the backend's RESTful API to fetch and display data.

#### **Application Structure**

The frontend follows the standard Next.js App Router structure.

*   **Routing (`src/app`)**
    *   The application is divided into public and protected routes. A top-level `layout.tsx` and `page.tsx` define the main entry point and shell.
    *   **Public Routes:**
        *   `/login`: User login page.
        *   `/register`: User registration page.
    *   **Protected Routes (`(protected)` group):** These routes require authentication and are wrapped in a specific layout (`layout.tsx`) that likely includes the `SideNav` component and the `RoleGuard`.
        *   `/dashboard`: The main dashboard after login.
        *   `/analytics`: Displays application analytics.
        *   `/appointments`: Manages user and case appointments.
        *   `/billing`: Handles invoices and payments.
        *   `/cases`: Manages legal cases.
        *   `/legal-assistant`: A feature for legal assistants.
        *   `/tasks`: Manages user and case tasks.
        *   `/time-tracking`: Manages time entries.
        *   `/users`: Manages user profiles.

*   **Components (`src/components`)**
    *   The application uses a set of reusable components to build the UI:
        *   `SideNav.tsx`: The main navigation sidebar for protected pages.
        *   `AppointmentCalendar.tsx`: A calendar component for viewing and managing appointments.
        *   `DocumentUploader.tsx`: A component for uploading files.
        *   `RoleGuard.tsx`: A component that likely restricts access to certain pages or features based on user roles.
        *   `ProgressBar.tsx`: A progress bar component, possibly for indicating loading states.
        *   `PerformanceMonitor.tsx`: A component for monitoring frontend performance.
        *   And others like `ClientRedirect`, `LazyWrapper`, `PrefetchLinks`.

*   **State Management (`src/store`)**
    *   Global state management is handled by Zustand.
    *   `authStore.ts`: This store is responsible for managing the application's authentication state, such as the user's information, JWT token, and login/logout status.

*   **Libraries & Utilities (`src/lib`)**
    *   The frontend uses several utility modules for common tasks:
        *   `axios.ts`: A pre-configured Axios instance for making HTTP requests to the backend API.
        *   `appwrite.ts`: A client for interacting with an Appwrite backend, likely for services like file storage (used by `DocumentUploader`).
        *   `cache.ts`: Provides caching utilities to improve performance.
        *   `performance.ts`: Contains functions related to performance monitoring.

***

### **Database Schema (Prisma)**

The application uses a PostgreSQL database managed by the Prisma ORM. The schema, defined in `prisma/schema.prisma`, is the single source of truth for the data layer.

#### **Enums (Data Types)**

The schema defines several enumerations to ensure data integrity for specific fields:

| Enum Name | Values |
| :--- | :--- |
| **UserRole** | `CLIENT`, `PARALEGAL`, `ASSOCIATE`, `PARTNER` |
| **CaseStatus** | `OPEN`, `CLOSED`, `PENDING` |
| **TaskStatus** | `TODO`, `IN_PROGRESS`, `DONE` |
| **TimeEntryStatus** | `DRAFT`, `BILLABLE`, `NON_BILLABLE`, `BILLED`, `WRITTEN_OFF` |
| **InvoiceEntryStatus**| `UNBILLED`, `BILLED`, `PAID` |
| **TimeEntryType** | `PHONE_CALL`, `MEETING`, `EMAIL`, `RESEARCH`, `DRAFTING`, etc. |
| **ExpenseType** | `COURT_FEES`, `FILING_FEES`, `TRAVEL`, `MEALS`, `LODGING`, etc. |
| **InvoiceStatus** | `DRAFT`, `SENT`, `PAID`, `PARTIALLY_PAID`, `OVERDUE`, `VOID` |
| **PaymentMethod** | `CREDIT_CARD`, `BANK_TRANSFER`, `CHECK`, `CASH`, `OTHER` |
| **ReportType** | `CASE_PROGRESS`, `FINANCIAL`, `PRODUCTIVITY`, `LEAD_CONVERSION`, etc. |
| **ReportFrequency** | `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`, `CUSTOM` |
| **LeadStatus** | `NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL_SENT`, `WON`, `LOST`, etc. |
| **LeadSource** | `WEBSITE`, `REFERRAL`, `SOCIAL_MEDIA`, `ADVERTISEMENT`, etc. |

#### **Models (Database Tables)**

*   **`User`**: Represents all users in the system.
    *   **Key Fields**: `id`, `email`, `name`, `passwordHash`, `role`.
    *   **Relationships**: Has relationships with `Case` (as client and creator), `Task` (as assigner and assignee), `Document`, `Appointment`, `TimeEntry`, `Invoice`, and many others.

*   **`Case`**: Represents a single legal case.
    *   **Key Fields**: `id`, `caseName`, `caseNumber`, `status`, `openDate`, `closeDate`.
    *   **Relationships**: Linked to a `User` (client), a `User` (creator), and has many `Task`s, `Document`s, `TimeEntry`s, `Invoice`s, etc.

*   **`Task`**: Represents a single task or to-do item.
    *   **Key Fields**: `id`, `title`, `description`, `status`, `priority`, `deadline`.
    *   **Relationships**: Belongs to a `Case` and is assigned by and to a `User`.

*   **`Document`**: Represents an uploaded document.
    *   **Key Fields**: `id`, `name`, `fileType`, `fileUrl`.
    *   **Relationships**: Belongs to a `Case` and is uploaded by a `User`.

*   **`Appointment`**: Represents a scheduled appointment.
    *   **Key Fields**: `id`, `title`, `startTime`, `endTime`, `location`.
    *   **Relationships**: Can be linked to a `Case`, is created by a `User`, and has attendees (via `AppointmentAttendee`).

*   **`TimeEntry` & `Expense`**: Core models for time and expense tracking. They are linked to cases, users, and invoices.

*   **`Invoice` & `Payment`**: Core models for the billing system. Invoices are generated from time entries and expenses, and they record payments.

*   **`Lead` & `CaseOutcome`**: Models for tracking potential new cases (leads) and the results of completed cases.

*   **Analytics Models (`SavedReport`, `ReportSchedule`, `StaffProductivity`)**: A suite of models for creating, scheduling, and viewing reports on various aspects of the firm's operations.

*   **Junction/Link Tables (`CaseAssignment`, `AppointmentAttendee`)**: These tables create many-to-many relationships, for example, linking multiple users to a single case with specific roles.

*   **Other Models (`Message`, `DocumentRequest`, `ActiveTimer`)**: Support for in-app messaging, document requests, and tracking active timers for users.