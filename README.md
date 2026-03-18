# hubspot_forms

Next.js app for custom HubSpot forms (e.g. medical questionnaire). Fetches form definitions from the HubSpot Forms API, prefills/updates contacts via the CRM API.

## Routes

- **`/`** — Redirects to `/medical_questionnaire`.
- **`/medical_questionnaire`** — Medical questionnaire (DE/EN). Query params:
  - `contact_id` — HubSpot contact ID for prefill and PATCH on submit.
  - `lang` — `de` or `en` (default: `de`).

## Environment

Set in Vercel (or `.env.local` for local dev):

- **`HUBSPOT_TOKEN`** — HubSpot private app token (required).
- **`HUBSPOT_PORTAL_ID`** — Optional.
- **`HUBSPOT_SECRET`** — Optional.

## Form IDs

- DE: `2HWzjWa9sTuKJCYnrdu_0ogsn7kf`
- EN: `2u74nBol5RzeXmtFWMqVO-wsn7kf`

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000/medical_questionnaire](http://localhost:3000/medical_questionnaire). Add `?contact_id=123&lang=en` to test with a contact.

## Deploy (Vercel)

Connect this repo; leave Root Directory empty. Add `HUBSPOT_TOKEN` (and optional env) in project settings.
