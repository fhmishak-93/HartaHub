# Hartahub

A web app for Malaysian co-broking agents to list properties, browse listings from other agents, and get auto-matched with buyer requirements by budget and location.

This guide assumes **zero prior technical experience**. Follow it top to bottom.

## What's in this project

- `server.js` - starts the app
- `models/` - what a User, Listing, and Requirement look like in the database
- `routes/` - the API endpoints the frontend calls (login, listings, requirements, matches)
- `utils/matching.js` - the matching logic (hard filters on property type/state/budget/bedrooms, then a 0-100% score based on budget fit, bedrooms, area, tenure, and lot status)
- `public/` - the actual web pages (HTML/CSS/JS) people see in their browser

## Part 1 - Run it on your own computer (optional but recommended first)

1. Install [Node.js](https://nodejs.org) (choose the LTS version) if you don't have it.
2. Open this folder in a terminal.
3. Run:
   ```
   npm install
   ```
4. Copy `.env.example` to a new file named `.env`, and fill in `MONGODB_URI` (see Part 2 below for how to get one) and any random string for `SESSION_SECRET`.
5. Run:
   ```
   npm start
   ```
6. Open `http://localhost:3000` in your browser. Sign up for an account and try posting a listing.

## Part 2 - Create a free database (MongoDB Atlas)

1. Go to [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. When asked to create a cluster, choose the **free (M0)** tier. Any region close to Malaysia (e.g. Singapore) is fine.
3. Under **Security > Database Access**, create a database user with a username and password. Save these somewhere safe.
4. Under **Security > Network Access**, click **Add IP Address** and choose **Allow Access from Anywhere** (0.0.0.0/0). This is the simplest option for a small MVP.
5. Go to your cluster, click **Connect > Drivers**, and copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with the database user you created, and add `hartahub` as the database name right after `.net/`, so it looks like:
   ```
   mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/hartahub?retryWrites=true&w=majority
   ```
   This is your `MONGODB_URI`.

## Part 3 - Put the code on GitHub

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Create a new repository (e.g. named `hartahub`). Leave it empty - don't add a README from GitHub's side.
3. On your computer, in this project folder, run:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/hartahub.git
   git push -u origin main
   ```
   (GitHub will show you these exact commands on the empty repository page too.)

Your `.env` file will **not** be uploaded (it's excluded by `.gitignore`) - that's intentional, since it holds secrets.

## Part 4 - Deploy on Render (free hosting)

1. Go to [render.com](https://render.com) and sign up (you can sign up directly with your GitHub account).
2. Click **New > Web Service**.
3. Connect your GitHub account and select your `hartahub` repository.
4. Fill in:
   - **Name:** hartahub (or anything you like)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. Under **Environment Variables**, add:
   - `MONGODB_URI` = the connection string from Part 2
   - `SESSION_SECRET` = any long random string (e.g. mash your keyboard for 30 characters)
6. Click **Create Web Service**. Render will build and deploy automatically - this takes a few minutes.
7. Once it's live, Render gives you a URL like `https://hartahub.onrender.com`. Open it to confirm everything works.

From now on, every time you `git push` to GitHub, Render automatically redeploys the latest version.

## Part 5 - Connect your domain (hartahub.com.my)

1. In Render, go to your web service > **Settings > Custom Domains**, and add `hartahub.com.my` (and `www.hartahub.com.my` if you want both).
2. Render will show you a DNS record to add (usually a CNAME or A record).
3. Log into wherever you bought `hartahub.com.my` (your domain registrar), find the DNS settings, and add the record Render gave you.
4. DNS changes can take anywhere from a few minutes to a few hours to take effect.

## Notes on the free tier

- Render's free web services "sleep" after periods of inactivity and take ~30-60 seconds to wake up on the next visit. This is fine for an MVP; you can upgrade to a paid instance later to avoid it.
- MongoDB Atlas's free tier (M0) has a 512MB storage limit, which is plenty for an MVP with hundreds of listings and users.

## Part 6 - Monetization (Free / Pro / Premium plans)

Hartahub has a built-in 3-tier plan system:

- **Free** - up to 2 listings and 2 buyer requirements. Agents can see that a match exists, but the counterpart agent's email/phone are hidden.
- **Pro** (RM 19/month by default) - up to 10 listings and 10 buyer requirements, full contact details on every match, and photo upload instead of a link.
- **Premium** (RM 97/month by default) - unlimited listings and requirements, full contact details, photo upload, and the commission/price-drop dashboard. WhatsApp match alerts and mobile app access are shown as "Coming Soon" - they're not built yet, so don't collect payment implying they're live today.

There's no payment gateway wired up yet - upgrades are granted manually, which is the simplest way to start and lets you validate that agents will actually pay before building any billing automation. When you're ready to automate, Malaysia-friendly options with recurring billing support include Curlec (Razorpay Malaysia, most SaaS-focused), Billplz, and Chip.

### Before you launch this

Open `public/upgrade.html` and replace the two placeholders with your real details:

- `[ADD YOUR PHONE NUMBER OR BANK ACCOUNT HERE]` - your DuitNow number or bank account for receiving payment
- `[ADD YOUR WHATSAPP NUMBER HERE]` (and the `https://wa.me/60000000000` link next to it) - where agents send proof of payment

To change the prices, edit `PRO_PRICE_RM` and `PREMIUM_PRICE_RM` in `utils/constants.js` (this also updates the numbers shown on the pricing pages). To change plan limits, edit `FREE_LISTING_LIMIT`, `FREE_REQUIREMENT_LIMIT`, `PRO_LISTING_LIMIT`, and `PRO_REQUIREMENT_LIMIT` in the same file (Premium is always unlimited). The commission rate used on the dashboard (`COMMISSION_RATE`, default 3%) also lives there.

### Manually upgrading an agent to Pro or Premium

Once an agent pays and messages you:

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and open your Hartahub cluster.
2. Click **Browse Collections**, then open the `users` collection.
3. Find the agent by their email address.
4. Click the pencil/edit icon on that document, change `"plan": "free"` to `"plan": "pro"` or `"plan": "premium"` depending on what they paid for, and save.
5. (Optional) Add a `"planExpiresAt"` field with a future date (e.g. one month from now, in ISO format like `"2026-09-01T00:00:00.000Z"`) if you want their upgrade to automatically lapse. Leave it out for an indefinite upgrade.

No code changes or redeploys needed - the change takes effect the next time that agent loads the app.

## Part 7 - Photo uploads (Cloudinary)

Pro and Premium agents can upload a real front photo of the unit instead of pasting a link. Photos are stored on [Cloudinary](https://cloudinary.com) (not on Render's disk, which is wiped on every restart/redeploy) using their generous free tier.

1. Go to [cloudinary.com](https://cloudinary.com) and create a free account.
2. On your Cloudinary dashboard, you'll see **Cloud Name**, **API Key**, and **API Secret**.
3. In Render, go to your web service > **Environment**, and add:
   - `CLOUDINARY_CLOUD_NAME` = your cloud name
   - `CLOUDINARY_API_KEY` = your API key
   - `CLOUDINARY_API_SECRET` = your API secret
4. Save changes - Render will redeploy automatically. That's it; no code changes needed.

Until these three variables are set, the upload button will show a friendly error and Free/Pro/Premium agents can still paste a photo link instead. Free-plan agents can always paste a link - the upload button only appears for Pro and Premium.

## Part 8 - REN verification (gold tick)

Agents can optionally enter their REN (Registered Estate Negotiator) number when signing up. This is stored but **not automatically verified** - you decide when to flip on the gold tick next to their name.

1. Ask the agent to send proof of their REN status (e.g. a photo of their REN tag/card) via WhatsApp or email.
2. Go to [cloud.mongodb.com](https://cloud.mongodb.com), open the `users` collection, and find the agent by email.
3. Confirm the `renNumber` field matches what they sent you.
4. Edit the document, change `"renVerified": false` to `"renVerified": true`, and save.

The gold tick then appears next to their name in the nav bar, on their listings, on their buyer requirements, and in match results wherever their name shows up - no redeploy needed.
