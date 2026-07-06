# Authentication System

This app uses a simple username/password authentication system with JWT tokens.

## Setup

### 1. Database Migration

The authentication system requires `username` and `password` columns in the users table. Run the migration:

```bash
npx tsx server/migrateAuth.ts
```

### 2. Create Admin User

Create the first admin user:

```bash
npx tsx server/createDefaultAdmin.ts
```

This creates a default admin account:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Important**: Change the password immediately after first login!

### 3. Create Additional Users

To create additional users interactively:

```bash
npx tsx server/createAdminUser.ts
```

## Environment Variables

Add the following to your `.env` file:

```env
JWT_SECRET=your-secret-key-change-this-in-production
```

## How It Works

### Client Side

1. **Login**: User enters username and password
2. **Token Storage**: JWT token is stored in `localStorage` under key `auth_token`
3. **API Requests**: Token is sent in `Authorization: Bearer <token>` header
4. **Session Duration**: Tokens are valid for 7 days

### Server Side

1. **Token Verification**: Middleware checks `Authorization` header
2. **User Context**: Valid token loads user into request context
3. **Protected Routes**: Use `protectedProcedure` for auth-required endpoints

## API Endpoints

### Authentication

- `auth.login`: Login with username/password → returns JWT token
- `auth.register`: Register new user (first user becomes admin)
- `auth.changePassword`: Change password (requires current password)
- `auth.verifyToken`: Check if token is still valid
- `auth.me`: Get current user info
- `auth.logout`: Logout (client removes token)

## Security Features

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens with 7-day expiration
- ✅ Unique username constraint
- ✅ First user automatically becomes admin
- ✅ Password minimum length: 6 characters
- ✅ Username minimum length: 3 characters

## Development

### Bypass Authentication (Development Only)

Set `DISABLE_AUTH=true` in `.env` to bypass authentication during development:

```env
DISABLE_AUTH=true
```

This auto-authenticates as a dev user without requiring login.

⚠️ **Never use this in production!**

## Changing Password

Users can change their password from the Settings page:

1. Go to Settings
2. Click "Change Password"
3. Enter current password
4. Enter new password (min 6 characters)
5. Confirm new password
6. Submit

## Logout

To logout:

1. Go to Settings
2. Click "Logout"

This removes the JWT token from localStorage and redirects to the login page.

## Troubleshooting

### "Please login (10001)" Error

This means the token is missing or invalid. Solutions:

1. Clear localStorage: `localStorage.removeItem('auth_token')`
2. Login again
3. Check JWT_SECRET is set correctly in `.env`

### Can't Login

1. Verify user exists in database
2. Check password is correct
3. Ensure JWT_SECRET is set
4. Check browser console for errors

### Token Expired

Tokens expire after 7 days. Simply login again to get a new token.
