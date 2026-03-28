# LifeLine Project - MongoDB Database Collections & CRUD Operations Guide

## Overview
Comprehensive mapping of MongoDB collections to team members, detailed responsibilities, CRUD operations, and database schemas for the LifeLine blood donation management system.

---

## Quick Reference Table

| Developer | ID | Module | Collection | CRUD Operations |
|---|---|---|---|---|
| Tharmithan S. | IT24103121 | Appointment & Scheduling | `appointments` | CREATE, READ, UPDATE (Status), DELETE |
| Hansani W.G.H.H | IT24103762 | Emergency Request & Matching | `emergencyrequests` | CREATE, READ, UPDATE (Fulfill) |
| Peiris A.M.A.B | IT24102477 | Donor Eligibility & History | `donors` | READ (Profile), READ (Eligibility), POST (HealthCheck), UPDATE |
| Nimneth P.B.Y | IT24100304 | Donation Camp & Event Mgmt | `camps` | CREATE, READ, UPDATE (Interest), DELETE |
| Kalanchige I.R | IT24101991 | Lab Testing & QC | `inventories` (labResults) | READ (LabResults), UPDATE (LabTest) |
| Hapuarachchige K.S | IT24102336 | Blood Inventory & Stock | `inventories` | CREATE, READ, READ (Alerts) |

---

## Team Member Responsibilities & Collections

### 1. **Appointment & Scheduling** 
**Developer:** Tharmithan S. (IT24103121)  
**Collection:** `appointments`

#### Features
- Book blood donation appointments
- Track appointment status (Scheduled, Completed, Cancelled, Approved, Rejected)
- Support both Hospital and Camp appointments
- Health questionnaire tracking
- Automatic inventory creation on completion

#### CRUD Operations

##### **CREATE - Book Appointment**
```javascript
// Controller: appointmentController.js - bookAppointment()
// Purpose: Allows donor to schedule a donation appointment
// Pre-requisite: Donor must pass eligibility check (calls Peiris's buildEligibility)

POST /api/appointments/book

Body: {
  donorId: ObjectId,              // Reference to donor record
  donorUserId: ObjectId,          // Reference to user - REQUIRED
  donorName: String,              // Donor full name - REQUIRED
  hospitalId: String,             // Hospital/Camp identifier - REQUIRED
  centerType: String,             // "HOSPITAL" or "CAMP" (default: HOSPITAL)
  centerName: String,             // Hospital/Camp name - REQUIRED
  date: Date,                     // Appointment date & time - REQUIRED
  bloodType: String,              // Blood type (optional)
  questionnaire: {
    hasDiagnosedDiseases: Boolean,
    takingMedications: Boolean,
    recentSurgery: Boolean,
    recentTravel: Boolean
  }
}

Example Request:
{
  donorId: "507f1f77bcf86cd799439011",
  donorUserId: "507f1f77bcf86cd799439012",
  donorName: "John Doe",
  hospitalId: "HOSP_001",
  centerType: "HOSPITAL",
  centerName: "National Hospital",
  date: "2026-04-15T10:00:00.000Z",
  bloodType: "O+",
  questionnaire: {
    hasDiagnosedDiseases: false,
    takingMedications: false,
    recentSurgery: false,
    recentTravel: false
  }
}

Response: 201 CREATED
{
  _id: ObjectId("507f191f77bcf86cd799439033"),
  donor: ObjectId("507f1f77bcf86cd799439011"),
  donorUserId: ObjectId("507f1f77bcf86cd799439012"),
  donorName: "John Doe",
  hospitalId: "HOSP_001",
  centerType: "HOSPITAL",
  centerName: "National Hospital",
  bloodType: "O+",
  date: "2026-04-15T10:00:00.000Z",
  status: "Scheduled",
  questionnaire: {
    hasDiagnosedDiseases: false,
    takingMedications: false,
    recentSurgery: false,
    recentTravel: false
  },
  createdAt: "2026-03-26T10:30:00.000Z",
  updatedAt: "2026-03-26T10:30:00.000Z"
}

Error Responses:
400 - "donorUserId, hospitalId, centerName, and date are required"
403 - "You cannot book appointments for another user"
400 - "Donor profile not found" (When building eligibility)
400 - "[Eligibility reason]" (When ineligible: failed safety, too recent donation, etc.)

Process:
1. Validates required fields
2. Checks user authorization (can only book for self or ADMIN/HOSPITAL can book for others)
3. [PEIRIS] Calls buildEligibility(donor) → checks eligibility
4. If ineligible → Returns 400 with specific reason
5. If eligible → Creates appointment record
6. Logs activity: "APPOINTMENT_BOOKED"
```

##### **READ - Get Appointments for Donor**
```javascript
// Controller: appointmentController.js - getAppointmentsForDonor()
// Purpose: Retrieve all appointments for a specific donor
// Shows appointment history, current, and future bookings

GET /api/appointments/donor/:donorId

Response: 200 OK
[
  {
    _id: ObjectId,
    donor: ObjectId,
    donorUserId: ObjectId,
    donorName: "John Doe",
    hospitalId: "HOSP_001",
    centerType: "HOSPITAL",
    centerName: "National Hospital",
    bloodType: "O+",
    date: "2026-04-15T10:00:00.000Z",
    status: "Scheduled",  // Not yet happened
    questionnaire: {...},
    createdAt: Date,
    updatedAt: Date
  },
  {
    _id: ObjectId,
    donor: ObjectId,
    donorUserId: ObjectId,
    donorName: "John Doe",
    hospitalId: "HOSP_001",
    centerType: "HOSPITAL",
    centerName: "National Hospital",
    bloodType: "O+",
    date: "2026-03-20T10:00:00.000Z",
    status: "Completed",  // Already happened
    questionnaire: {...},
    createdAt: Date,
    updatedAt: Date
  }
]

// Sorted by date (descending) - most recent first
// Includes past, current, and future appointments
```

##### **READ - Get All Appointments**
```javascript
// Controller: appointmentController.js - getAllAppointments()
// Purpose: Admin/Hospital view - see all appointments across all donors
// For scheduling and resource planning

GET /api/appointments/all

Response: 200 OK - Array of ALL appointment objects (same structure as above)
// Sorted by date (descending)
// WARNING: Large data set if many appointments exist
```

##### **UPDATE - Update Appointment Status**
```javascript
// Controller: appointmentController.js - updateStatus()
// Purpose: Change appointment status throughout its lifecycle
// Typical flow: Scheduled → Completed
// Allows cancellation or rejection

PUT /api/appointments/:appointmentId/status

Body: {
  status: String
  // Valid values: "Scheduled", "Completed", "Cancelled", "Approved", "Rejected"
}

Example 1 - Mark Appointment as Completed:
Request:
PUT /api/appointments/507f191f77bcf86cd799439033/status
{
  status: "Completed"
}

Response: 200 OK - Updated appointment with status: "Completed"

Side Effects:
1. [HAPUARACHCHIGE] AUTO - Creates Inventory record
   - bloodType: appointment.bloodType
   - quantity: 1
   - donorName: appointment.donorName
   - status: "AVAILABLE"
   - safetyFlag: "PENDING"
   - testStatus: "PENDING"

2. [PEIRIS] AUTO - Updates Donor record
   - lastDonationDate = NOW()
   - (Next eligible date = now + 60 days)

3. [THARMITHAN] Logs activity: "APPOINTMENT_COMPLETED"


Example 2 - Cancel Appointment:
Request:
PUT /api/appointments/507f191f77bcf86cd799439033/status
{
  status: "Cancelled"
}

Response: 200 OK - Updated appointment with status: "Cancelled"

Side Effects:
- No inventory created
- Donor eligibility not affected
- Activity logged: "APPOINTMENT_CANCELLED"


Example 3 - Approve/Reject Appointment:
Request:
PUT /api/appointments/507f191f77bcf86cd799439033/status
{
  status: "Approved"  // or "Rejected"
}

Response: 200 OK - Updated appointment
```

