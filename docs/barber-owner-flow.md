# Barber Owner Flow - Smoke Tests

## Barbershop Owner/Manager Business & Administrative Flows

### 1. **Create Barbershop Flow**
- [ ] Navigate to profile or create barbershop page
- [ ] Click "Create Barbershop" button
- [ ] Enter barbershop name
- [ ] Enter description (optional)
- [ ] Enter full address and address details
- [ ] Enter city, state, and zip code
- [ ] Enter coordinates/map location (optional)
- [ ] Enter contact phone number
- [ ] Set default grace period (minutes) for appointments
- [ ] Upload banner image (optional)
- [ ] Save barbershop
- [ ] Successfully create barbershop with "owner" role

### 2. **Access Barbershop Management**
- [ ] Navigate to profile page (`/profile`)
- [ ] Click on barbershop name under "Barbershops" section
- [ ] View barbershop dashboard
- [ ] See tabs: Appointments, Barbers, Services, Settings

### 3. **Update General Barbershop Info**
- [ ] Navigate to barbershop settings
- [ ] Go to "General Information" tab/section
- [ ] Update barbershop name
- [ ] Update description
- [ ] Update banner image
- [ ] Save changes
- [ ] Confirm changes reflected in barbershop details

### 4. **Update Address & Location**
- [ ] Navigate to barbershop settings
- [ ] Go to "Address" section
- [ ] Update full address and address details
- [ ] Update city, state, zip code
- [ ] Update coordinates/map location
- [ ] Save location changes
- [ ] Confirm location updates on barbershop detail page

### 5. **Update Contact Information**
- [ ] Navigate to barbershop settings
- [ ] Go to "Contact" section
- [ ] Update phone number
- [ ] Update email address
- [ ] Save contact changes

### 6. **Set Availability Hours**
- [ ] Navigate to barbershop settings
- [ ] Go to "Availability" section
- [ ] For each day of week:
  - [ ] Set if day is active/open
  - [ ] Set opening time
  - [ ] Set closing time
  - [ ] Set lunch break start time (optional)
  - [ ] Set lunch break end time (optional)
- [ ] Save availability settings
- [ ] Confirm availability affects appointment booking

### 7. **Manage Social Media Links**
- [ ] Navigate to barbershop settings
- [ ] Go to "Social Media" section
- [ ] Add/update links for:
  - [ ] TikTok
  - [ ] Instagram
  - [ ] Facebook
  - [ ] Twitter/X
  - [ ] YouTube
- [ ] Save social media links
- [ ] Confirm links appear on barbershop profile

### 8. **Set Preferences & Business Rules**
- [ ] Navigate to barbershop settings
- [ ] Go to "Preferences" section
- [ ] Set grace period minutes for appointments
- [ ] Configure other business preferences
- [ ] Save preference settings

### 9. **Invite Barber/Staff Member**
- [ ] Navigate to barbershop management
- [ ] Go to "Barbers" tab
- [ ] Click "Invite Barber" or "Add Staff" button
- [ ] Enter barber email address
- [ ] Enter barber phone number
- [ ] Select roles (barber)
- [ ] Send invitation
- [ ] Barber receives invitation email
- [ ] See invitation status as "pending"

### 10. **Manage Barber Memberships**
- [ ] Navigate to barbershop "Barbers" tab
- [ ] View list of all current barbers/staff
- [ ] See barber name, email, phone, roles, and status
- [ ] Option to remove/deactivate barber
- [ ] Deactivate barber membership
- [ ] See member status changed to inactive

### 11. **Create Service**
- [ ] Navigate to barbershop "Services" tab
- [ ] Click "Add Service" button
- [ ] Enter service name
- [ ] Enter service price (minimum: $1,000)
- [ ] Enter service duration (5-480 minutes)
- [ ] Save service
- [ ] See service appear in services list
- [ ] Service available for appointments

### 12. **Edit Service**
- [ ] Navigate to barbershop "Services" tab
- [ ] Click edit icon on a service
- [ ] Update service name, price, or duration
- [ ] Save changes
- [ ] Confirm updated information reflected

### 13. **Delete Service**
- [ ] Navigate to barbershop "Services" tab
- [ ] Click delete/trash icon on a service
- [ ] Confirm deletion
- [ ] See service removed from list

### 14. **Manage Barber Services**
- [ ] Navigate to barber management
- [ ] Click on a barber to view their profile
- [ ] See services dialog/modal
- [ ] Select/deselect services that barber offers
- [ ] Save barber's service assignments
- [ ] Confirm barber can only book appointments for assigned services

### 15. **View All Appointments**
- [ ] Navigate to barbershop "Appointments" tab
- [ ] View appointments in calendar or table format
- [ ] See all appointments (pending, confirmed, completed, cancelled, etc.)
- [ ] Filter appointments by:
  - [ ] Status
  - [ ] Barber
  - [ ] Date range
- [ ] Click on appointment to see details

### 16. **Manage Individual Appointments**
- [ ] Open an appointment from the list
- [ ] View appointment details (customer, service, barber, time)
- [ ] Confirm pending appointment
- [ ] Mark appointment as completed/no-show/cancelled
- [ ] Respond to reschedule requests
- [ ] Add or update appointment notes
- [ ] See customer contact information

### 17. **Handle Appointment Reschedule Requests**
- [ ] View appointment with customer reschedule request
- [ ] See customer's proposed date/time and notes
- [ ] Option A: Accept reschedule
  - [ ] Click "Accept"
  - [ ] Appointment updated with new time
- [ ] Option B: Propose different time
  - [ ] Click "Propose New Time"
  - [ ] Select alternative date/time
  - [ ] Add optional message
  - [ ] Submit proposal
  - [ ] Wait for customer response

### 18. **View Business Metrics & Analytics**
- [ ] Navigate to dashboard/statistics section
- [ ] View total appointments (this month/year)
- [ ] View completed appointments count
- [ ] View barber performance metrics
- [ ] View revenue metrics (if applicable)
- [ ] See rating and review count

### 19. **View Customer Reviews**
- [ ] Navigate to barbershop profile or reviews section
- [ ] See all customer reviews
- [ ] View ratings breakdown
- [ ] See average rating
- [ ] View review comments and dates

### 20. **Manage Barbershop Activation**
- [ ] Navigate to barbershop settings
- [ ] View barbershop active status
- [ ] Option to deactivate/activate barbershop
- [ ] Deactivated barbershops not visible to customers

### 21. **Monitor SMS Usage**
- [ ] Navigate to barbershop settings or billing section
- [ ] View SMS sent this month
- [ ] See SMS usage statistics
- [ ] Monitor costs/quotas (if applicable)

### 22. **Update Website & Additional Info**
- [ ] Navigate to barbershop metadata settings
- [ ] Enter/update website URL
- [ ] Update contact email
- [ ] Manage additional business information
- [ ] Save metadata changes

### 23. **View Barbershop Profile**
- [ ] Navigate to barbershop detail page (as customer would see)
- [ ] Verify all information is correct and up-to-date
- [ ] See barbershop hours, services, barbers, reviews
- [ ] Confirm customer view matches owner's settings
