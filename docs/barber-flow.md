# Barber Flow - Smoke Tests

## Barber/Staff Member Appointment & Service Management Flows

### 1. **Accept Barbershop Invitation Flow**
- [ ] Receive invitation email/link with invitation code
- [ ] Navigate to invitation page (`/invitations/:code`)
- [ ] View barbershop details and invitation information
- [ ] Accept invitation to join barbershop as barber
- [ ] Successfully join barbershop with "barber" role

### 2. **View Dashboard/Appointments**
- [ ] Navigate to profile page (`/profile`)
- [ ] Click on "Appointments" tab under barbershop section
- [ ] View all appointments for the barbershop
- [ ] See appointments with status (pending, confirmed, completed, etc.)
- [ ] See appointment details (customer, service, time, barber)

### 3. **Confirm Appointment Flow**
- [ ] Open a pending appointment
- [ ] Click "Confirm" button
- [ ] Confirm appointment action
- [ ] See appointment status change to "confirmed"

### 4. **Mark Appointment as Completed Flow**
- [ ] Open a confirmed/ongoing appointment
- [ ] Click "Mark as Completed" button
- [ ] Optionally add completion notes
- [ ] Confirm marking as completed
- [ ] See appointment status change to "completed"

### 5. **Mark Appointment as No-Show Flow**
- [ ] Open an appointment that customer missed
- [ ] Click "Mark as No-Show" button
- [ ] Confirm no-show status
- [ ] See appointment status change to "no-show"

### 6. **Cancel Appointment Flow**
- [ ] Open an appointment (pending or confirmed)
- [ ] Click "Cancel" button
- [ ] Optionally enter cancellation reason
- [ ] Confirm cancellation
- [ ] See appointment status change to "cancelled"

### 7. **Respond to Reschedule Request Flow**
- [ ] View appointment with reschedule request from customer
- [ ] See customer's requested date/time
- [ ] Option A: Accept reschedule
  - [ ] Click "Accept Reschedule"
  - [ ] See appointment updated with new date/time
  - [ ] Customer notification sent
- [ ] Option B: Propose different date/time
  - [ ] Click "Propose New Date"
  - [ ] Select alternative date/time
  - [ ] Add optional message
  - [ ] Submit proposal
  - [ ] Wait for customer response

### 8. **Create Service Flow**
- [ ] Navigate to barbershop services page
- [ ] Click "Create Service" or "Add Service" button
- [ ] Enter service name
- [ ] Enter service price (in local currency)
- [ ] Enter service duration (in minutes)
- [ ] Save service
- [ ] See service added to available services list

### 9. **Edit Service Flow**
- [ ] Navigate to barbershop services page
- [ ] Click edit icon on a service
- [ ] Update service name, price, or duration
- [ ] Save changes
- [ ] See service information updated

### 10. **Delete Service Flow**
- [ ] Navigate to barbershop services page
- [ ] Click delete/trash icon on a service
- [ ] Confirm deletion
- [ ] See service removed from services list

### 11. **Manage Personal Services Flow**
- [ ] Navigate to barbershop services page
- [ ] View all services offered at the barbershop
- [ ] Select which services the barber offers
- [ ] Activate/deactivate services for personal profile
- [ ] See updated service list

### 12. **View Monthly Schedule/Statistics**
- [ ] View appointment calendar for the month
- [ ] See completed appointments count
- [ ] View upcoming appointments
- [ ] See time slots availability

### 13. **Update Availability Flow**
- [ ] Navigate to barbershop settings (as owner/barber with permissions)
- [ ] Go to Availability section
- [ ] Set working days and hours for each day
- [ ] Set lunch break times (optional)
- [ ] Save availability settings
- [ ] Confirm changes apply to appointment booking

### 14. **View Completed Appointments History**
- [ ] Navigate to appointments section
- [ ] Filter by "Completed" status
- [ ] View all completed appointments
- [ ] See customer details and service provided

### 15. **Manage Barbershop Members/Barbers**
- [ ] Navigate to barbershop settings (if owner)
- [ ] View all current members/barbers
- [ ] See member roles and status
- [ ] Invite new barber or remove existing member
