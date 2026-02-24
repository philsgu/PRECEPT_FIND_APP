# SAMC FM Preceptor Coverage Dashboard

A modern Next.js 14 web application deployed on Vercel that replaces the Streamlit `main.py` script. It pulls live AMION schedule data, identifies preceptor shortage/overage dates, and sends automated weekly Resend email notifications.

---

## Features

- **Dashboard** — Live stats cards, ratio trend chart, shortage/overage tables
- **Month + Year selector** — View any month/year combination (2024–2026)
- **Calendar date-range filter** — Narrow results to a specific window of dates
- **AM & PM session tabs** — Toggle between morning, afternoon, or both sessions
- **Shortage / Overage / All views** — Filter table by compliance status
- **"Send Alert Now" button** — Manually trigger shortage email at any time
- **Weekly automated email** — Vercel Cron calls `/api/send-weekly-report` every Monday at 09:00 UTC and sends a formatted HTML report via [Resend](https://resend.com) if shortages are detected

---

## Quick Start

```bash
cd /Users/pkimmd/PRECEPT_FIND_APP
npm install
cp .env.example .env.local
# fill in .env.local, then:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable        | Description                                               | Required |
|----------------|-----------------------------------------------------------|----------|
| `AMION_ID`      | Your AMION login ID (e.g. `gmesamc!`)                    | ✅        |
| `RESEND_API_KEY`| API key from [resend.com](https://resend.com/api-keys)   | ✅        |
| `CRON_SECRET`   | Random secret to protect the cron endpoint               | Recommended |

### Setting variables in Vercel

1. Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**
2. Add `AMION_ID`, `RESEND_API_KEY`, and `CRON_SECRET`
3. Redeploy for changes to take effect

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

The `vercel.json` already configures the weekly cron:

```json
{ "crons": [{ "path": "/api/send-weekly-report", "schedule": "0 9 * * 1" }] }
```

This fires every **Monday at 09:00 UTC**. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically.

---

## Resend Setup

1. Sign up at [resend.com](https://resend.com) and verify your sending domain.
2. Update the `from` address in `lib/email.ts` to use your verified domain:
   ```ts
   from: 'SAMC FM Dashboard <noreply@yourdomain.com>',
   ```
3. Add your `RESEND_API_KEY` to Vercel environment variables.

---

## Project Structure

```
app/
  layout.tsx                  Root layout + font
  page.tsx                    Main dashboard (client component)
  globals.css                 Tailwind base styles
  api/
    preceptors/route.ts       GET /api/preceptors?month=&year=&startDate=&endDate=
    send-weekly-report/route.ts  GET /api/send-weekly-report (Vercel Cron target)
components/
  StatsCard.tsx               Gradient stat card
  CoverageTable.tsx           Sortable data table with status badges
  CoverageChart.tsx           Recharts line chart with compliance threshold line
  DateRangePicker.tsx         Date range inputs
lib/
  amion.ts                    AMION CSV fetch + parse + ratio logic
  email.ts                    Resend HTML email builder + sender
vercel.json                   Cron schedule config
.env.example                  Required env vars template
```

---

## Compliance Logic

| Condition           | Formula              | Result   |
|---------------------|----------------------|----------|
| Shortage            | preceptors / residents < 0.25 | ⚠️ Needs action |
| Compliant (1:4)     | preceptors / residents = 0.25 | ✅ OK |
| Overage             | preceptors / residents > 0.25 | 📈 Above threshold |

Resident types counted: `NW`, `UC`, `NW-ADD`
