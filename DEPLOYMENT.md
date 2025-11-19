# NetGenix - Vercel Deployment Guide

## Quick Deployment Steps

### 1️⃣ Prepare Repository

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2️⃣ Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your repositories

### 3️⃣ Import Your Project

1. Click **"Add New..."** → **"Project"**
2. Find your NetGenix repository
3. Click **"Import"**

### 4️⃣ Configure Build Settings

Vercel will auto-detect these settings:

- **Framework Preset**: Vite ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅

**Leave these as default - do not change!**

### 5️⃣ Add Environment Variables

Click **"Environment Variables"** and add these three variables:

#### Variable 1: VITE_SUPABASE_PROJECT_ID
```
Name: VITE_SUPABASE_PROJECT_ID
Value: [Copy from your .env file]
```

#### Variable 2: VITE_SUPABASE_PUBLISHABLE_KEY
```
Name: VITE_SUPABASE_PUBLISHABLE_KEY
Value: [Copy from your .env file]
```

#### Variable 3: VITE_SUPABASE_URL
```
Name: VITE_SUPABASE_URL
Value: [Copy from your .env file]
```

**Where to find these values:**
- Open your local `.env` file in the project root
- Copy the exact values (including quotes if any)
- Paste into Vercel environment variables

### 6️⃣ Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for the build
3. Once complete, click **"Visit"** to see your live site
4. You'll get a URL like: `https://netgenix-xyz.vercel.app`

### 7️⃣ Test Your Deployment

1. Visit your Vercel URL
2. Try to sign up/login
3. Test creating a job
4. Verify dashboard loads
5. Generate a test report
6. Check if backup button works

## 🔄 Automatic Deployments

From now on:
- Every push to `main` → Automatic production deployment
- Every pull request → Preview deployment with unique URL
- No manual deployment needed!

## 🌐 Custom Domain Setup (Optional)

### Add Your Domain

1. In Vercel dashboard → **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `netgenix.com`)
4. Click **"Add"**

### Configure DNS

**If using Namecheap, GoDaddy, or similar:**

Add these DNS records:

#### For root domain (netgenix.com):
```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

#### For www subdomain (www.netgenix.com):
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**If using Cloudflare:**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: Auto
Proxy: DNS only (gray cloud)
```

### Verify Domain

1. Wait 5-60 minutes for DNS propagation
2. Vercel will automatically verify and issue SSL certificate
3. Your site will be live at your custom domain with HTTPS

## 🚨 Troubleshooting

### Build Failed

**Error: "Command failed: npm run build"**
- Check if code builds locally: `npm run build`
- Verify all dependencies are in package.json
- Check for TypeScript errors

**Error: "Environment variables not found"**
- Verify you added all 3 environment variables
- Check spelling exactly matches (case-sensitive)
- Ensure no extra spaces in values

### Site Loads but Login Doesn't Work

**Issue: "Invalid API credentials"**
- Double-check environment variables are correct
- Ensure you copied the full key including any special characters
- Try redeploying after fixing variables

### Database Connection Failed

**Issue: "Failed to connect to database"**
- Verify VITE_SUPABASE_URL is correct
- Check Supabase project is active
- Ensure RLS policies are enabled

### Images/Logo Not Showing

**Issue: Assets not loading**
- Check if images are in correct folder (src/assets)
- Verify import statements are correct
- Clear Vercel cache and redeploy

## 🔧 Advanced Configuration

### Environment Variables per Branch

Set different variables for production/preview:

1. Go to **Settings** → **Environment Variables**
2. Click variable to edit
3. Select **Production** only or **Preview** only
4. Save changes

### Rollback Deployment

If something breaks:

1. Go to **Deployments** tab
2. Find previous working deployment
3. Click **⋯** → **Promote to Production**
4. Instant rollback!

### Enable Analytics

1. Go to **Analytics** tab
2. Click **Enable**
3. Track visitors, performance, and usage

## 📊 Performance Optimization

### Enable Compression
Already configured in `vercel.json`

### Enable Caching
Vercel automatically caches static assets

### Optimize Images
Images are automatically optimized by Vite

## 🔐 Security Checklist

- [ ] Environment variables set (not in code)
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Authentication working
- [ ] RLS policies enabled on database
- [ ] Secrets stored in Supabase (not in repo)

## 📞 Need Help?

### Vercel Support
- Documentation: https://vercel.com/docs
- Discord: https://vercel.com/discord

### NetGenix Support
- Check README.md for troubleshooting
- Review application logs in Vercel dashboard
- Check Supabase logs in Cloud dashboard

---

## ✅ Deployment Success Checklist

- [ ] Project imported to Vercel
- [ ] Environment variables configured
- [ ] Build completed successfully
- [ ] Site accessible via Vercel URL
- [ ] Login/signup working
- [ ] Dashboard displays correctly
- [ ] Jobs can be created
- [ ] Reports generate successfully
- [ ] Dark/Light mode switches work
- [ ] Mobile view looks good
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active

**Congratulations! NetGenix is now live! 🎉**

---

**Quick Commands Reference:**

```bash
# Force redeploy
vercel --prod

# View deployment logs
vercel logs [deployment-url]

# Set environment variable via CLI
vercel env add VITE_SUPABASE_URL production

# Remove deployment
vercel remove [deployment-url]
```
