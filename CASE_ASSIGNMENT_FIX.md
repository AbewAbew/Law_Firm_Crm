# Case Assignment Fix

## Problem Fixed
The issue was with the case visibility logic for staff members (Associates and Paralegals). The backend wasn't properly showing cases when staff were assigned to them or had tasks in those cases.

## Changes Made

### 1. Backend Changes (cases.service.ts)
- **Fixed `findAll` method**: Now properly queries cases where staff are assigned OR have tasks
- **Fixed `findOne` method**: Improved access control for staff members
- **Enhanced `create` method**: Better validation for assigned users
- **Improved `assignUsers` method**: Added proper validation and error handling
- **Added debug methods**: For troubleshooting case access issues

### 2. Frontend Changes
- **Enhanced error handling**: More specific error messages for different scenarios
- **Added debug logging**: Console logs to help identify issues
- **Backend connectivity check**: Verifies backend is running before making requests

## How Case Visibility Works Now

### Partners
- Can see ALL cases in the system

### Associates & Paralegals (Staff)
- Can see cases where they are **directly assigned** via case assignments
- Can see cases where they have **tasks assigned** to them
- Cannot see cases they have no connection to

### Clients
- Can only see their own cases

## Testing the Fix

### 1. Start the Backend
```bash
cd c:\Projects\LawFirmCRM
npm run start:dev
```

### 2. Start the Frontend
```bash
cd c:\Projects\LawFirmCRM\caseace-web
npm run dev
```

### 3. Test Case Assignment

#### Create Test Users (if not already created)
1. Register a Partner: `partner@lawfirm.com`
2. Register an Associate: `associate@lawfirm.com`
3. Register a Paralegal: `paralegal@lawfirm.com`

#### Test Scenario 1: Direct Case Assignment
1. Login as Partner
2. Create a new case
3. Assign the Associate and/or Paralegal to the case
4. Login as Associate/Paralegal
5. Verify the case appears in their cases list
6. Verify they can open the case details

#### Test Scenario 2: Task Assignment
1. Login as Partner
2. Open any case
3. Go to Tasks tab
4. Create a task and assign it to Associate/Paralegal
5. Login as Associate/Paralegal
6. Verify the case now appears in their cases list (even if not directly assigned)
7. Verify they can open the case details

### 4. Debug Endpoints (for troubleshooting)

If you're still having issues, you can use these debug endpoints:

```http
GET http://localhost:3000/cases/{caseId}/debug
Authorization: Bearer {your-token}
```

This will show:
- Case details
- User information
- Assignment status
- Access permissions

## Common Issues and Solutions

### "Backend server is not running"
- Make sure the backend is running on port 3000
- Check if there are any startup errors in the backend console

### "You are not authorized to view this case"
- Check if the user is logged in
- Verify the user has the correct role
- Ensure the user is assigned to the case or has tasks in it

### "Case not found"
- Verify the case ID is correct
- Check if the case exists in the database
- Ensure the user has access to the case

### Network Errors
- Verify both frontend (port 3001) and backend (port 3000) are running
- Check CORS configuration in main.ts
- Verify axios configuration in lib/axios.ts

## Database Schema Verification

The fix relies on these database relationships:
- `CaseAssignment` table links users to cases
- `Task` table has `assignedToId` field linking to users
- Proper foreign key relationships are maintained

If you're still having issues, check that your database schema matches the Prisma schema and run:
```bash
npx prisma db push
```

## Next Steps

After testing, you can remove the debug endpoints and console logs if everything is working correctly.