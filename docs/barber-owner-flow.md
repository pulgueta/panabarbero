# Barber Owner Flow - Smoke Tests

## Barbershop Owner/Manager Business & Administrative Flows

### 1. **Create Barbershop Flow**
- [ ] Navigate to profile or create barbershop page
- [ ] Click "Create New Barbershop" button
- [ ] **Step 1: Basic Information**
  - [ ] Enter barbershop name (required)
  - [ ] Enter description (optional)
  - [ ] Upload banner image (optional)
- [ ] **Step 2: Location Information**
  - [ ] Enter full street address (required)
  - [ ] Enter additional address details (optional)
  - [ ] Enter city (required)
  - [ ] Enter state (required)
  - [ ] Enter zip code (optional)
  - [ ] Set coordinates/map location (optional)
- [ ] **Step 3: Contact Information**
  - [ ] Enter contact phone number (required)
  - [ ] Enter website URL (optional)
  - [ ] Enter contact email (optional)
- [ ] **Step 4: Business Rules**
  - [ ] Set default grace period in minutes (optional, default 5)
- [ ] **Review & Create:**
  - [ ] Review all information
  - [ ] Create barbershop
- [ ] **After Creation:**
  - [ ] Barbershop appears in profile
  - [ ] Owner assigned "owner" role
  - [ ] Barbershop is marked as "active"
  - [ ] Default to free plan
  - [ ] Redirect to barbershop dashboard

### 2. **Access Barbershop Management**
- [ ] Navigate to profile page (`/profile`)
- [ ] See all owned/managed barbershops under "My Barbershops"
- [ ] Click on barbershop name
- [ ] Navigate to barbershop dashboard
- [ ] See tabs: Appointments, Barbers, Services, Settings
- [ ] See barbershop status (Active/Inactive)
- [ ] See quick stats (appointments this month, completed, rating)

### 3. **Update General Barbershop Information**
- [ ] Navigate to barbershop → Settings tab
- [ ] Go to "General Information" section
- [ ] **Edit Information:**
  - [ ] Update barbershop name
  - [ ] Update description
  - [ ] Update or change banner image
  - [ ] Delete current banner image
- [ ] **Validation:**
  - [ ] Name cannot be empty
  - [ ] Name must be unique (or allowed duplicates?)
  - [ ] Image must be valid format/size
- [ ] **Save Changes:**
  - [ ] Click "Save Changes" button
  - [ ] See confirmation message
  - [ ] Changes reflected immediately on barbershop profile page

### 4. **Update Address & Location Information**
- [ ] Navigate to barbershop → Settings tab
- [ ] Go to "Address" section
- [ ] **Edit Address:**
  - [ ] Update full street address
  - [ ] Update address details/apt/suite
  - [ ] Update city
  - [ ] Update state
  - [ ] Update zip code
- [ ] **Edit Location Coordinates:**
  - [ ] Set latitude/longitude manually
  - [ ] Or use map picker to select location
  - [ ] Preview location on map
- [ ] **Validation:**
  - [ ] City and state are required
  - [ ] Coordinates validation (if auto-geocoding)
- [ ] **Save Changes:**
  - [ ] Click "Save" button
  - [ ] Changes reflected on barbershop profile

### 5. **Update Contact Information**
- [ ] Navigate to barbershop → Settings tab
- [ ] Go to "Contact" section
- [ ] **Update Phone:**
  - [ ] Update contact phone number
  - [ ] Validate phone format
- [ ] **Update Email:**
  - [ ] Update business contact email
  - [ ] Validate email format
- [ ] **Update Website:**
  - [ ] Enter website URL
  - [ ] Validate URL format
- [ ] **Save Changes:**
  - [ ] Click "Save" button
  - [ ] Confirmation message

### 6. **Set & Update Business Hours/Availability**
- [ ] Navigate to barbershop → Settings tab
- [ ] Go to "Availability" section
- [ ] **For Each Day of Week (Monday-Sunday):**
  - [ ] Toggle "Active/Inactive" for the day
  - [ ] Set opening time (HH:MM format)
  - [ ] Set closing time (HH:MM format)
  - [ ] Set lunch break start time (optional)
  - [ ] Set lunch break end time (optional)
  - [ ] Validate closing time is after opening time
  - [ ] Validate lunch times fall within business hours
- [ ] **Grace Period:**
  - [ ] Set grace period in minutes (buffer between appointments)
  - [ ] Default value shown
