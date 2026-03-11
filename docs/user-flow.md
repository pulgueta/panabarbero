# User Flow - Smoke Tests

## General User Authentication & Profile Flows

### 1. **Sign Up Flow**
- [ ] Navigate to registration page (`/register`)
- [ ] Enter email, password, and confirm password
- [ ] Accept terms of service and privacy policy
- [ ] Successfully create account
- [ ] User marked with free plan tier by default
- [ ] Redirect to login page or automatic login

### 2. **Email Verification Flow**
- [ ] Receive verification email after signup
- [ ] Navigate to verify email page (`/verify-email`)
- [ ] Click link in email (or enter verification code manually)
- [ ] Successfully verify email
- [ ] Access protected features after verification

### 3. **Login Flow**
- [ ] Navigate to login page (`/login`)
- [ ] Enter email and password
- [ ] Successfully authenticate
- [ ] Session created with secure cookie
- [ ] Redirect to appropriate landing page or dashboard
- [ ] Session persists across page navigation

### 4. **Logout Flow**
- [ ] Navigate to profile menu
- [ ] Click "Logout" button
- [ ] Confirm logout action (if required)
- [ ] Session terminated
- [ ] Redirect to home page (`/`)
- [ ] Protected routes no longer accessible

### 5. **Password Recovery Flow**
- [ ] Navigate to forgot password page (`/forgot-password`)
- [ ] Enter email address
- [ ] Receive password reset email with secure link
- [ ] Click reset link and navigate to reset password page (`/reset-password`)
- [ ] Enter new password and confirm
- [ ] Successfully reset password
- [ ] Redirect to login page
- [ ] Can login with new password

### 6. **User Profile Management**
- [ ] Navigate to profile page (`/profile`)
- [ ] **Account Tab:**
  - [ ] View current profile information (name, email, phone)
  - [ ] Update name
  - [ ] Update phone number
  - [ ] Update notification preferences (email/SMS toggles)
  - [ ] Save changes successfully
  - [ ] View confirmation message
- [ ] **Appointments Tab:**
  - [ ] View all personal appointments
  - [ ] View upcoming appointments
  - [ ] View completed appointments
  - [ ] View cancelled appointments
  - [ ] Click on appointment to see details
- [ ] **Danger Tab:**
  - [ ] View account deletion option
  - [ ] View deactivation options
  - [ ] Confirm before deleting account

### 7. **Notification Preferences**
- [ ] Navigate to profile → Account tab
- [ ] Toggle email notifications on/off
- [ ] Toggle SMS notifications on/off
- [ ] Save preferences
- [ ] Verify notifications respect user preferences
- [ ] Receive notifications only for enabled channels

### 8. **Session Management**
- [ ] Successfully maintain session while navigating app
- [ ] Session persists across page refreshes
- [ ] Session expires after inactivity (if configured)
- [ ] Session-only data cleared on logout
- [ ] Protected routes check authentication state
- [ ] Unauthenticated requests redirect to login

### 9. **Navigation & Route Access**
- [ ] **Public Routes:**
  - [ ] Navigate to home (`/`)
  - [ ] Navigate to pricing page (`/pricing`)
  - [ ] Navigate to privacy policy
  - [ ] Navigate to terms of service
  - [ ] Navigate to barbershops listing (`/barbershops`)
  - [ ] Navigate to barbershop details (`/barbershops/:uuid`)
- [ ] **Protected Routes:**
  - [ ] Navigate to profile (`/profile`)
  - [ ] Navigate to create appointment (`/appointments/create`)
  - [ ] Cannot access without authentication — redirect to login
  - [ ] After login, can access protected routes
  - [ ] Cannot access routes from other barbershops (authorization check)

### 10. **User Role & Authorization**
- [ ] **Customer-only features:**
  - [ ] Can browse barbershops
  - [ ] Can create own appointments
  - [ ] Cannot access barbershop management
  - [ ] Cannot invite barbers
- [ ] **Barbershop Member features:**
  - [ ] Can access barbershop management if invited
  - [ ] Assigned appropriate role (barber/owner)
  - [ ] Can only access assigned barbershops

### 11. **Pricing & Plan Information**
- [ ] Navigate to pricing page (`/pricing`)
- [ ] View plan tiers (Free, Pro, Premium)
- [ ] See plan features and limits
- [ ] See pricing for each tier
- [ ] View subscription status on profile (if subscribed)
- [ ] See "Upgrade Plan" CTA if on free tier

### 12. **Error Handling & Edge Cases**
- [ ] **Invalid Login:**
  - [ ] Enter wrong password — see error message
  - [ ] Enter non-existent email — see error message
- [ ] **Sign Up Validation:**
  - [ ] Email already exists — see error
  - [ ] Passwords don't match — see error
  - [ ] Invalid email format — see error
  - [ ] Password too weak — see error
- [ ] **Session Expiry:**
  - [ ] Session expires after timeout
  - [ ] Redirected to login on next action
- [ ] **Network Errors:**
  - [ ] Request fails — see error message
  - [ ] Retry mechanism works
