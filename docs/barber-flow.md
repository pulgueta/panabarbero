# Barber Flow - Smoke Tests

## Barber/Staff Member Appointment & Service Management Flows

### 1. **Accept Barbershop Invitation Flow**
- [ ] Receive invitation email with unique code
- [ ] Click invitation link or copy code
- [ ] Navigate to invitation page (`/invitations/:code`)
- [ ] See barbershop details in invitation
- [ ] See invitation status (valid/expired/already accepted)
- [ ] See roles being offered (barber)
- [ ] **Accept Invitation:**
  - [ ] Click "Accept Invitation" button
  - [ ] Confirm acceptance
  - [ ] Account linked to barbershop
  - [ ] Assigned "barber" role
  - [ ] Invitation status changes to "accepted"
  - [ ] Redirect to barbershop dashboard
- [ ] **Decline Invitation:**
  - [ ] Click "Decline" button
  - [ ] Confirm decline
  - [ ] Invitation status changes to "denied"
  - [ ] Cannot use invitation link again

### 2. **Join Barbershop as Barber**
- [ ] After accepting invitation
- [ ] Barbershop appears in profile under "My Barbershops"
- [ ] Can access barbershop management pages
- [ ] See barbershop name and address
- [ ] Can view appointments, services, availability

### 3. **View Barbershop Appointments Dashboard**
- [ ] Navigate to profile page (`/profile`)
- [ ] Click on barbershop name
- [ ] Go to "Appointments" tab
- [ ] View calendar view of appointments
- [ ] View all appointments with statuses:
  - [ ] Pending (awaiting barber confirmation)
  - [ ] Confirmed (appointment confirmed)
  - [ ] Completed (appointment finished)
  - [ ] Cancelled (cancelled by customer or barber)
  - [ ] No-show (customer didn't show)
  - [ ] Rescheduled (appointment rescheduled)
- [ ] Filter appointments by:
  - [ ] Status
  - [ ] Date range
  - [ ] Barber (if multiple)
- [ ] Sort by:
  - [ ] Date ascending/descending
  - [ ] Status
  - [ ] Most recent

### 4. **View Appointment Details**
- [ ] Click on appointment in calendar or list
- [ ] See full appointment details:
  - [ ] Customer name
  - [ ] Contact phone and email
  - [ ] Service name and price
  - [ ] Service duration
  - [ ] Scheduled date and time
  - [ ] Appointment status
  - [ ] Appointment notes (if any)
  - [ ] Grace period time
  - [ ] Barber assigned
- [ ] See action buttons based on status

### 5. **Confirm Appointment Flow**
- [ ] Open a pending appointment
- [ ] Click "Confirm Appointment" button
- [ ] **Confirmation Dialog:**
  - [ ] Confirm details are correct
  - [ ] Confirm button to proceed
  - [ ] Cancel button to cancel dialog
- [ ] **After Confirmation:**
  - [ ] Appointment status changes to "confirmed"
  - [ ] Customer receives confirmation email
  - [ ] Customer receives confirmation SMS (if enabled)
  - [ ] Confirmation timestamp recorded
  - [ ] Cannot confirm already confirmed appointment

### 6. **Mark Appointment as Completed Flow**
- [ ] Open a confirmed appointment (that is current or in past)
- [ ] Click "Mark as Completed" button
- [ ] **Completion Dialog:**
  - [ ] Confirm appointment was completed
  - [ ] Option to add completion notes (optional)
  - [ ] Confirm button
- [ ] **After Marking Complete:**
  - [ ] Appointment status changes to "completed"
  - [ ] Timestamp recorded
  - [ ] Customer can now leave review (if not already reviewed)
  - [ ] Appointment counted toward barbershop statistics
  - [ ] Notification sent to customer (optional)

### 7. **Mark Appointment as No-Show Flow**
- [ ] Open an appointment that customer missed
- [ ] Click "Mark as No-Show" button
- [ ] **No-Show Dialog:**
  - [ ] Confirm customer didn't appear
  - [ ] Option to add notes (optional)
  - [ ] Confirm button
- [ ] **After Marking No-Show:**
  - [ ] Appointment status changes to "no-show"
  - [ ] Timestamp recorded
  - [ ] Customer receives notification (email/SMS)
  - [ ] Time slot becomes available again
  - [ ] Does not count as completed appointment
  - [ ] Affects barbershop metrics

### 8. **Cancel Appointment Flow**
- [ ] Open an appointment (any status except completed/cancelled)
- [ ] Click "Cancel Appointment" button
- [ ] **Cancel Dialog:**
  - [ ] Confirm cancellation
  - [ ] Enter optional cancellation reason
  - [ ] Select who initiated cancellation (barber)
  - [ ] Confirm button
- [ ] **After Cancellation:**
  - [ ] Appointment status changes to "cancelled"
  - [ ] Original time slot becomes available
  - [ ] Customer receives cancellation notification
  - [ ] Cancellation reason stored
  - [ ] Cannot cancel already cancelled appointment

### 9. **Respond to Customer Reschedule Request Flow**
- [ ] View appointment with reschedule request from customer
- [ ] See customer's requested new date/time
- [ ] See customer's optional message
- [ ] **Option A: Accept Reschedule Request**
  - [ ] Click "Accept Reschedule" button
  - [ ] Appointment updated with customer's requested time
  - [ ] Old time slot becomes available
  - [ ] Customer receives acceptance notification
  - [ ] Cannot accept if proposed time is unavailable
- [ ] **Option B: Propose Different Date/Time**
  - [ ] Click "Propose New Time" button
  - [ ] **Reschedule Proposal Form:**
    - [ ] Select alternative date
    - [ ] Select alternative time
    - [ ] Available times respect business hours
    - [ ] Available times respect other appointments
    - [ ] Add optional message to customer
    - [ ] Confirm proposal
  - [ ] **After Proposal:**
    - [ ] Customer receives proposal notification
    - [ ] Appointment status shows "reschedule pending"
    - [ ] Customer can accept or propose again
- [ ] **Option C: Deny Reschedule Request**
  - [ ] Click "Deny" button
  - [ ] Add optional reason
  - [ ] Customer receives denial notification
  - [ ] Appointment stays at original time

### 10. **Create Service Flow**
- [ ] Navigate to barbershop "Services" tab
- [ ] Click "Create Service" or "Add Service" button
- [ ] **Service Creation Form:**
  - [ ] Enter service name (required)
  - [ ] Enter service price (required, minimum $1,000 CO)
  - [ ] Enter service duration in minutes (required, 5-480 min)
  - [ ] Add service description (optional)
- [ ] **Validation:**
  - [ ] Price validation (minimum amount)
  - [ ] Duration validation (5-480 minutes)
  - [ ] Name validation (not empty)
- [ ] **After Creation:**
  - [ ] Service appears in barbershop services list
  - [ ] Service available for appointments
  - [ ] Service shows barbers who offer it
  - [ ] Cannot create duplicate service name (or allowed?)

### 11. **Edit Service Flow**
- [ ] Navigate to barbershop "Services" tab
- [ ] Click edit icon/button on a service
- [ ] **Service Edit Form:**
  - [ ] Update service name
  - [ ] Update service price
  - [ ] Update service duration
  - [ ] Update description (if applicable)
- [ ] **Save Changes:**
  - [ ] Click "Save" button
  - [ ] Confirm changes
- [ ] **After Update:**
  - [ ] Service information updated
  - [ ] Changes apply to new appointments only
  - [ ] Existing appointments keep original service details
  - [ ] Cannot make price $0 or negative

### 12. **Delete Service Flow**
- [ ] Navigate to barbershop "Services" tab
- [ ] Click delete/trash icon on a service
- [ ] **Delete Confirmation:**
  - [ ] Confirm deletion
  - [ ] See warning if service has upcoming appointments
  - [ ] Option to cancel deletion
  - [ ] Confirm delete button
- [ ] **After Deletion:**
  - [ ] Service removed from list
  - [ ] Service no longer available for new appointments
  - [ ] Existing appointments not affected

### 13. **Manage Personal Services Assignment**
- [ ] Navigate to barbershop "Services" tab or profile section
- [ ] See all services offered at barbershop
- [ ] See which services barber offers
- [ ] **Add Service to Profile:**
  - [ ] Check checkbox next to service
  - [ ] Service added to barber's available services
  - [ ] Can now accept appointments for this service
- [ ] **Remove Service from Profile:**
  - [ ] Uncheck checkbox next to service
  - [ ] Service removed from barber's available services
  - [ ] Cannot create new appointments for this service
  - [ ] Existing appointments stay assigned

### 14. **View Schedule & Availability**
- [ ] Navigate to appointments calendar
- [ ] View monthly or weekly calendar view
- [ ] See all appointments color-coded by status
- [ ] See time slots availability
- [ ] See grace period between appointments
- [ ] View working hours and lunch breaks
- [ ] See multiple views:
  - [ ] Day view
  - [ ] Week view
  - [ ] Month view

### 15. **View Barbershop Availability Settings**
- [ ] Navigate to barbershop "Settings" tab
- [ ] View "Availability" section
- [ ] See business hours for each day:
  - [ ] Monday-Sunday
  - [ ] Open time
  - [ ] Close time
  - [ ] Lunch break start/end (if set)
  - [ ] Is day active/open
- [ ] View grace period between appointments
- [ ] See how availability affects appointment booking

### 16. **View Monthly Statistics**
- [ ] Navigate to barbershop dashboard
- [ ] See appointments count for current month
- [ ] See completed appointments count
- [ ] See cancelled/no-show appointments
- [ ] See revenue information (if applicable)
- [ ] View customer count
- [ ] View rating and review count

### 17. **View Completed Appointments History**
- [ ] Navigate to appointments tab
- [ ] Filter by "Completed" status
- [ ] View all completed appointments in list or table
- [ ] See customer details for each appointment:
  - [ ] Customer name
  - [ ] Service provided
  - [ ] Date and time
  - [ ] Price
  - [ ] Review (if customer left one)
- [ ] Pagination if many completed appointments

### 18. **Manage Barbershop Members/Barbers (if owner)**
- [ ] Navigate to barbershop "Barbers" tab (if owner)
- [ ] View all current members/barbers
- [ ] See member:
  - [ ] Name
  - [ ] Email
  - [ ] Phone
  - [ ] Roles (owner/barber)
  - [ ] Status (active/inactive)
- [ ] **Invite New Barber:**
  - [ ] Click "Invite Barber" button
  - [ ] Enter email address
  - [ ] Enter phone number
  - [ ] Select roles
  - [ ] Send invitation
  - [ ] See "Invitation Sent" confirmation
- [ ] **Manage Existing Members:**
  - [ ] Remove/deactivate barber
  - [ ] View barber details
  - [ ] Change barber's roles (if applicable)
  - [ ] See invitation expiry status

### 19. **Receive Appointment Notifications**
- [ ] **New Appointment Created:**
  - [ ] Receive email notification
  - [ ] Receive SMS notification (if enabled)
  - [ ] Contains: customer name, service, date, time
  - [ ] Shows "Pending Confirmation" status
- [ ] **Reschedule Request:**
  - [ ] Receive email notification
  - [ ] Contains: original time, proposed time, customer message
  - [ ] Contains action buttons (Accept/Propose/Deny)
- [ ] **Customer Updates:**
  - [ ] Notification when customer cancels appointment
  - [ ] Notification when customer confirms reschedule

### 20. **Edge Cases & Error Handling**
- [ ] **Expired Invitation:**
  - [ ] Cannot accept expired invitation
  - [ ] See "Invitation Expired" message
  - [ ] Owner needs to send new invitation
- [ ] **Inactive Barbershop:**
  - [ ] Cannot create appointments for inactive barbershop
  - [ ] See "Barbershop is inactive" message
- [ ] **Double Booking:**
  - [ ] Cannot create appointment at overlapping time
  - [ ] System shows "This time is already booked"
- [ ] **Invalid Time Selection:**
  - [ ] Cannot propose time outside business hours
  - [ ] Cannot propose time during lunch break
  - [ ] Cannot propose time in the past
- [ ] **Service Duration Conflict:**
  - [ ] Cannot create appointment if service duration exceeds available time
  - [ ] See "Service duration too long for this time slot" message
- [ ] **Plan Limits:**
  - [ ] Cannot create staff appointments on free plan
  - [ ] See "Upgrade required" message on free tier
