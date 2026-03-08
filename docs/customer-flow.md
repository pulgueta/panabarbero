# Customer Flow - Smoke Tests

## Customer/End-User Appointment & Discovery Flows

### 1. **Browse Barbershops Flow**
- [ ] Navigate to barbershops listing page (`/barbershops`)
- [ ] View available barbershops with grid/list layout
- [ ] Search barbershops by name or location
- [ ] Filter by city/state
- [ ] View barbershop details (address, services, contact info, ratings)
- [ ] View barber profiles and their services

### 2. **View Barbershop Details**
- [ ] Navigate to specific barbershop page (`/barbershops/:uuid`)
- [ ] View barbershop information (name, description, address, phone)
- [ ] View available services with prices and duration
- [ ] View barbershop hours/availability
- [ ] See barbers working at the barbershop
- [ ] View social media links and website (if available)
- [ ] View reviews and ratings

### 3. **Create Appointment Flow**
- [ ] Navigate to create appointment page (`/appointments/create`)
- [ ] Select a barbershop
- [ ] Select a barber
- [ ] Select a service
- [ ] Choose preferred date and time
- [ ] Enter customer name and contact phone
- [ ] Enter contact email (optional)
- [ ] Add appointment notes (optional)
- [ ] Successfully create appointment
- [ ] See appointment confirmation

### 4. **View My Appointments**
- [ ] Navigate to profile page (`/profile`)
- [ ] Click on "Appointments" tab
- [ ] View list of all personal appointments (upcoming and past)
- [ ] Filter appointments by status (pending, confirmed, completed, cancelled, etc.)
- [ ] View appointment details (barber, service, date, time, location)

### 5. **Cancel Appointment Flow**
- [ ] Open an appointment from personal list
- [ ] Click "Cancel" button
- [ ] Confirm cancellation in dialog
- [ ] Successfully cancel appointment
- [ ] See appointment status updated to "cancelled"

### 6. **Request Appointment Reschedule Flow**
- [ ] Open an upcoming appointment
- [ ] Click "Request Reschedule" button
- [ ] Select new date and time
- [ ] Add optional notes for reschedule request
- [ ] Submit reschedule request
- [ ] See appointment status changed to reschedule request pending
- [ ] Wait for barber/owner to approve or deny reschedule

### 7. **Respond to Reschedule Response Flow**
- [ ] View appointment with pending reschedule response
- [ ] See barber's proposed new date/time
- [ ] Accept reschedule (if approved)
- [ ] View appointment updated with new date/time

### 8. **Leave Review Flow**
- [ ] Navigate to profile page (`/profile`)
- [ ] Click on "Reviews" tab
- [ ] Find a completed appointment
- [ ] Click "Leave Review" for that appointment
- [ ] Select rating (1-5 stars)
- [ ] Enter optional review comment
- [ ] Submit review
- [ ] See review successfully posted

### 9. **View Barbershop Reviews**
- [ ] Navigate to barbershop detail page
- [ ] View all reviews from customers
- [ ] See ratings breakdown
- [ ] See average rating and review count

### 10. **Account Settings & Preferences**
- [ ] Navigate to profile page (`/profile`)
- [ ] Click on "Account" tab
- [ ] View and update personal information
- [ ] Update notification preferences (email, SMS)
- [ ] View account status
