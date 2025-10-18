# Brandalyze Deployment Guide

## 🚀 Production Deployment Checklist

### 1. Domain Setup (✅ Complete)
- [x] Domain purchased: `brandalyze.io`
- [ ] DNS configured for Vercel (frontend)
- [ ] DNS configured for Render (backend API)

### 2. Backend Deployment (Render)

#### Step 1: Create Render Account & Service
1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account
3. Create a new **Web Service**
4. Connect to your `brandalyze` repository
5. Configure the service:
   - **Name**: `brandalyze-backend`
   - **Region**: Oregon (or closest to your users)
   - **Branch**: `main`
   - **Root Directory**: `apps/backend`
   - **Runtime**: Python 3
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn brandalyze_backend.wsgi:application --bind 0.0.0.0:$PORT`

#### Step 2: Add Environment Variables in Render Dashboard
Copy from `apps/backend/.env.production.template`:
```
DEBUG=False
SECRET_KEY=your-super-secret-django-key-here
ALLOWED_HOSTS=brandalyze-backend.onrender.com,api.brandalyze.io
FRONTEND_URL=https://brandalyze.io
CORS_ALLOWED_ORIGINS=https://brandalyze.io,https://www.brandalyze.io
USE_TLS=True
CLERK_JWKS_URL=your-clerk-jwks-url
CLERK_ISSUER=your-clerk-issuer
CLERK_SECRET_KEY=your-clerk-secret
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
OPENAI_API_KEY=your-openai-key
```

#### Step 3: Create PostgreSQL Database
1. In Render dashboard, create a new **PostgreSQL** database
2. Name it `brandalyze-postgres`
3. Copy the `DATABASE_URL` and add it to your web service environment variables

#### Step 4: Custom Domain (Optional)
1. In your web service settings, add custom domain: `api.brandalyze.io`
2. Configure DNS: Create CNAME record pointing `api.brandalyze.io` to your Render service

### 3. Frontend Deployment (Vercel)

#### Step 1: Create Vercel Account & Project
1. Go to [vercel.com](https://vercel.com) and sign up
2. Connect your GitHub account
3. Import your `brandalyze` repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

#### Step 2: Add Environment Variables in Vercel Dashboard
Copy from `apps/frontend/.env.production.template`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key
CLERK_SECRET_KEY=sk_live_your_secret
NEXT_PUBLIC_BACKEND_URL=https://brandalyze-backend.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
STRIPE_PRICE_ID_PRO=price_your_pro_id
NEXT_PUBLIC_SITE_URL=https://brandalyze.io
```

#### Step 3: Configure Custom Domain
1. In Vercel project settings, go to **Domains**
2. Add `brandalyze.io` and `www.brandalyze.io`
3. Follow Vercel's DNS configuration instructions in GoDaddy:
   - Add A record: `@` → `76.76.19.19`
   - Add CNAME record: `www` → `cname.vercel-dns.com`

### 4. DNS Configuration (GoDaddy)

#### Main Domain (Frontend - Vercel)
- **Type**: A Record
- **Name**: @
- **Value**: 76.76.19.19
- **TTL**: 1 Hour

#### WWW Subdomain (Frontend - Vercel)  
- **Type**: CNAME
- **Name**: www
- **Value**: cname.vercel-dns.com
- **TTL**: 1 Hour

#### API Subdomain (Backend - Render) [Optional]
- **Type**: CNAME
- **Name**: api
- **Value**: your-render-service.onrender.com
- **TTL**: 1 Hour

### 5. Stripe Configuration

#### Update Webhook Endpoints
1. Go to Stripe Dashboard → Developers → Webhooks
2. Update webhook URL to: `https://brandalyze-backend.onrender.com/api/payments/webhook/stripe/`
3. Ensure events are enabled:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

#### Update Redirect URLs
1. Update success URL: `https://brandalyze.io/subscription/success`
2. Update cancel URL: `https://brandalyze.io/subscription/cancel`

### 6. Post-Deployment Testing

#### Backend Health Check
```bash
curl https://brandalyze-backend.onrender.com/health/
# Should return: {"status": "healthy", "service": "brandalyze-backend", "version": "1.0.0"}
```

#### Test Payment Flow
1. Visit `https://brandalyze.io`
2. Sign up for account
3. Try free analysis
4. Test subscription upgrade
5. Verify webhook receives events

#### Test Analysis Features
1. Add brand samples
2. Analyze content
3. Check usage limits
4. Verify AI responses format correctly

### 7. Monitoring & Maintenance

#### Set up monitoring:
- [ ] Render service monitoring (built-in)
- [ ] Vercel analytics (built-in)  
- [ ] Stripe webhook monitoring
- [ ] Database backup schedule

#### Regular tasks:
- Monitor error logs
- Check payment processing
- Update dependencies
- Security patches

### 8. SEO & Analytics (Optional)

#### Google Search Console
1. Verify domain ownership
2. Submit sitemap: `https://brandalyze.io/sitemap.xml`

#### Google Analytics 4
1. Create GA4 property
2. Add tracking code to `apps/frontend/src/app/layout.tsx`

---

## 🔧 Troubleshooting

### Common Issues:

**Build Fails on Render**
- Check Python version compatibility
- Verify all dependencies in requirements.txt
- Check build logs for specific errors

**CORS Errors**
- Verify CORS_ALLOWED_ORIGINS includes your frontend domain
- Check ALLOWED_HOSTS includes your backend domain

**Stripe Webhooks Failing**
- Verify webhook URL is correct
- Check webhook secret matches environment variable
- Ensure HTTPS is properly configured

**Database Connection Issues**
- Verify DATABASE_URL is set correctly
- Check if migrations ran successfully
- Confirm PostgreSQL service is running

---

## 📞 Support

If you encounter issues:
1. Check service logs in Render/Vercel dashboards
2. Verify all environment variables are set
3. Test endpoints individually
4. Check DNS propagation (can take up to 48 hours)

Your application will be live at: **https://brandalyze.io** 🎉
