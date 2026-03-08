# User Flow - Smoke Tests

## General User Authentication & Profile Flows

### 1. **Sign Up Flow**
- [ ] Navigate to registration page (`/register`)
- [ ] Enter email, password, and confirm password
- [ ] Verify email (if required)
- [ ] Successfully create account
- [ ] Redirect to login page

### 2. **Login Flow**
- [ ] Navigate to login page (`/login`)
- [ ] Enter email and password
- [ ] Successfully authenticate
- [ ] Redirect to appropriate landing page or dashboard

### 3. **Password Recovery Flow**
- [ ] Navigate to forgot password page (`/forgot-password`)
- [ ] Enter email address
- [ ] Receive password reset email
- [ ] Click reset link and navigate to reset password page (`/reset-password`)
- [ ] Enter new password and confirm
- [ ] Successfully reset password

### 4. **Email Verification Flow**
- [ ] Receive verification email during signup
- [ ] Navigate to verify email page (`/verify-email`)
- [ ] Enter verification code (if required)
- [ ] Successfully verify email

### 5. **User Profile Management**
- [ ] Navigate to profile page (`/profile`)
- [ ] View current profile information (Account tab)
- [ ] Update name, email, or phone number
- [ ] Update notification preferences
- [ ] View and manage appointments (Appointments tab)
- [ ] Access account settings and danger zone (Danger tab)

### 6. **Session Management**
- [ ] Successfully maintain session while navigating the app
- [ ] Manual logout from profile menu
- [ ] Redirect to login after logout

### 7. **Navigation Between Routes**
- [ ] Navigate between home (`/`), pricing (`/pricing`), privacy policy, and terms of service
- [ ] Navigate to barbershops listing (`/barbershops`)
- [ ] Navigate to individual barbershop pages (`/barbershops/:uuid`)
- [ ] Redirect to login when accessing protected routes without authentication
