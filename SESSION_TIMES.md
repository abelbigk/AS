# Session Duration Configuration

Your app now has **different session times** for mobile and web:

## Session Times:

| Platform | Duration | Details |
|----------|----------|---------|
| 📱 **Mobile App (APK)** | **1 YEAR (365 days)** | Stay logged in for a full year |
| 🌐 **Web Browser** | **7 days** | More secure for browser access |

## How It Works:

### Backend Detection (`authRouter.ts`):
```typescript
// Detects if request is from Capacitor (mobile app)
function isMobileApp(userAgent: string): boolean {
  return userAgent.includes("Capacitor");
}

// Different token expiry times
const TOKEN_EXPIRY_MOBILE = "365d"; // 1 year
const TOKEN_EXPIRY_WEB = "7d";      // 7 days
```

### When You Login:
1. Backend checks the User-Agent header
2. If it's from Capacitor → gives 365-day token ✅
3. If it's from browser → gives 7-day token ✅

### Frontend Display:
The login page automatically shows the correct duration:
- Mobile app: "Session remains active for 1 year"
- Browser: "Session remains active for 7 days"

## Why Different Times?

### Mobile App (1 Year):
✅ **Convenience** - You use your personal phone
✅ **Security** - Phone is locked with PIN/fingerprint
✅ **Private device** - Not shared with others
✅ **User experience** - Don't want to login every week

### Web Browser (7 Days):
✅ **Security** - Could be on shared computer
✅ **Best practice** - Shorter sessions for web
✅ **Less risk** - If someone else uses browser
✅ **Balance** - Long enough to be convenient

## Configuration:

To change session times, edit `server/authRouter.ts`:

```typescript
const TOKEN_EXPIRY_MOBILE = "365d"; // Change this for mobile
const TOKEN_EXPIRY_WEB = "7d";      // Change this for web
```

Options:
- `"1d"` = 1 day
- `"7d"` = 7 days
- `"30d"` = 30 days
- `"90d"` = 90 days
- `"365d"` = 1 year

## Testing:

### Test Mobile (1 Year):
1. Build APK and install on phone
2. Login → Token valid for 1 year
3. Check in browser console: Token expires in 365 days ✅

### Test Browser (7 Days):
1. Open http://localhost:5000 in browser
2. Login → Token valid for 7 days
3. Check in browser console: Token expires in 7 days ✅

## Security Notes:

- ✅ Both tokens use same JWT_SECRET
- ✅ Both tokens are signed and secure
- ✅ Can't modify token without detection
- ✅ Expiry is enforced server-side
- ✅ After expiry, must login again

## Summary:

🎉 **You got the best of both worlds:**
- Mobile app: Login once, stay logged in for a year!
- Web browser: More secure with 7-day sessions

Perfect for personal use where you want convenience on your phone but security on the web! 🔐📱