##### **DELETE - Cancel/Delete Appointment** 
```javascript
// Note: Usually handled via status update to "Cancelled"
// Physical deletion is available but not typically used

DELETE /api/appointments/:appointmentId

Response: 200 OK
{
  success: true,
  message: "Appointment deleted/cancelled"
}

// Warning: Physical deletion removes appointment from database
// Better practice: Use status update to "Cancelled" for audit trail
```

#### Database Schema

```javascript
{
  donor: ObjectId (ref: "Donor"),
    // Reference to donor profile
    // Used to retrieve eligibility and health info
    // Can be null if appointment booked without donor profile

  donorUserId: ObjectId (ref: "User") - REQUIRED,
    // Reference to user account
    // Required for authorization checks
    // Only donor or ADMIN can manage

  donorName: String - REQUIRED,
    // Full name of donor
    // Used for display and inventory traceability
    // Example: "John Doe"

  hospitalId: String - REQUIRED,
    // Unique identifier for donation center
    // Used for filtering and location tracking
    // Example: "HOSP_001" or "CAMP_KLN_2026"

  centerType: String (enum: "HOSPITAL", "CAMP") - default: "HOSPITAL",
    // Type of donation center
    // HOSPITAL: Permanent medical facility
    // CAMP: Temporary donation event

  centerName: String - REQUIRED,
    // Display name of center
    // Example: "National Hospital", "Blood Drive - Colombo 2026"

  bloodType: String,
    // Optional blood type information
    // May be populated from donor profile
    // Example: "A+", "O-", etc.

  date: Date - REQUIRED,
    // Scheduled appointment date and time
    // When donor should arrive for donation
    // Example: 2026-04-15T10:00:00Z

  status: String (enum: "Scheduled", "Completed", "Cancelled", "Approved", "Rejected") - default: "Scheduled",
    // Appointment lifecycle status
    // Scheduled: Confirmed but not yet done
    // Completed: Donation completed, blood collected
    // Cancelled: Donor or admin cancelled
    // Approved: Hospital approved the appointment
    // Rejected: Hospital rejected the appointment

  questionnaire: {
    hasDiagnosedDiseases: Boolean - default: false,
      // Does donor have any diagnosed diseases?
      // true = Might be ineligible temporarily
    
    takingMedications: Boolean - default: false,
      // Is donor on any medications?
      // Some medications may affect blood safety
    
    recentSurgery: Boolean - default: false,
      // Has donor had surgery recently?
      // May need recovery time
    
    recentTravel: Boolean - default: false
      // Has donor traveled recently to endemic areas?
      // May affect disease risk
  },

  createdAt: Date - Automatic,
  updatedAt: Date - Automatic
}
```

#### Appointment Lifecycle

```
1. BOOKING PHASE
   Donor fills appointment form
   [THARMITHAN] Receives POST /book request
   [PEIRIS] Checks buildEligibility(donor)
   
   IF Eligible:
     → Create appointment, status: "Scheduled"
     → Log: APPOINTMENT_BOOKED
     → Return: 201 Created
   
   IF Not Eligible:
     → Reject with reason (safety, recent donation, profile missing)
     → Return: 400 Bad Request


2. APPROVAL PHASE
   Hospital reviews appointment
   [THARMITHAN] Updates status → "Approved" or "Rejected"
   
   IF Approved: Donor knows to come on date
   IF Rejected: Donor must reschedule


3. COMPLETION PHASE
   Appointment date arrives, donor donates blood
   [THARMITHAN] Updates status → "Completed"
   
   Triggers:
   ├→ [HAPUARACHCHIGE] Create Inventory record
   ├→ [PEIRIS] Update Donor.lastDonationDate
   └→ Activity logged


4. CANCELLATION (Anytime)
   Donor or admin cancels appointment
   [THARMITHAN] Updates status → "Cancelled"
   → No inventory created
   → No eligibility changes
```

---

### 2. **Emergency Request & Matching**
**Developer:** Hansani W.G.H.H (IT24103762)  
**Collection:** `emergencyrequests`

#### Features
- Create emergency blood requests with critical urgency flag
- Track request status (OPEN, PARTIAL, FULFILLED)
- Automatic stock matching and dispatch
- Activity logging for audit trail
- Critical alert broadcast system
- Hospital blood request management

#### CRUD Operations

##### **CREATE - Create Emergency Blood Request**
```javascript
// Controller: emergencyController.js - createEmergencyRequest()
// Purpose: Hospital submits urgent blood requirement
// CRITICAL requests trigger broadcast alert to all donors

POST /api/emergency/request

Body: {
  bloodType: String - REQUIRED,      // "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
  units: Number - REQUIRED,          // Units needed (min: 1)
  hospital: String - REQUIRED,       // Hospital name
  urgency: String,                   // "NORMAL" or "CRITICAL" (default: "NORMAL")
  reason: String,                    // Why blood is needed (optional)
  hospitalUserId: ObjectId           // Hospital user account reference
}

Example 1 - CRITICAL Emergency Request:
{
  bloodType: "AB-",         // Rare blood type - critical
  units: 3,                 // Need 3 units
  hospital: "Emergency Care Center",
  urgency: "CRITICAL",      // BROADCAST ALERT!
  reason: "Massive trauma patient - multiple transfusions needed"
}

Response: 201 CREATED
{
  id: ObjectId("507f1f77bcf86cd799439014"),
  broadcastTriggered: true,  // YES - all donors notified!
  message: "Emergency alert created for Emergency Care Center."
}

Activity Logged: "EMERGENCY_REQUEST" 
Note: "Critical request created for AB-"


Example 2 - Normal Request:
{
  bloodType: "O+",          // Common blood type
  units: 2,
  hospital: "General Hospital",
  urgency: "NORMAL"         // No broadcast
}

Response: 201 CREATED
{
  id: ObjectId("507f1f77bcf86cd799439015"),
  broadcastTriggered: false,
  message: "Request submitted for General Hospital."
}

Error Responses:
400 - "bloodType, units, and hospital are required"
400 - "units must be greater than zero"
```