- [ ] **Save Changes:**
  - [ ] Click "Save" button
  - [ ] Confirmation message
- [ ] **Effect on Appointments:**
  - [ ] New appointments respect availability
  - [ ] Time slots outside hours are unavailable
  - [ ] Lunch break times become unavailable
  - [ ] Existing appointments not affected

### 7. **Manage Social Media Links**
- [ ] Navigate to barbershop → Settings tab
- [ ] Go to "Social Media" section
- [ ] **Add/Update Social Links:**
  - [ ] TikTok URL
  - [ ] Instagram URL
  - [ ] Facebook URL
  - [ ] Twitter/X URL
  - [ ] YouTube URL
- [ ] **Validation:**
  - [ ] Valid URL format
  - [ ] Optional fields can be empty
- [ ] **Save Changes:**
  - [ ] Click "Save" button
  - [ ] See confirmation
- [ ] **Verification:**
  - [ ] Links appear on public barbershop profile
  - [ ] Links are clickable

### 8. **Manage Additional Business Information**
- [ ] Navigate to barbershop → Settings tab
- [ ] Go to "Additional Info" or "Metadata" section
- [ ] **Update Metadata:**
  - [ ] Website URL (if different from contact)
  - [ ] Additional contact email
  - [ ] Completed appointments count (auto-tracked or manual?)
  - [ ] Rating (auto-calculated)
  - [ ] Reviews count (auto-tracked)
- [ ] **Save Changes:**
  - [ ] Click "Save" button

### 9. **Invite Barber/Staff Member**
- [ ] Navigate to barbershop → "Barbers" tab
- [ ] Click "Invite Barber" or "Add Staff Member" button
- [ ] **Invitation Form:**
  - [ ] Enter barber email address (required)
  - [ ] Enter barber phone number (required)
  - [ ] Select roles (checkboxes: barber, owner?)
  - [ ] Set invitation expiry (default 7 days)
  - [ ] Add optional message
- [ ] **Validation:**
  - [ ] Valid email format
  - [ ] Valid phone format
  - [ ] Cannot invite already-member email
  - [ ] Check plan limits (free: 0, pro: 5, premium: 10 invited barbers)
- [ ] **Send Invitation:**
  - [ ] Click "Send Invitation" button
  - [ ] See "Invitation Sent" confirmation
  - [ ] Barber receives invitation email with code/link
- [ ] **After Invitation:**
  - [ ] See "Pending" invitation in barbers list
  - [ ] See invitation code and expiry date
  - [ ] Can resend or cancel invitation

### 10. **Manage Plan Limits for Barber Invitations**
- [ ] **Free Plan:**
  - [ ] Cannot invite barbers (max: 0)
  - [ ] See "Upgrade to invite barbers" CTA
  - [ ] Can only work alone as owner
- [ ] **Pro Plan:**
  - [ ] Can invite up to 5 barbers
  - [ ] See count of invited vs available slots
  - [ ] Cannot exceed 5 (error on 6th invite)
  - [ ] See "Upgrade to Premium for more barbers" if at limit
- [ ] **Premium Plan:**
  - [ ] Can invite up to 10 barbers
  - [ ] See count of invited vs available slots

### 11. **Manage Barber Memberships**
- [ ] Navigate to barbershop → "Barbers" tab
- [ ] View list of all current barbers/staff:
  - [ ] Accepted members
  - [ ] Pending invitations
- [ ] **For Each Member:**
  - [ ] See name, email, phone
  - [ ] See roles (barber/owner)
  - [ ] See status (active/inactive)
  - [ ] See join date
  - [ ] See number of completed appointments
- [ ] **Actions:**
  - [ ] Click on member to view profile/details
  - [ ] **Deactivate Member:**
    - [ ] Click "Deactivate" or status toggle
    - [ ] Confirm deactivation
    - [ ] Member status changes to "inactive"
    - [ ] Cannot book new appointments through this member
    - [ ] Existing appointments not affected
  - [ ] **Reactivate Member:**
    - [ ] Reactivate previously inactive member
    - [ ] Member status changes to "active"
  - [ ] **Remove Member:**
    - [ ] Click "Remove" button
    - [ ] Confirm permanent removal
    - [ ] Member removed from barbershop
    - [ ] Cannot undo removal

