# Customer Flow - Smoke Tests

## Customer/End-User Appointment & Discovery Flows

### 1. **Browse Barbershops Flow**

- Navigate to barbershops listing page (`/barbershops`)
- View available barbershops with grid/list layout
- Search barbershops by name using search bar
- Filter by city/state location
- View barbershop preview (name, address, rating)
- See number of reviews and average rating
- Pagination works when many barbershops exist
- Loading state shows while fetching
- No barbershops message when none exist

### 2. **View Barbershop Details**

- Navigate to specific barbershop page (`/barbershops/:uuid`)
- View barbershop header with banner image
- View barbershop name and full address
- View contact phone number
- View barbershop description
- View business hours for each day
- View lunch break times (if configured)
- View all available services with prices and durations
- View all barbers working at the barbershop
- View each barber's name and assigned services
- View social media links (Instagram, Facebook, TikTok, Twitter, YouTube)
- View website link (if available)
- View all customer reviews and ratings
- See review breakdown by stars
- See average rating

### 3. **Create Appointment Flow (Unauthenticated)**

- Navigate to create appointment page (`/appointments/create`)
- If not logged in, prompted to login or signup
- Login/signup with email and password
- Return to create appointment flow
- Continue with authenticated flow

### 4. **Create Appointment Flow (Authenticated)**

- Navigate to create appointment page (`/appointments/create`)
- **Step 1: Select Barbershop**
  - Choose from list or search barbershop
  - View selected barbershop details
  - Can change selection
- **Step 2: Select Barber**
  - View all available barbers at selected barbershop
  - See barber name and services offered
  - Select barber
  - Can change selection
- **Step 3: Select Service**
  - View services offered by selected barber
  - See service name, price, and duration
  - Select service
  - Can change selection
- **Step 4: Choose Date & Time**
  - Calendar view shows available dates
  - Unavailable dates are grayed out
  - Click date to see available time slots
  - Available times respect:
    - Barbershop opening hours
    - Barbershop closing hours
    - Lunch break times
    - Grace period between appointments
    - Service duration
  - Select available time slot
  - Can change date/time
- **Step 5: Enter Customer Info**
  - Enter customer name (pre-filled with profile name if available)
  - Enter contact phone (pre-filled if available)
  - Enter contact email (optional)
  - Add appointment notes (optional)
  - View appointment summary
- **Confirmation:**
  - Successfully create appointment
  - See confirmation message
  - View appointment details (barber, service, date, time, location)
  - Receive confirmation email
  - Receive confirmation SMS (if SMS enabled and phone provided)

### 5. **Create Appointment - Error Scenarios**

- **Validation Errors:**
  - Empty customer name — see error
  - Invalid phone number — see error
  - Invalid email format — see error
- **Availability Errors:**
  - Selected time no longer available — see error
  - Date in the past — disabled/error
  - Barbershop is closed on selected date — see error
- **Business Rule Errors:**
  - Appointment would overlap with lunch break — see error
  - Service duration doesn't fit before closing — see error

### 6. **View My Appointments**

- Navigate to profile page (`/profile`)
- Click on "Appointments" tab
- View list of all personal appointments
- See appointment status (pending, confirmed, completed, cancelled, rescheduled, no-show)
- See appointment details (barbershop, barber, service, date, time)
- Filter/sort appointments by status
- Separate upcoming and past appointments (tabs or visual indicator)
- Click on appointment to view full details

### 7. **View Appointment Details**

- Click on an appointment to expand/view details
- See full appointment information:
  - Barbershop name and address
  - Barber name
  - Service name and price
  - Date and time
  - Appointment status
  - Notes (if any)
  - Grace period information
- See available actions based on status:
  - Pending appointment: Cancel, Request Reschedule
  - Confirmed appointment: Cancel, Request Reschedule
  - Cancelled appointment: No actions
  - Completed appointment: Leave Review (if not reviewed)
  - Rescheduled appointment: View new date/time, Accept/Decline reschedule

### 8. **Cancel Appointment Flow**

- Open an appointment (pending or confirmed)
- Click "Cancel Appointment" button
- Confirmation dialog appears asking to confirm
- See cancellation reason (optional)
- Confirm cancellation
- Appointment status changes to "cancelled"
- Receive cancellation confirmation email
- Receive cancellation SMS (if SMS enabled)
- Cannot cancel already cancelled appointment