##### **READ - Get All Emergency Requests**
```javascript
// Controller: emergencyController.js - getAllRequests()
// Purpose: View all emergency requests (past and current)
// Hospital admins review request status

GET /api/emergency/requests

Response: 200 OK
[
  {
    id: ObjectId("507f1f77bcf86cd799439014"),
    hospital: "Emergency Care Center",
    bloodType: "AB-",
    urgency: "CRITICAL",
    reason: "Massive trauma patient",
    status: "PARTIAL",           // Got some units but need more
    unitsRequested: 3,
    unitsFulfilled: 2,           // Got 2 of 3 needed
    createdAt: "2026-03-26T08:00:00.000Z"
  },
  {
    id: ObjectId("507f1f77bcf86cd799439015"),
    hospital: "General Hospital",
    bloodType: "O+",
    urgency: "NORMAL",
    reason: null,
    status: "FULFILLED",         // All units provided
    unitsRequested: 2,
    unitsFulfilled: 2,
    createdAt: "2026-03-26T10:30:00.000Z"
  },
  {
    id: ObjectId("507f1f77bcf86cd799439016"),
    hospital: "District Hospital",
    bloodType: "B+",
    urgency: "NORMAL",
    reason: null,
    status: "OPEN",              // No units provided yet
    unitsRequested: 4,
    unitsFulfilled: 0,
    createdAt: "2026-03-26T11:00:00.000Z"
  }
]

// Sorted by createdAt (descending) - most recent first
```

##### **UPDATE - Fulfill Emergency Request**
```javascript
// Controller: emergencyController.js - fulfillRequest()
// Purpose: Dispatch blood units to fulfill request
// Automatically matches inventory with blood type and SAFE status

POST /api/emergency/requests/:requestId/fulfill

Body: {
  units: Number - REQUIRED,         // How many units to dispatch
  // Example: 2 (dispatch 2 units)
}

Example - Fulfill Partial Request:
Request:
POST /api/emergency/requests/507f1f77bcf86cd799439014/fulfill
{
  units: 2
}

Response: 200 OK
{
  message: "Request partially fulfilled",
  unitsFulfilled: 2,
  status: "PARTIAL",            // Still need 1 more unit (3 requested, 2 fulfilled)
  unitsDispatched: 2
}

Side Effects (For Each Matching Blood Bag):
- Searches inventory where:
  ├─ bloodType matches request
  ├─ quantity > 0
  └─ safetyFlag = "SAFE" (only safe blood!)
- Updates inventory:
  ├─ quantity -= dispatchedAmount
  ├─ status = "DISPATCHED"
  └─ Marked for transport to hospital


Example 2 - Fulfill Completely:
Request:
POST /api/emergency/requests/507f1f77bcf86cd799439014/fulfill
{
  units: 1
}

Response: 200 OK
{
  message: "Request fulfilled",
  unitsFulfilled: 3,
  status: "FULFILLED",          // All units provided!
  unitsDispatched: 1
}


Example 3 - Cannot Fulfill (No Safe Stock):
Request:
POST /api/emergency/requests/507f1f77bcf86cd799439014/fulfill
{
  units: 5
}

Response: 400 BAD REQUEST
{
  error: "No safe AB- units are currently available for dispatch"
}

// No units dispatched, request status unchanged


Process for Fulfillment:
1. [HANSANI] fulfillRequest() called
2. Search inventory for matching blood type
3. Filter by SAFE status (safetyFlag: "SAFE")
4. Filter by available quantity (quantity > 0)
5. Loop through bags oldest first (first collected = use first)
   ├→ For each bag:
   │  ├─ Calculate dispatchable amount: min(bagQuantity, unitsNeeded)
   │  ├─ Reduce bag quantity
   │  ├─ Save bag with new status
   │  └─ Reduce unitsNeeded
6. Calculate fulfilled amount
7. Update request.unitsFulfilled
8. Update request.status:
   ├─ If unitsFulfilled >= unitsRequested: "FULFILLED"
   └─ Else: "PARTIAL"
9. Log activity: "EMERGENCY_DISPATCH" or similar
```

#### Database Schema

```javascript
{
  hospitalUserId: ObjectId (ref: "User"),
    // Hospital staff user account
    // Links to hospital user who created request
    // Optional - may be null for anonymous requests

  hospital: String - REQUIRED,
    // Hospital/facility name
    // Example: "National Hospital", "Emergency Care Center"

  bloodType: String - REQUIRED,
    // Required blood type
    // Valid: "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
    // Used for inventory matching
    // Each request is for ONE blood type

  unitsRequested: Number (min: 1) - REQUIRED,
    // Total units needed
    // Minimum 1 unit
    // Example: 3 (need 3 units of blood)

  unitsFulfilled: Number - default: 0,
    // Units successfully dispatched
    // Starts at 0
    // Increases as stock is dispatched
    // Example: 2 (provided 2 of 3 requested)

  urgency: String (enum: "NORMAL", "CRITICAL") - default: "NORMAL",
    // Request urgency level
    // CRITICAL: Life-threatening patient, triggers broadcast alert
    // NORMAL: Routine request, no broadcast

  reason: String,
    // Optional explanation
    // Why blood is needed
    // Example: "Trauma patient - multiple transfusions", "Scheduled surgery"
    // Helps prioritize and categorize requests

  status: String (enum: "OPEN", "PARTIAL", "FULFILLED") - default: "OPEN",
    // Request fulfillment status
    // OPEN: No units dispatched yet (unitsFulfilled = 0)
    // PARTIAL: Some units dispatched (0 < unitsFulfilled < unitsRequested)
    // FULFILLED: All units dispatched (unitsFulfilled >= unitsRequested)

  createdAt: Date - Automatic,
    // When request was created
    // Used for sorting (oldest first = more urgent)

  updatedAt: Date - Automatic
    // When request was last updated
    // Updated when fulfilled
}
```

#### Emergency Request Lifecycle

```
STAGE 1: REQUEST CREATION
Doctor/Hospital realizes need for blood
  ↓
[HANSANI] createEmergencyRequest()
  ├→ Validates bloodType, units, hospital
  ├→ Creates record with status: "OPEN"
  ├→ Checks urgency level
  │
  ├→ IF CRITICAL:
  │  ├─ broadcastTriggered: true
  │  ├─ Send alert to all available donors
  │  └─ Log as highest priority
  │
  └→ IF NORMAL:
     ├─ broadcastTriggered: false
     └─ Regular priority


STAGE 2: INVENTORY SEARCH
[HANSANI] fulfillRequest() called
  ├→ Search inventory
  ├─ Filter: bloodType matches
  ├─ Filter: safetyFlag = "SAFE"
  └─ Filter: quantity > 0


STAGE 3: DISPATCH
If matching stock found:
  ├→ Take oldest bags first (FIFO principle)
  ├→ Reduce inventory.quantity
  ├→ Update inventory.status → "DISPATCHED"
  ├→ Send to hospital
  └→ Update request status
     ├─ IF all units provided: status = "FULFILLED"
     └─ IF partial: status = "PARTIAL"


STAGE 4: COMPLETION
Blood arrives at hospital
  ├→ Transfused to patient
  └→ Request fully addressed


FAILURE CASE: Not enough safe blood
  ├→ No matching blood available
  ├→ OR safetyFlag is not "SAFE" (only SAFE blood used!)
  └→ Error: Cannot fulfill
      → Request remains OPEN
      → Wait for more donations
```

#### Stock Priority for Dispatch