### 12. **Create Service**
- [ ] Navigate to barbershop → "Services" tab
- [ ] Click "Create Service" or "Add New Service" button
- [ ] **Service Creation Form:**
  - [ ] Enter service name (required)
  - [ ] Enter service price (required)
    - [ ] Minimum: $1,000 CO
    - [ ] Validation shows minimum amount
  - [ ] Enter service duration (required)
    - [ ] In minutes
    - [ ] Minimum: 5 minutes
    - [ ] Maximum: 480 minutes (8 hours)
    - [ ] Validation shows range
  - [ ] Optional description or notes
- [ ] **Save Service:**
  - [ ] Click "Save" or "Create Service" button
  - [ ] See "Service Created" confirmation
- [ ] **After Creation:**
  - [ ] Service appears in services list
  - [ ] Service available for appointments
  - [ ] All barbers see this service initially
  - [ ] Barbers can opt-in to offer this service

### 13. **Edit Service**
- [ ] Navigate to barbershop → "Services" tab
- [ ] Click edit icon/button next to service
- [ ] **Edit Form:**
  - [ ] Update service name
  - [ ] Update service price
  - [ ] Update service duration
  - [ ] Update description
- [ ] **Validation:**
  - [ ] Same as creation (min price, min/max duration)
  - [ ] Cannot leave required fields empty
- [ ] **Save Changes:**
  - [ ] Click "Save Changes" button
  - [ ] See confirmation message
- [ ] **Effect:**
  - [ ] Changes apply to new appointments only
  - [ ] Existing appointments keep original service details
  - [ ] Service information updated on public profile

### 14. **Delete Service**
- [ ] Navigate to barbershop → "Services" tab
- [ ] Click delete/trash icon on service
- [ ] **Delete Confirmation:**
  - [ ] Confirm deletion request
  - [ ] If service has upcoming appointments:
    - [ ] See warning: "This service has X upcoming appointments"
    - [ ] Warn that appointments will be affected
  - [ ] Option to cancel or confirm delete
- [ ] **After Deletion:**
  - [ ] Service removed from services list
  - [ ] Service no longer available for new appointments
  - [ ] Existing appointments status TBD (soft delete? kept?)
  - [ ] Service unavailable for all barbers

### 15. **Manage Barber Service Assignments**
- [ ] Navigate to barbershop → "Barbers" tab
- [ ] Click on a barber's name
- [ ] See "Services" section/modal
- [ ] **View Assigned Services:**
  - [ ] See all services offered at barbershop
  - [ ] See which ones barber offers (checked)
  - [ ] See which ones barber doesn't offer (unchecked)
- [ ] **Add Service to Barber:**
  - [ ] Check checkbox next to service
  - [ ] Service immediately added
  - [ ] Barber can accept appointments for this service
- [ ] **Remove Service from Barber:**
  - [ ] Uncheck checkbox next to service
  - [ ] Service immediately removed
  - [ ] Cannot create new appointments for this service
  - [ ] Existing appointments not affected
- [ ] **Save/Confirm:**
  - [ ] Changes may auto-save or require explicit save
  - [ ] See confirmation message

### 16. **View All Appointments**
- [ ] Navigate to barbershop → "Appointments" tab
- [ ] View appointments in calendar or table:
  - [ ] **Calendar View:**
    - [ ] Monthly calendar showing appointment slots
    - [ ] Color-coded by status
    - [ ] Click date to see details
  - [ ] **Table View:**
    - [ ] List of appointments with columns
    - [ ] Sortable by date, status, customer, barber
- [ ] **Filter Options:**
  - [ ] Filter by status (pending, confirmed, completed, cancelled, no-show, rescheduled)
  - [ ] Filter by barber
  - [ ] Filter by date range
  - [ ] Filter by customer name
- [ ] **View Details:**
  - [ ] Click appointment to expand/open details modal
  - [ ] See full appointment information
  - [ ] See available actions for current status

### 17. **Manage Individual Appointments**
- [ ] Open appointment details
- [ ] **View Appointment:**
  - [ ] Customer name and contact info
  - [ ] Barber assigned
  - [ ] Service name and price
  - [ ] Date and time
  - [ ] Appointment status
  - [ ] Notes (if any)
  - [ ] Grace period info
- [ ] **Actions Based on Status:**
  - [ ] **Pending:** Confirm, Cancel, Add to Calendar
  - [ ] **Confirmed:** Mark Completed, Cancel, Respond to Reschedule
  - [ ] **Completed:** View Details, Leave Internal Note
  - [ ] **Cancelled:** View Details
  - [ ] **No-show:** Rebook/Contact Customer
