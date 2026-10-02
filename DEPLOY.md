# Deploying Netfall to Vercel

The site works with **no configuration at all**: live comparison, the public
API and the status page need nothing. Everything else is switched on by
environment variables, and each feature says plainly on the page when it is
not on yet.

## 1. Import the project

1. In Vercel, **Add New → Project** and import `Emmyhack/Netfall`. The
   framework preset is detected as Next.js; keep the defaults.
2. `vercel.json` pins server functions to **Frankfurt (`fra1`)**. Keep it:
   Vercel's default US region is geo-blocked by Binance, and Frankfurt is
   well connected to Lagos, Accra and Nairobi.
3. Deploy. Then open `/status` on the new URL. It makes a real quote request
   per corridor and shows which providers answer from Vercel's network.

## 2. Environment variables

Set these under **Project → Settings → Environment Variables** for the
Production environment, then **redeploy**. The forms decide at build time
whether to show as active, so a variable added later needs a new deploy.

| Variable | Needed for | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical links, sitemap, emails | Your domain, e.g. `https://netfall.io`. Optional until you attach one: Vercel's production URL is used. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Alerts, enquiries, history, rate limits | Added automatically when you connect **Upstash for Redis** from the Vercel Marketplace (Storage tab). `UPSTASH_REDIS_REST_URL` / `_TOKEN` also work. |
| `RESEND_API_KEY` | All email | From resend.com, after verifying your sending domain. |
| `EMAIL_FROM` | All email | A sender on that verified domain, e.g. `Netfall <alerts@netfall.io>`. |
| `ALERTS_TOKEN_SECRET` | Rate alerts | A random string of at least 32 characters (`openssl rand -base64 48`). Changing it invalidates every confirm and unsubscribe link already sent. |
| `ENQUIRY_INBOX` | Large-amount enquiries | The inbox that receives them. Someone must read it: the site tells people a person replies. |
| `CONTACT_EMAIL` | Privacy and terms pages | Where people write about their data. Falls back to `ENQUIRY_INBOX`. |
| `CRON_SECRET` | Scheduled tick | A random string of at least 16 characters. |
| `NEXT_PUBLIC_VERCEL_ANALYTICS` | Page-view analytics | `1`, after enabling **Web Analytics** for the project. Cookieless. |
| `YELLOWCARD_API_KEY`, `YELLOWCARD_SECRET_KEY` | Yellow Card prices | From a Yellow Card business account. Their production API only accepts allow-listed IPs, which on Vercel needs **Static IPs**, a paid add-on. |

What each feature needs:

- **Rate alerts:** Redis, `RESEND_API_KEY`, `EMAIL_FROM` and `ALERTS_TOKEN_SECRET`.
- **Enquiries:** Redis, `RESEND_API_KEY`, `EMAIL_FROM` and `ENQUIRY_INBOX`.
- **Rate history, provider reliability and alert delivery:** Redis plus the scheduled tick (section 3).
- **Rate limiting:** Redis. Without it, requests are not limited, so add the firewall rule in section 4.

## 3. Schedule the tick

`/api/cron/tick` measures every corridor. It records rate history and
provider reliability and sends due alerts. It must run every 15 minutes.
Vercel's Hobby plan only allows daily cron, so the repo runs it from GitHub
Actions (`.github/workflows/tick.yml`), which works on any plan:

1. In GitHub, go to **Settings → Secrets and variables → Actions** and add:
   - `NETFALL_URL`: the production origin, e.g. `https://netfall.vercel.app`
   - `CRON_SECRET`: the same value as on Vercel
2. Open **Actions → Scheduled tick → Run workflow** to run it once now. It
   should succeed and print `"ok":true`.

GitHub only runs scheduled workflows from the default branch, so this starts
once the PRs are merged into `main`.

## 4. Firewall (recommended)

In **Project → Firewall**, add a rate-limit rule for `/api/*`. For example,
300 requests per minute per IP, then deny. This backs up the in-app limits,
and is the only limit if Redis is not connected.

## 5. After deploying

- `/status` should show Quidax answering. Binance P2P and Luno have never
  been confirmed from a production host; this page is where you find out.
  A provider showing "Not responding" there should be investigated, not
  hidden.
- Set up an alert to your own address, confirm it, and run the workflow
  manually. A target rate above today's price fires on the first tick.
- Send a test enquiry from `/large-amounts` and check `ENQUIRY_INBOX`.

## Before relying on it

- Have the privacy and terms pages reviewed by a lawyer for the countries you
  serve: Nigeria's NDPA, Ghana's Data Protection Act and Kenya's Data
  Protection Act. They describe exactly what the code does, but they are not
  legal advice.
- Only Quidax is confirmed live today. A comparison needs at least two
  answering providers to show a spread. Getting Binance P2P and Luno
  confirmed, and adding partner APIs, is what makes the product useful.