```
When fulfilling CRITICAL emergency request:
1. Search only SAFE inventory (safetyFlag = "SAFE")
2. Sort by collectedAt ascending (oldest first)
3. Dispatch in FIFO order
4. Stop when unitsFulfilled >= unitsRequested

Example:
Need: 3 units of O+

Available SAFE inventory:
  ├─ Bag A: 2 units, collected 3/20 ← USE FIRST
  ├─ Bag B: 1 unit, collected 3/22
  ├─ Bag C: 3 units, collected 3/24
  └─ Bag D: 2 units, collected 3/25

Dispatch action:
1. Take 2 from Bag A → unitsFulfilled: 2, need 1 more
2. Take 1 from Bag B → unitsFulfilled: 3, DONE!
   
Result:
- Bag A: quantity 0 → status "DISPATCHED"
- Bag B: quantity 0 → status "DISPATCHED"
- Request: status "FULFILLED"
```

---

### 3. **Donor Eligibility & History**
**Developer:** Peiris A.M.A.B (IT24102477)  
**Collection:** `donors`

#### Features
- Manage donor profiles with health and eligibility data
- Blood type tracking
- Donation history (last donation date)
- Safety status (SAFE, POSITIVE, BLOCKED)
- **Critical:** Eligibility checking (60-day donation gap enforcement)
- Health screening via questionnaire
- Geographic location tracking

#### CRUD Operations

##### **READ - Get Donor Profile by User ID**
```javascript
// Controller: donorController.js - getDonorByUserId()
// Purpose: Retrieve full donor profile linked to user account

GET /api/donors/user/:userId

Response: 200 OK
{
  _id: ObjectId,
  user: {
    _id: ObjectId,
    name: String,
    email: String,
    role: "DONOR",
    createdAt: Date,
    updatedAt: Date
    // password is excluded
  },
  bloodType: "A+",
  lastDonationDate: Date,
  weight: 70,
  gender: "Male",
  dateOfBirth: Date,
  province: "Western",
  district: "Colombo",
  nearestHospital: "National Hospital",
  safetyStatus: "SAFE",
  positiveReason: null,
  createdAt: Date,
  updatedAt: Date
}

Error Response 404: "Donor profile not found"
```

##### **READ - Check Donor Eligibility**
```javascript
// Controller: donorController.js - getEligibility()
// Purpose: Determine if donor is eligible to donate NOW
// Checks: Profile exists, Safety status, 60-day gap rule

GET /api/donors/:donorId/eligibility

Response: 200 OK - ELIGIBLE
{
  eligible: true,
  reason: "Eligible to donate"
}

Response: 200 OK - NOT ELIGIBLE (No Profile)
{
  eligible: false,
  reason: "Donor profile not found.",
  type: "PROFILE"
}

Response: 200 OK - NOT ELIGIBLE (Failed Safety Check)
{
  eligible: false,
  reason: "You are not eligible to donate because your latest test result is not safe.",
  type: "SAFETY"
}

Response: 200 OK - NOT ELIGIBLE (Recently Donated)
{
  eligible: false,
  reason: "You donated recently and must wait at least 60 days before booking again.",
  type: "RECENT_DONATION",
  daysRemaining: 42,
  nextEligibleDate: "2026-05-07T00:00:00.000Z"
}
```

##### **POST - Validate Health Questionnaire**
```javascript
// Controller: donorController.js - healthCheck()
// Purpose: Check health screening responses BEFORE appointment
// Temporary eligibility block based on health conditions

POST /api/donors/healthcheck

Body: {
  diseases: Boolean,     // Has diagnosed diseases?
  medications: Boolean,  // Taking medications?
  surgery: Boolean,      // Recent surgery?
  travel: Boolean        // Recent travel?
}

Response: 200 OK - PASSED
{
  eligible: true,
  reason: "Health questionnaire passed."
}

Response: 200 OK - FAILED
{
  eligible: false,
  reason: "Health questionnaire marked you as temporarily ineligible."
}

// Notes:
// - If ANY field is true, donor is ineligible
// - This is a temporary block (questionnaire answers, not permanent)
// - Can be updated for next donation
```

##### **UPDATE - Update Donor Profile**
```javascript
// Purpose: Update donor health/location info or safety status
// Typically triggered by:
// 1. Appointment completion → updates lastDonationDate
// 2. Lab results → updates safetyStatus & positiveReason
// 3. Profile update request → updates health metrics

PUT /api/donors/:donorId

Body (Complete Update):
{
  bloodType: "O+",
  lastDonationDate: "2026-03-20T00:00:00.000Z",
  weight: 72,
  gender: "Female",
  safetyStatus: "SAFE",           // or "POSITIVE" or "BLOCKED"
  positiveReason: null            // Why blocked if applicable
}

Body (Partial Update - After Appointment Completed):
{
  lastDonationDate: "2026-03-26T00:00:00.000Z"
}

Body (Partial Update - After Lab Result):
{
  safetyStatus: "POSITIVE",
  positiveReason: "HIV antibodies detected in sample XYZ"
}

Response: 200 OK - Updated Donor object with all fields
```

#### Database Schema
```javascript
{
  user: ObjectId (ref: "User") - REQUIRED, UNIQUE,
  
  bloodType: String - default: "UNKNOWN",
    // Valid values: "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "UNKNOWN"
  
  lastDonationDate: Date,
    // When donor last completed appointment
    // NULL = Never donated
    // Used to calculate 60-day waiting period
  
  weight: Number,
    // Donor weight in kg
    // Used for health screening
  
  gender: String,
    // Values: "Male", "Female", "Other"
  
  dateOfBirth: Date,
    // For age verification (min 18 years for donation)
  
  province: String,
    // Geographic location for camp/hospital search
  
  district: String,
    // More specific geographic location
  
  nearestHospital: String,
    // Preferred donation center
  
  safetyStatus: String (enum: "SAFE", "POSITIVE", "BLOCKED") - default: "SAFE",
    // SAFE: Can donate, passed all tests
    // POSITIVE: Failed lab tests, cannot donate
    // BLOCKED: Admin blocked (banned from donating)
  
  positiveReason: String,
    // Explanation if safetyStatus is POSITIVE/BLOCKED
    // Example: "HIV antibodies detected"
  
  createdAt: Date - automatic,
  updatedAt: Date - automatic
}
```

#### Business Logic - Eligibility Determination

```javascript
const MINIMUM_DONATION_GAP_DAYS = 60;

function buildEligibility(donor) {
  // CHECK 1: Profile exists?
  if (!donor) {
    return { eligible: false, type: "PROFILE", reason: "Donor profile not found." }
  }
  
  // CHECK 2: Safety status?
  if (donor.safetyStatus !== "SAFE") {
    return { 
      eligible: false, 
      type: "SAFETY", 
      reason: donor.positiveReason || "Test result not safe"
    }
  }
  
  // CHECK 3: 60-day gap?
  if (donor.lastDonationDate) {
    const lastDonation = new Date(donor.lastDonationDate);
    const nextEligibleDate = new Date(lastDonation);
    nextEligibleDate.setDate(nextEligibleDate.getDate() + 60);
    
    if (nextEligibleDate > new Date()) {
      const daysRemaining = Math.ceil(
        (nextEligibleDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        eligible: false,
        type: "RECENT_DONATION",
        reason: "Must wait 60 days between donations",
        daysRemaining,
        nextEligibleDate
      }
    }
  }
  
  // PASSED ALL CHECKS
  return {
    eligible: true,
    reason: "Eligible to donate"
  }
}
```