- [ ] **Perform Actions:**
  - [ ] Confirm pending appointment
  - [ ] Mark as completed
  - [ ] Cancel appointment
  - [ ] Mark as no-show
  - [ ] Respond to reschedule requests
  - [ ] Add/update appointment notes

### 18. **Handle Appointment Reschedule Requests**
- [ ] View appointment with customer reschedule request
- [ ] See customer's requested date/time and message
- [ ] **Option 1: Accept Reschedule Request**
  - [ ] Click "Accept Reschedule" button
  - [ ] Confirm acceptance
  - [ ] Appointment updated to customer's requested time
  - [ ] Customer receives acceptance notification
  - [ ] Original time slot becomes available
- [ ] **Option 2: Propose Different Date/Time**
  - [ ] Click "Propose New Time" button
  - [ ] **Proposal Form:**
    - [ ] Select new date
    - [ ] Select new time
    - [ ] Available times respect business hours
    - [ ] Available times respect other appointments
    - [ ] Add optional message to customer
    - [ ] Confirm proposal
  - [ ] **After Proposal:**
    - [ ] Customer receives proposal notification
    - [ ] Appointment shows "Reschedule Pending"
    - [ ] Customer can accept, decline, or counter-propose
- [ ] **Option 3: Deny Reschedule Request**
  - [ ] Click "Deny" button
  - [ ] Add optional reason/message
  - [ ] Customer receives denial notification
  - [ ] Appointment remains at original time

### 19. **Create Staff Appointments**
- [ ] **Plan Feature:**
  - [ ] Free: Cannot create staff appointments
  - [ ] Pro: Can create appointments on behalf of customers
  - [ ] Premium: Can create appointments on behalf of customers
- [ ] **If Pro/Premium Plan:**
  - [ ] Navigate to "Create Appointment" section
  - [ ] Select barbershop
  - [ ] Select barber
  - [ ] Select service
  - [ ] Select date & time
  - [ ] **Enter Customer Info:**
    - [ ] Customer name
    - [ ] Customer phone
    - [ ] Customer email (optional)
    - [ ] Appointment notes
  - [ ] Create appointment
  - [ ] Appointment status: Confirmed (since staff created)
  - [ ] Customer receives notification
- [ ] **If Free Plan:**
  - [ ] See "Upgrade to Pro to create appointments" message
  - [ ] CTA to upgrade plan

### 20. **View Business Metrics & Analytics**
- [ ] Navigate to barbershop dashboard
- [ ] See key metrics for current month:
  - [ ] Total appointments
  - [ ] Completed appointments
  - [ ] Cancelled appointments
  - [ ] No-show appointments
  - [ ] Average rating
  - [ ] Review count
- [ ] **Per-Barber Stats (if multiple barbers):**
  - [ ] Completed appointments per barber
  - [ ] Average rating per barber
- [ ] **Revenue Metrics (if applicable):**
  - [ ] Total revenue this month
  - [ ] Revenue per service
  - [ ] Revenue per barber

### 21. **View Customer Reviews**
- [ ] Navigate to barbershop profile (public view) or dashboard
- [ ] View all customer reviews section
- [ ] See:
  - [ ] Customer name or "Anonymous"
  - [ ] Star rating (1-5)
  - [ ] Review comment
  - [ ] Review date
- [ ] **Rating Breakdown:**
  - [ ] Count of 5-star, 4-star, 3-star, 2-star, 1-star reviews
  - [ ] Average rating calculation
  - [ ] Total number of reviews
- [ ] **Respond to Reviews (if feature available):**
  - [ ] Click "Reply" on review
  - [ ] Add owner response
  - [ ] Publish response
  - [ ] Customer sees response on their review

### 22. **Monitor Subscription & Plan Status**
- [ ] Navigate to barbershop → Settings or Billing section
- [ ] **View Current Plan:**
  - [ ] See plan tier (Free/Pro/Premium)
  - [ ] See plan name and price
  - [ ] See renewal date (if paid)
  - [ ] See features included in plan
- [ ] **View Usage:**
  - [ ] SMS sent this month vs limit
  - [ ] Emails sent this month vs limit
  - [ ] Barbers invited vs limit
- [ ] **Upgrade Plan:**
  - [ ] Click "Upgrade" button
  - [ ] See pricing page
  - [ ] Select plan to upgrade to
  - [ ] Complete payment
  - [ ] Plan changes immediately

