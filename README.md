# hubspot_forms

Next.js app for custom HubSpot forms (medical questionnaire).

This version uses a stored questionnaire schema in code (no runtime fetch of HubSpot Form definitions on page load). The page only:

1. fetches contact properties (when `contact_id` is present), and
2. submits updates to HubSpot contacts.

## Routes

- `/` -> redirects to `/medical_questionnaire`
- `/medical_questionnaire` -> questionnaire page (`lang=de|en`, optional `contact_id`)

## Stored Form Schema

The questionnaire structure and labels are stored in:

- `app/medical_questionnaire/schema.ts`

If you need to change questions, required fields, labels, or options, update this file.

## Environment Variables

Set in Vercel (or `.env.local`):

- `HUBSPOT_TOKEN` (required)
- `HUBSPOT_PORTAL_ID` (optional)
- `HUBSPOT_SECRET` (optional)

## Run locally

```bash
npm install
npm run dev
```

Open: `http://localhost:3000/medical_questionnaire`

## Deploy

Connect repo in Vercel, keep Root Directory empty, and set env vars.