#### Data Flow Integration

```
User Registration (AuthController)
    ↓
Create User record
    ↓
[PEIRIS] Create empty Donor profile linked to User


Donor Views Profile
    ↓
[PEIRIS] getDonorByUserId()
    ↓
Returns profile with all health/location data


Donor Attempts to Book Appointment
    ↓
[THARMITHAN] bookAppointment()
    ├→ Calls buildEligibility(donor)
    ├→ [PEIRIS] Performs eligibility check
    │
    ├→ IF eligible: Create appointment
    └→ IF not eligible: Reject with reason


Appointment Completed
    ↓
[THARMITHAN] updateStatus(status: "Completed")
    ├→ Creates Inventory record
    ├→ [PEIRIS] Updates Donor.lastDonationDate = NOW
    │
    └→ Next donation available: 60 days later


Lab Test Results Available
    ↓
[KALANCHIGE I.R] updateLabTest()
    ├→ Sets testStatus: "TESTED_POSITIVE" or "TESTED_SAFE"
    ├→ [PEIRIS] Updates Donor.safetyStatus
    │
    └→ Affects next eligibility check
```

---

### 4. **Donation Camp & Event Management**
**Developer:** Nimneth P.B.Y (IT24100304)  
**Collection:** `camps`

#### Features
- Create and manage blood donation camps
- Track camp status (UPCOMING, ONGOING, ENDED)
- Monitor interested donor count
- Location-based camp discovery
- Google Maps integration
- Geographic filtering by province/district

#### CRUD Operations

##### **CREATE - Create Donation Camp**
```javascript
// Controller: campController.js - createCamp()
// Purpose: Create new blood donation camp event
// Admin/Organizer schedules camp with location and time

POST /api/camps

Body: {
  name: String - REQUIRED,              // Camp event name
  province: String - REQUIRED,          // State/Province
  district: String - REQUIRED,          // City/District
  nearestHospital: String,              // Hosting hospital (optional)
  location: String,                     // Specific location description
  address: String,                      // Postal address
  googleMapLink: String,                // Map embed link
  date: String - REQUIRED,              // Camp date
  startTime: String,                    // Opening time (HH:MM format)
  endTime: String,                      // Closing time (HH:MM format)
  campStatus: String                    // "UPCOMING", "ONGOING", "ENDED"
}

Example Request:
{
  name: "World Blood Donor Day Camp 2026",
  province: "Western",
  district: "Colombo",
  nearestHospital: "National Hospital Colombo",
  location: "Viharamahadevi Park, Colombo 7",
  address: "A.L. Molamure Mawatha, Colombo 00700",
  googleMapLink: "https://maps.google.com/?q=...",
  date: "2026-06-14",
  startTime: "08:00",
  endTime: "16:00",
  campStatus: "UPCOMING"
}

Response: 201 CREATED
{
  _id: ObjectId("507f1f77bcf86cd799439017"),
  name: "World Blood Donor Day Camp 2026",
  province: "Western",
  district: "Colombo",
  nearestHospital: "National Hospital Colombo",
  location: "Viharamahadevi Park, Colombo 7",
  address: "A.L. Molamure Mawatha, Colombo 00700",
  googleMapLink: "https://maps.google.com/?q=...",
  date: "2026-06-14",
  startTime: "08:00",
  endTime: "16:00",
  campStatus: "UPCOMING",
  interestedCount: 0,
  createdAt: "2026-03-26T10:30:00.000Z",
  updatedAt: "2026-03-26T10:30:00.000Z"
}

Error Responses:
400 - "Name, province, district, and date are required"
```

##### **READ - Get All Camps**
```javascript
// Controller: campController.js - getCamps()
// Purpose: Display available camps for donor browsing
// Helps donors discover nearby donation opportunities

GET /api/camps

Response: 200 OK
[
  {
    _id: ObjectId("507f1f77bcf86cd799439017"),
    name: "World Blood Donor Day Camp 2026",
    province: "Western",
    district: "Colombo",
    nearestHospital: "National Hospital Colombo",
    location: "Viharamahadevi Park, Colombo 7",
    address: "A.L. Molamure Mawatha, Colombo 00700",
    googleMapLink: "https://maps.google.com/?q=...",
    date: "2026-06-14",
    startTime: "08:00",
    endTime: "16:00",
    campStatus: "UPCOMING",
    interestedCount: 127,   // 127 donors interested
    createdAt: "2026-03-26T10:30:00.000Z",
    updatedAt: "2026-03-26T10:30:00.000Z"
  }
]

// Sorted by date (ascending) - earliest first
// Donors can see when and where camps are happening
```

##### **UPDATE - Record Donor Interest in Camp**
```javascript
// Controller: campController.js - markInterest()
// Purpose: Track how many donors are interested in camp
// Helps organizers gauge participation and plan resources

POST /api/camps/:campId/interest

Body: (No body required - just marking interest)

Response: 200 OK - Updated camp with incremented count
{
  _id: ObjectId("507f1f77bcf86cd799439017"),
  name: "World Blood Donor Day Camp 2026",
  interestedCount: 128,   // Incremented from 127!
  createdAt: "2026-03-26T10:30:00.000Z",
  updatedAt: "2026-03-26T16:30:00.000Z"
}

Process:
1. Find camp by ID
2. Increment interestedCount by 1
3. Save camp record
4. Return updated camp
```

##### **DELETE - Delete/Cancel Camp**
```javascript
// Controller: campController.js - deleteCamp()
// Purpose: Remove camp from system

DELETE /api/camps/:campId

Response: 200 OK
{
  success: true,
  message: "Camp deleted successfully"
}
```

#### Database Schema

```javascript
{
  name: String - REQUIRED,
    // Camp event name/title

  province: String - REQUIRED,
    // State/Province name
    // Used for geographic filtering

  district: String - REQUIRED,
    // City/District name
    // Used for location-based camp discovery

  nearestHospital: String,
    // Associated hospital name

  location: String,
    // Specific location description

  address: String,
    // Postal address

  googleMapLink: String,
    // Google Maps embed/link

  date: String - REQUIRED,
    // Camp date (YYYY-MM-DD format)

  startTime: String,
    // Opening time (HH:MM format)

  endTime: String,
    // Closing time (HH:MM format)

  campStatus: String (enum: "UPCOMING", "ONGOING", "ENDED") - default: "UPCOMING",
    // Camp lifecycle status
    // UPCOMING: Scheduled, not started yet
    // ONGOING: Currently happening
    // ENDED: Camp is finished

  interestedCount: Number - default: 0,
    // Number of donors interested
    // Increments when donors click interested
    // Used for planning resources

  createdAt: Date - Automatic,
  updatedAt: Date - Automatic
}
```

---

### 5. **Lab Testing & Quality Control**
**Developer:** Kalanchige I.R (IT24101991)  
**Collection:** `inventories` (Focusing on `labResults` field and safety flags)

#### Features
- Lab test result management (HIV, Hepatitis, Malaria screening)
- Blood bag safety validation
- Quality control status tracking
- Flag positive results for discard
- Test history maintenance

#### CRUD Operations

