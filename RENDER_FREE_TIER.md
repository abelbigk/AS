# Render Free Tier - Service Spin Down

## Issue
On Render's free tier, your service automatically spins down after **15 minutes of inactivity**. When a user tries to access the app after it's been idle, they see a "building" screen for **30-60 seconds** while the service spins back up.

## Why This Happens
- Free tier services are automatically shut down to save resources
- First request after shutdown triggers a cold start
- The service needs to rebuild and start up

## Solutions

### Option 1: Upgrade to Paid Plan (Recommended for Production)
- **Starter Plan**: $7/month
  - Always-on service (no spin down)
  - 512MB RAM
  - Better performance
- **Standard Plan**: $25/month
  - 2GB RAM
  - Auto-scaling

### Option 2: Keep Service Warm (Free Tier Workaround)
Use a service like **UptimeRobot** or **Cron-Job.org** to ping your backend every 10-14 minutes:

**Ping URL**: `https://as-wryo.onrender.com/health`

**UptimeRobot Setup** (Free):
1. Go to https://uptimerobot.com
2. Add New Monitor
3. Monitor Type: HTTP(S)
4. URL: `https://as-wryo.onrender.com/health`
5. Monitoring Interval: 10 minutes

This keeps your service alive but uses your monthly free tier hours (750 hours/month = ~31 days if always on).

### Option 3: Accept the Delay
- Users experience a 30-60 second delay on first access after inactivity
- Subsequent requests are instant
- No additional cost

## Current Status
Your app is on Render's **Free Tier** and will spin down after 15 minutes of inactivity.

## Recommendation
For a production app with users, upgrade to at least the **Starter Plan ($7/month)** to eliminate the cold start delay.