### 23. **Monitor SMS/Email Usage**
- [ ] Navigate to barbershop → Settings or "Usage" section
- [ ] **SMS Usage:**
  - [ ] See SMS sent this month
  - [ ] See SMS limit for plan
  - [ ] See SMS limit percentage used
  - [ ] See when limit resets (start of month)
  - [ ] See warning when approaching limit
- [ ] **Email Usage:**
  - [ ] See emails sent this month
  - [ ] See email limit for plan
  - [ ] See email limit percentage used
  - [ ] See when limit resets
- [ ] **Upgrade:**
  - [ ] See "Upgrade Plan" CTA when limit exceeded
  - [ ] Can upgrade to higher tier for more quota

### 24. **Manage Barbershop Activation/Deactivation**
- [ ] Navigate to barbershop → Settings tab
- [ ] Go to "Status" or "General" section
- [ ] **View Status:**
  - [ ] See current status (Active/Inactive)
- [ ] **Deactivate Barbershop:**
  - [ ] Click "Deactivate Barbershop" button
  - [ ] Confirm deactivation
  - [ ] See warning about effects:
    - [ ] Barbershop not visible to customers
    - [ ] Cannot create new appointments
    - [ ] Existing appointments not affected
  - [ ] Deactivation confirmed
  - [ ] Status changes to "Inactive"
- [ ] **Reactivate Barbershop:**
  - [ ] Click "Activate Barbershop" button
  - [ ] Confirm reactivation
  - [ ] Status changes to "Active"
  - [ ] Visible to customers again

### 25. **View Public Barbershop Profile**
- [ ] Navigate to public barbershop page (as customer would see)
- [ ] Verify all information is correct and up-to-date:
  - [ ] Name, address, phone
  - [ ] Business hours
  - [ ] Services and prices
  - [ ] Barbers and their services
  - [ ] Reviews and ratings
  - [ ] Social media links
  - [ ] Banner image
- [ ] Compare with settings to ensure all changes reflected

### 26. **Email & SMS Notification Scenarios**
- [ ] **New Appointment Created:**
  - [ ] Owner/barber receives email
  - [ ] Owner/barber receives SMS (if enabled)
  - [ ] Contains: customer name, service, date, time
  - [ ] Subject mentions "Nueva cita" or similar
- [ ] **Reschedule Request:**
  - [ ] Owner/barber receives email
  - [ ] Contains: customer proposed time, original time, message
  - [ ] Includes action links
- [ ] **Appointment Confirmation:**
  - [ ] Customer receives confirmation (handled by system)
- [ ] **Appointment Cancellation:**
  - [ ] Customer receives cancellation email
  - [ ] Contains reason (if provided)

### 27. **Plan Upgrade/Downgrade Scenarios**
- [ ] **Free → Pro Upgrade:**
  - [ ] Can now invite up to 5 barbers
  - [ ] Can create staff appointments
  - [ ] SMS/Email limits increased
  - [ ] Existing barbershop settings preserved
- [ ] **Pro → Premium Upgrade:**
  - [ ] Can now invite up to 10 barbers (vs 5)
  - [ ] SMS/Email limits unlimited
  - [ ] All Pro features included
- [ ] **Downgrade (if allowed):**
  - [ ] Warning about feature loss
  - [ ] Warning about data/settings affected
  - [ ] Requires confirmation

### 28. **Error Handling & Edge Cases**
- [ ] **Plan Limit Exceeded:**
  - [ ] Cannot invite 6th barber on Pro plan
  - [ ] See "Plan limit reached" error
  - [ ] CTA to upgrade
- [ ] **Expired Invitation:**
  - [ ] Cannot use invitation after expiry
  - [ ] Can resend or create new invitation
- [ ] **Inactive Barbershop:**
  - [ ] Cannot create appointments
  - [ ] Cannot invite barbers
  - [ ] See "Activate barbershop" CTA
- [ ] **Double Booking:**
  - [ ] Cannot create appointment at overlapping time
  - [ ] See "Time slot already booked" error
- [ ] **Invalid Service Duration:**
  - [ ] Cannot create appointment if service won't fit in time slot
  - [ ] See "Service duration too long" error
- [ ] **Network/API Errors:**
  - [ ] Error messages shown
  - [ ] Retry option available
  - [ ] No data loss on failure