##### **READ - Get Lab Results for Blood Bag**
```javascript
// Controller: inventoryController.js - getLabResults()
// Purpose: Retrieve all test history for a specific blood bag
// Shows what tests have been performed and their results

GET /api/inventory/:bagId/lab-results

Response: 200 OK
[
  {
    hiv: false,
    hep: false,
    malaria: false,
    reason: "",
    testedAt: "2026-03-24T10:30:00.000Z"
  },
  {
    hiv: false,
    hep: true,      // POSITIVE - Hepatitis detected!
    malaria: false,
    reason: "Hepatitis B antigen positive",
    testedAt: "2026-03-25T14:15:00.000Z"
  }
]

Response: 404 - "Inventory item not found"
```

##### **UPDATE - Record Lab Test Results**
```javascript
// Controller: inventoryController.js - updateLabTest()
// Purpose: Add new lab test result to blood bag
// CRITICAL: Automatically updates inventory status based on test result

PUT /api/inventory/:bagId/lab-test

Body: {
  hiv: Boolean,      // HIV antibody test result
  hep: Boolean,      // Hepatitis test result
  malaria: Boolean,  // Malaria test result
  reason: String     // Additional notes (optional)
}

Example 1 - All Tests NEGATIVE (Safe):
Request Body:
{
  hiv: false,
  hep: false,
  malaria: false,
  reason: ""
}

Response: 200 OK
{
  id: ObjectId,
  testStatus: "TESTED_SAFE",      // Updated
  safetyFlag: "SAFE"              // Updated
}

// Side effects:
// - inventory.labResults: Added new test record
// - inventory.testStatus: Changed to "TESTED_SAFE"
// - inventory.safetyFlag: Changed to "SAFE"
// - inventory.status: Remains/set to "AVAILABLE"


Example 2 - Positive Test Result (Unsafe):
Request Body:
{
  hiv: true,        // POSITIVE!
  hep: false,
  malaria: false,
  reason: "HIV antibodies detected"
}

Response: 200 OK
{
  id: ObjectId,
  testStatus: "TESTED_POSITIVE",  // Updated
  safetyFlag: "BIO-HAZARD"        // Updated - DANGER!
}

// Side effects:
// - inventory.labResults: Added new test record
// - inventory.testStatus: Changed to "TESTED_POSITIVE"
// - inventory.safetyFlag: Changed to "BIO-HAZARD"
// - inventory.status: Set to "DISCARD"        // MUST BE DESTROYED!
// - Activity logged: "LAB_RESULT" event
// - Donor.safetyStatus: May be updated to "POSITIVE"
```

#### Database Schema (Lab Results Portion)

```javascript
// Embedded in Inventory collection:
labResults: [
  {
    hiv: Boolean - default: false,
      // true = HIV antibodies detected (UNSAFE)
      // false = No HIV antibodies (SAFE)
    
    hep: Boolean - default: false,
      // true = Hepatitis antibodies detected (UNSAFE)
      // false = No Hepatitis (SAFE)
    
    malaria: Boolean - default: false,
      // true = Malaria parasites detected (UNSAFE)
      // false = No Malaria (SAFE)
    
    reason: String - default: "",
      // Comments about test result
      // Example: "Hepatitis B antigen positive"
    
    testedAt: Date - default: Date.now()
      // When this test was performed
  }
],

// Related inventory fields [KALANCHIGE updates these]:
testStatus: String (enum: "PENDING", "TESTED_SAFE", "TESTED_POSITIVE"),
  // PENDING: Awaiting lab test
  // TESTED_SAFE: Test passed, all negative
  // TESTED_POSITIVE: Test failed, has positive marker

safetyFlag: String (enum: "SAFE", "BIO-HAZARD", "PENDING"),
  // SAFE: Passed testing, can be transfused
  // BIO-HAZARD: Failed test, must be discarded
  // PENDING: Awaiting test result

status: String (enum: "AVAILABLE", "DISPATCHED", "DISCARD", "SAFE"),
  // DISCARD: Set when test is positive
  // Other statuses managed by Hapuarachchige
```

#### Business Logic - Test Result Processing

```javascript
function updateLabTest(bagId, testResults) {
  const bag = await Inventory.findById(bagId);
  
  // 1. Check if ANY test is positive
  const hasPositiveMarker = testResults.hiv || testResults.hep || testResults.malaria;
  
  // 2. Add test result to history
  bag.labResults.push({
    hiv: testResults.hiv,
    hep: testResults.hep,
    malaria: testResults.malaria,
    reason: testResults.reason || "",
    testedAt: new Date()
  });
  
  // 3. Update safety status based on result
  if (hasPositiveMarker) {
    bag.testStatus = "TESTED_POSITIVE";
    bag.safetyFlag = "BIO-HAZARD";
    bag.status = "DISCARD";           // Mark for destruction
  } else {
    bag.testStatus = "TESTED_SAFE";
    bag.safetyFlag = "SAFE";
    bag.status = "AVAILABLE";         // Safe to transfuse
  }
  
  // 4. Save and log
  await bag.save();
  await logActivity("LAB_RESULT", `Lab result updated for ${bagId}`, {
    inventoryId: bagId,
    testStatus: bag.testStatus
  });
}
```

#### Quality Control Workflow

```
Blood Collected from Donor
    ↓
[HAPUARACHCHIGE] Creates Inventory Record
    - status: "AVAILABLE"
    - testStatus: "PENDING"
    - safetyFlag: "PENDING"
    ↓
Lab Technician Performs Tests
    ↓
[KALANCHIGE I.R] updateLabTest()
    ├→ Records HIV test result
    ├→ Records Hepatitis test result
    ├→ Records Malaria test result
    │
    ├→ IF ALL NEGATIVE:
    │   ├→ testStatus = "TESTED_SAFE"
    │   ├→ safetyFlag = "SAFE"
    │   └→ status = "AVAILABLE" ✓ (Can use for transfusion)
    │
    └→ IF ANY POSITIVE:
        ├→ testStatus = "TESTED_POSITIVE"
        ├→ safetyFlag = "BIO-HAZARD"
        └→ status = "DISCARD" ✗ (Must be destroyed)
    ↓
Result Available for Emergency Requests
    - If SAFE: Can be dispatched
    - If DISCARD: Cannot be used
```

---

### 6. **Blood Inventory & Stock Management**
**Developer:** Hapuarachchige K.S (IT24102336)  
**Collection:** `inventories`

#### Features
- Manage blood inventory stock levels
- Track inventory status (AVAILABLE, DISPATCHED, DISCARD, SAFE)
- Safety flagging status monitoring
- Low stock alert system
- Donor name tracking for traceability
- Support emergency request fulfillment

#### CRUD Operations

##### **CREATE - Add Blood to Inventory**
```javascript
// Controller: inventoryController.js - addInventory()
// Purpose: Register new blood bag in inventory
// Can be called manually OR automatically when appointment completed

POST /api/inventory

Body: {
  bloodType: String - REQUIRED,  // "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
  quantity: Number - REQUIRED,   // Units of blood (typically 1 per bag)
  donorName: String              // Name for traceability (optional)
}

Example Request:
{
  bloodType: "O+",
  quantity: 1,
  donorName: "John Doe"
}

Response: 201 CREATED
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  bloodType: "O+",
  quantity: 1,
  donorName: "John Doe",
  status: "AVAILABLE",           // Auto-set
  safetyFlag: "PENDING",         // Auto-set (awaiting lab test)
  testStatus: "PENDING",         // Auto-set
  labResults: [],
  collectedAt: "2026-03-26T10:30:00.000Z",
  createdAt: "2026-03-26T10:30:00.000Z",
  updatedAt: "2026-03-26T10:30:00.000Z"
}

Error Responses:
400 - "bloodType and quantity are required"
400 - "quantity must be a positive number"
```

