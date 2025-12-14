# Deployment Guide for Vercel

This guide will help you deploy your fitness studio management app to Vercel.

## Prerequisites

1. **GitHub Account** - You'll need a GitHub account to host your code
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **MongoDB Atlas Account** - For your production database (or use your existing MongoDB instance)

## Pre-Deployment Checklist

### ✅ 1. Security Review

- [x] Admin credentials moved to environment variables
- [x] `.gitignore` properly configured to exclude sensitive files
- [x] No hardcoded secrets in the codebase
- [x] MongoDB connection uses environment variables

### ✅ 2. Environment Variables Required

You'll need to set these in Vercel:

- `MONGODB_URI` - Your MongoDB connection string
- `ADMIN_EMAIL` - Admin email (optional, defaults to theplaceadmin@theplace.com.kh)
- `ADMIN_PASSWORD` - Admin password (optional, defaults to admin123)
- `NODE_ENV` - Set to `production` (automatically set by Vercel)

## Step-by-Step Deployment

### Step 1: Initialize Git Repository

If you haven't already, initialize a git repository:

```bash
cd "/Users/cryptoshi/Downloads/DEV/TP - THE PLACE"
git init
git add .
git commit -m "Initial commit: Fitness studio management app"
```

### Step 2: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. **DO NOT** initialize with README, .gitignore, or license (you already have these)
3. Copy the repository URL

### Step 3: Push to GitHub

```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

### Step 4: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings
5. Configure environment variables (see below)
6. Click **"Deploy"**

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

### Step 5: Configure Environment Variables in Vercel

1. Go to your project settings in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `MONGODB_URI` | `mongodb+srv://username:password@cluster.mongodb.net/theplace?retryWrites=true&w=majority` | Production, Preview, Development |
| `ADMIN_EMAIL` | `theplaceadmin@theplace.com.kh` | Production (optional) |
| `ADMIN_PASSWORD` | `your-secure-password` | Production (optional) |
| `NODE_ENV` | `production` | Production (auto-set by Vercel) |

**Important Security Notes:**
- Use a strong password for `ADMIN_PASSWORD` in production
- Never commit `.env` files to Git
- Rotate passwords regularly
- Consider using Vercel's environment variable encryption

### Step 6: MongoDB Atlas Setup (If using Atlas)

1. Create a MongoDB Atlas account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Create a database user
4. Whitelist Vercel IP addresses (or use `0.0.0.0/0` for all IPs - less secure)
5. Get your connection string and add it to Vercel environment variables

**MongoDB Atlas Network Access:**
- Add `0.0.0.0/0` to allow all IPs (for Vercel's dynamic IPs)
- Or use Vercel's specific IP ranges (check Vercel docs for current IPs)

### Step 7: Verify Deployment

1. Visit your Vercel deployment URL
2. Test the login functionality
3. Verify database connections are working
4. Check that all features are functioning correctly

## Post-Deployment

### Custom Domain (Optional)

1. Go to **Settings** → **Domains** in Vercel
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

### Monitoring

- Vercel provides built-in analytics and monitoring
- Check **Analytics** tab for performance metrics
- Monitor **Logs** for any errors

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Errors

**Problem:** App can't connect to MongoDB

**Solutions:**
- Verify `MONGODB_URI` is correctly set in Vercel
- Check MongoDB Atlas network access settings
- Ensure MongoDB user has proper permissions
- Check connection string format (URL-encode special characters)

#### 2. Build Failures

**Problem:** Build fails on Vercel

**Solutions:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility
- Check for TypeScript errors

#### 3. Environment Variables Not Working

**Problem:** Environment variables not accessible

**Solutions:**
- Ensure variables are set for the correct environment (Production/Preview)
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

#### 4. Session/Cookie Issues

**Problem:** Users can't stay logged in

**Solutions:**
- Verify `secure` cookie setting works with HTTPS (Vercel provides HTTPS)
- Check cookie domain settings
- Ensure `sameSite` is set correctly

## Security Best Practices

1. **Never commit secrets** - Always use environment variables
2. **Use strong passwords** - Especially for admin accounts
3. **Enable MongoDB authentication** - Use strong database passwords
4. **Restrict MongoDB network access** - Only allow necessary IPs
5. **Regular updates** - Keep dependencies updated
6. **Monitor logs** - Watch for suspicious activity
7. **Use HTTPS** - Vercel provides this automatically

## Production Checklist

Before going live:

- [ ] All environment variables configured
- [ ] MongoDB connection tested
- [ ] Admin credentials changed from defaults
- [ ] All features tested in production
- [ ] Error monitoring set up
- [ ] Backup strategy in place
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate active (automatic with Vercel)

## Support

For issues specific to:
- **Vercel**: Check [Vercel Documentation](https://vercel.com/docs)
- **Next.js**: Check [Next.js Documentation](https://nextjs.org/docs)
- **MongoDB**: Check [MongoDB Documentation](https://docs.mongodb.com)

## Additional Resources

- [Vercel Deployment Guide](https://vercel.com/docs/concepts/deployments/overview)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/getting-started/)


