# Hartahub

A web app for Malaysian co-broking agents to list properties, browse listings from other agents, and get auto-matched with buyer requirements by budget and location.

This guide assumes **zero prior technical experience**. Follow it top to bottom.

## What's in this project

- `server.js` - starts the app
- `models/` - what a User, Listing, and Requirement look like in the database
- `routes/` - the API endpoints the frontend calls (login, listings, requirements, matches)
- `utils/matching.js` - the matching logic (compares property type, state, and budget)
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