##### **READ - Get All Inventory Stock**
```javascript
// Controller: inventoryController.js - getInventory()
// Purpose: View complete blood inventory across all blood types
// Shows current stock, status, and donor information
// Sorted by most recent collection first

GET /api/inventory

Response: 200 OK
[
  {
    id: ObjectId("507f1f77bcf86cd799439011"),
    bloodType: "O+",
    quantity: 1,
    donorName: "John Doe",
    status: "AVAILABLE",
    safetyFlag: "SAFE",          // Passed lab test
    testStatus: "TESTED_SAFE",   // Tested and approved
    collectedAt: "2026-03-26T10:30:00.000Z"
  },
  {
    id: ObjectId("507f1f77bcf86cd799439012"),
    bloodType: "O+",
    quantity: 2,
    donorName: "Jane Smith",
    status: "DISPATCHED",        // Sent to hospital
    safetyFlag: "SAFE",
    testStatus: "TESTED_SAFE",
    collectedAt: "2026-03-25T14:15:00.000Z"
  },
  {
    id: ObjectId("507f1f77bcf86cd799439013"),
    bloodType: "AB-",
    quantity: 1,
    donorName: "Ahmad Khan",
    status: "DISCARD",           // Failed lab test
    safetyFlag: "BIO-HAZARD",    // Unsafe
    testStatus: "TESTED_POSITIVE", // Positive result
    collectedAt: "2026-03-24T09:00:00.000Z"
  }
]

// Response is sorted by collectedAt (descending) - newest first
// All inventory items are returned regardless of status
```

##### **READ - Get Low Stock Alerts**
```javascript
// Controller: inventoryController.js - getLowStockAlerts()
// Purpose: Monitor critically low blood stock levels
// Shows blood types with less than or equal to 5 safe units
// Alerts prioritized by severity (CRITICAL <= 2, LOW <= 5)

GET /api/inventory/alerts/low-stock

Response: 200 OK
[
  {
    bloodType: "AB-",     // Rarest blood type
    units: 0,             // NO STOCK!
    level: "CRITICAL"     // URGENT - Order immediately
  },
  {
    bloodType: "AB+",
    units: 1,
    level: "CRITICAL"     // Still critically low
  },
  {
    bloodType: "B-",
    units: 3,
    level: "LOW"          // Low but not critical
  },
  {
    bloodType: "A-",
    units: 5,
    level: "LOW"
  }
]

// Notes:
// - Only includes blood types with <= 5 available units
// - Counts only SAFE inventory (safetyFlag: "SAFE")
// - Ignores DISCARD, DISPATCHED, and PENDING items
// - Includes ALL 8 blood types (even if 0 units)
// - Sorted by units ascending (lowest first = most urgent)

Response: 200 OK (No Low Stock)
[]  // Empty array if all blood types have > 5 units
```

##### **UPDATE - Inventory via Lab Testing**
```javascript
// Inventory status is updated by Kalanchige through lab testing
// See Kalanchige I.R section for updateLabTest()

// Lab test result determines:
PUT /api/inventory/:bagId/lab-test

Response changes:
// Test NEGATIVE:
status: "AVAILABLE"
safetyFlag: "SAFE"
testStatus: "TESTED_SAFE"

// Test POSITIVE:
status: "DISCARD"
safetyFlag: "BIO-HAZARD"
testStatus: "TESTED_POSITIVE"
```

##### **Indirect UPDATE - Inventory via Emergency Fulfillment**
```javascript
// Handled by Hansani W.G.H.H through fulfillRequest()
// See Emergency Request section

// When emergency request is fulfilled:
POST /api/emergency/requests/:requestId/fulfill

// For each matching blood bag:
quantity -= dispatchedAmount
status = "DISPATCHED"  // If quantity becomes 0

// Impact on inventory:
// - Safe blood bags are located
// - Quantity is reduced
// - Status changes to DISPATCHED
// - Emergency request tracking updated
```

#### Database Schema

```javascript
{
  bloodType: String - REQUIRED,
    // Valid values: "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
    // Critical for matching emergency requests
    // Can be used for filtering/aggregation

  quantity: Number (min: 0) - REQUIRED,
    // Units of blood available
    // Decreases when dispatched for emergency
    // Updated when appointment creates new record
    // 1 unit per collection typically

  donorName: String,
    // Name of donor for traceability
    // Links back to Appointment.donorName
    // Used for audit trail

  status: String (enum: "AVAILABLE", "DISPATCHED", "DISCARD", "SAFE") - default: "AVAILABLE",
    // AVAILABLE: Ready to be dispatched
    // DISPATCHED: Sent to hospital for emergency request
    // DISCARD: Failed lab test, must be destroyed
    // SAFE: Passed testing (same as AVAILABLE essentially)

  safetyFlag: String (enum: "SAFE", "BIO-HAZARD", "PENDING") - default: "PENDING",
    // SAFE: Passed all lab tests, safe for transfusion
    // BIO-HAZARD: Failed lab test, contaminated
    // PENDING: Awaiting lab test results

  testStatus: String (enum: "PENDING", "TESTED_SAFE", "TESTED_POSITIVE") - default: "PENDING",
    // PENDING: Lab test not yet performed
    // TESTED_SAFE: Lab test passed, all markers negative
    // TESTED_POSITIVE: Lab test failed, positive marker found

  labResults: [
    {
      hiv: Boolean,
      hep: Boolean,
      malaria: Boolean,
      reason: String,
      testedAt: Date
    }
  ],
    // Array of all lab test results performed on this bag
    // Empty until first test
    // Can have multiple entries if retested
    // Managed by Kalanchige I.R

  collectedAt: Date (default: Date.now()),
    // When blood was collected from donor
    // Used for sorting (oldest first = use first principle)

  createdAt: Date - Automatic,
  updatedAt: Date - Automatic
}
```

#### Stock Management Workflow

```
Appointment Completed
    ↓
[THARMITHAN] updateStatus(status: "Completed")
    ↓
[HAPUARACHCHIGE] AUTO - addInventory()
    ├→ Creates record with:
    ├─ bloodType: From appointment
    ├─ quantity: 1 (standard)
    ├─ donorName: From appointment
    ├─ status: "AVAILABLE"
    ├─ safetyFlag: "PENDING"
    └─ testStatus: "PENDING"
    ↓
Stock Enters Lab Testing Phase
    ↓
[KALANCHIGE I.R] updateLabTest()
    ├→ Test results received
    ├→ Updates labResults array
    ├→ Updates testStatus
    ├→ Updates safetyFlag
    └→ Updates status (AVAILABLE or DISCARD)
    ↓
Stock Available for Emergency Use
    ↓
[HAPUARACHCHIGE] Monitors via getInventory()
    ├→ Checks current levels
    ├→ Tracks SAFE & AVAILABLE items
    └→ Reports via getLowStockAlerts()
    ↓
Emergency Request Arrives
    ↓
[HANSANI] fulfillRequest()
    ├→ Searches inventory for blood type
    ├→ [HAPUARACHCHIGE] Inventory updated
    ├─ quantity decreased
    └─ status → "DISPATCHED"
    ↓
Low Stock Alert Triggered
    ↓
[HAPUARACHCHIGE] getLowStockAlerts()
    └→ Notifies need for more donations
```