### 9. **Request Appointment Reschedule Flow**

- Open an upcoming appointment (pending or confirmed)
- Click "Request Reschedule" button
- See reschedule request form
- **Select New Date & Time:**
  - Calendar shows available dates
  - Select new date
  - Select new time
  - Available times respect barbershop hours and schedule
  - Time must be at least X hours in future (if configured)
- **Add Optional Notes:**
  - Enter reason for reschedule (optional)
  - Add message to barber (optional)
- **Submit Request:**
  - Submit reschedule request
  - See "Reschedule Requested" status
  - Receive email confirmation of request sent
  - Barber receives notification of reschedule request

### 10. **Respond to Reschedule Response Flow**

- View appointment with pending reschedule response
- If barber **approved reschedule:**
  - See new date/time in appointment
  - Button to accept reschedule proposal
  - Click "Accept" to confirm new time
  - Appointment updated with new date/time
  - Receive confirmation of accepted reschedule
  - Original appointment slot becomes available
- If barber **proposed different time:**
  - See proposed new date/time
  - Button to accept proposal
  - Button to decline and request new time
  - Accept: appointment updated to proposed time
  - Decline: reschedule flow restarts

### 11. **Leave Review Flow**

- Navigate to profile page (`/profile`)
- View completed appointments
- Find appointment without review
- Click "Leave Review" button
- **Review Form:**
  - Select rating (1-5 stars)
  - Enter optional review comment
  - Confirm review submission
- **After Submission:**
  - See "Review Posted" confirmation
  - Review appears on barbershop profile
  - Review visible in customer's profile

### 12. **View Barbershop Reviews**

- Navigate to barbershop detail page (`/barbershops/:uuid`)
- Scroll to reviews section
- See all customer reviews with:
  - Customer name/anonymous
  - Star rating (1-5)
  - Review comment
  - Review date
- See rating breakdown (count by stars)
- See average rating
- See total number of reviews
- Reviews sorted by most recent
- Pagination if many reviews

### 13. **Account Settings & Preferences**

- Navigate to profile page (`/profile`)
- Click on "Account" tab
- **View Profile Information:**
  - See email address
  - See name
  - See phone number
- **Update Information:**
  - Edit name
  - Edit phone number
  - Cannot change email (or requires verification)
  - Save changes
- **Notification Preferences:**
  - Toggle email notifications on/off
  - Toggle SMS notifications on/off
  - Save preferences
- **Subscription Status:**
  - See current subscription status (Free tier)
  - See "Upgrade" CTA if applicable

### 14. **Notification Scenarios**

- **Appointment Created Email:**
  - Sent immediately after booking
  - Contains: barber name, service, date, time, location
  - Includes link to appointment details
- **Appointment Confirmed Email:**
  - Sent when barber confirms appointment
  - Contains updated status
- **Reschedule Request Email:**
  - Sent when barber proposes new time
  - Contains original and proposed times
  - Includes accept/decline links
- **Cancellation Email:**
  - Sent when appointment is cancelled
  - Contains reason (if provided)
- **Reminder Emails:**
  - Pre-appointment reminder (24 hours before?)
  - Post-appointment reminder (for review)
- **SMS Notifications:**
  - Same scenarios as email
  - Sent only if SMS notifications enabled
  - Sent only if phone number provided

### 15. **Search & Discovery**

- **Search by Barbershop Name:**
  - Type barbershop name in search
  - See matching results
  - Search is case-insensitive
  - Search shows partial matches
- **Search by Location:**
  - Filter by city
  - Filter by state
  - Combined filters work together
- **Sort & Filter:**
  - Sort by rating
  - Sort by most recent
  - Filter by distance (if location enabled)

### 16. **Edge Cases & Error Handling**

- **No Availability:**
  - Barbershop fully booked — see "No Available Times" message
  - Barber fully booked — see "Barber Not Available" message
- **Inactive Barbershop:**
  - Cannot create appointment at inactive barbershop
  - See "This barbershop is currently unavailable" message
- **Deleted Appointment:**
  - Cannot view deleted appointment
  - See "Appointment not found" message
- **Expired Reschedule Request:**
  - Reschedule expires after X days
  - Cannot respond to expired request
  - See "Request has expired" message