#### Integration with Appointment System

```
Appointment Lifecycle:

1. Donor Books Appointment
   Status: "Scheduled"
   → [PEIRIS] Eligibility checked

2. Appointment Completed
   Status: "Completed"
   → [THARMITHAN] Updates status
   → [HAPUARACHCHIGE] Creates Inventory record
   → [PEIRIS] Updates Donor.lastDonationDate

3. Blood Tested
   → [KALANCHIGE] Lab results recorded
   → Inventory.status updated (AVAILABLE or DISCARD)

4. Emergency Need
   → [HANSANI] Searches for matching blood
   → [HAPUARACHCHIGE] Provides available stock
   → Inventory.status → DISPATCHED

5. Stock Low
   → [HAPUARACHCHIGE] Alerts triggered
   → Need for new donations created
   → Cycle repeats
```

---

## Supporting Collections

### 7. **User Authentication**
**Collection:** `users`  
**Purpose:** User accounts for all roles (ADMIN, DONOR, HOSPITAL, LAB)

#### CRUD Operations
```javascript
// CREATE - Register User
POST /api/auth/register
Body: { name, email, password, role }
Response: 201 - { user, token }

// READ - Get User Profile
GET /api/auth/profile
Response: 200 - User object (password excluded)

// UPDATE - Update User
PUT /api/users/:id
Body: { name, email }
Response: 200 - Updated User object

// DELETE - Delete User (ADMIN only)
DELETE /api/users/:id
Response: 200 - Success message
```

#### Schema
```javascript
{
  name: String - REQUIRED,
  email: String - REQUIRED, UNIQUE,
  password: String - REQUIRED (bcrypt hashed),
  role: String (enum: "ADMIN", "DONOR", "HOSPITAL", "LAB") - default: "DONOR",
  createdAt: Date,
  updatedAt: Date
}
```

---

### 8. **Hospital Management**
**Collection:** `hospitals`  
**Purpose:** Hospital information and locations

#### Schema
```javascript
{
  name: String - REQUIRED,
  province: String - REQUIRED,
  district: String - REQUIRED,
  address: String,
  contactNumber: String,
  image: String,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

---

### 9. **Hospital Requests**
**Collection:** `hospitalrequests`  
**Purpose:** Non-emergency blood requests from hospitals

#### Schema
```javascript
{
  hospitalUserId: ObjectId (ref: User),
  hospital: String,
  bloodType: String - REQUIRED,
  unitsRequested: Number (min: 1) - REQUIRED,
  unitsFulfilled: Number (default: 0),
  priority: String (enum: "NORMAL", "HIGH") - default: "NORMAL",
  reason: String,
  status: String (enum: "OPEN", "PARTIAL", "FULFILLED") - default: "OPEN",
  createdAt: Date,
  updatedAt: Date
}
```

---

### 10. **Activity Log**
**Collection:** `activitylogs`  
**Purpose:** Audit trail for system operations

#### Schema
```javascript
{
  action: String,
  description: String,
  details: Object,
  userId: ObjectId (ref: User),
  createdAt: Date
}
```

#### Logged Actions
- `APPOINTMENT_BOOKED` - When donor books appointment
- `APPOINTMENT_COMPLETED` - When appointment is completed
- `EMERGENCY_REQUEST` - When emergency request created
- `LAB_RESULT` - When lab results updated
- `SAFETY_STATUS_UPDATED` - When donor safety status changes
- And more...

---

## Database Relationships & Workflows

### Appointment Completion Flow
```
Appointment Created
    ↓
Status Updated to "Completed"
    ↓
    ├→ Create Inventory Record (bloodType, donorName)
    ├→ Update Donor.lastDonationDate
    ├→ Update Appointment in ActivityLog
    └→ Send Notification
```

### Emergency Request Fulfillment Flow
```
Emergency Request Created (CRITICAL urgency triggers broadcast)
    ↓
Search Inventory (bloodType, status AVAILABLE/SAFE)
    ↓
    ├→ Dispatch units (update Inventory quantity & status)
    ├→ Update EmergencyRequest.unitsFulfilled
    ├→ Change status to PARTIAL/FULFILLED
    ├→ Log activity
    └→ Update stock alerts
```

### Lab Testing & Quality Control Flow
```
Inventory Item Created
    ↓
Lab Test Performed (updateLabTest)
    ↓
    ├→ If positive test: Set status = "DISCARD", safetyFlag = "BIO-HAZARD"
    ├→ If all negative: Set status = "AVAILABLE", safetyFlag = "SAFE"
    ├→ Update testStatus (TESTED_SAFE / TESTED_POSITIVE)
    ├→ Log activity
    └→ Update Donor.safetyStatus if needed
```

### Camp Interest Tracking
```
Camp Created with status "UPCOMING"
    ↓
Donors mark interest (markInterest)
    ↓
interestedCount accumulates
    ↓
Camp status changes to "ONGOING" → "ENDED"
```

---

## API Base Routes

```
/api/appointments      - Appointment management
/api/emergency         - Emergency requests
/api/donors            - Donor profiles & eligibility
/api/camps             - Camp management
/api/inventory         - Blood inventory
/api/hospitals         - Hospital information
/api/auth              - Authentication
/api/admin             - Admin operations
```

---

## Common CRUD Operations Summary

| Collection | Create | Read | Update | Delete | Developer |
|---|---|---|---|---|---|
| appointments | ✓ | ✓ | ✓ | ✓ | Tharmithan S. |
| emergencyrequests | ✓ | ✓ | ✓ | ✗ | Hansani W.G.H.H |
| donors | ✓ | ✓ | ✓ | ✗ | Peiris A.M.A.B |
| camps | ✓ | ✓ | ✓ | ✓ | Nimneth P.B.Y |
| inventories | ✓ | ✓ | ✓ | ✗ | Kalanchige I.R, Hapuarachchige K.S |
| hospitals | ✓ | ✓ | ✓ | ✓ | Admin |
| users | ✓ | ✓ | ✓ | ✓ | Admin |

---

## Important Notes

1. **Data Validation**: All required fields are enforced at model level with Mongoose validators
2. **Activity Logging**: Major operations are logged for audit trail via `logActivity()` utility
3. **Error Handling**: Centralized error middleware handles all exceptions
4. **Async Operations**: All controller methods use `asyncHandler` for consistent error handling
5. **Relationships**: MongoDB references (ObjectId) maintain relationships between collections
6. **Timestamps**: All collections have `createdAt` and `updatedAt` timestamps
7. **Soft Deletes**: Some records are status-updated rather than physically deleted

---

## Database Initialization

See `scripts/validateDB.js` for database validation and `scripts/seed.js` for test data initialization.

---

**Last Updated:** March 26, 2026  
**Version:** 1.0
