This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production migrations

The production build runs Prisma migrations before building the app:

```bash
npm run build
```

That script runs `prisma migrate deploy`, then `prisma generate`, then `next build`. This keeps production code from deploying before required database tables or columns exist.

For local build checks that should not apply migrations, use:

```bash
npm run build:local
```

## Email notifications

Report-ready peer emails use the Resend HTTP API. Add these environment variables in Vercel:

```bash
REPORT_EMAIL_DELIVERY_ENABLED=true
RESEND_API_KEY=...
REPORT_EMAIL_FROM="Accountability Tracker <reports@your-domain.com>"
NEXT_PUBLIC_APP_URL="https://your-production-url"
```

Email delivery is disabled unless `REPORT_EMAIL_DELIVERY_ENABLED` is set to `true`. If email delivery is disabled or the Resend variables are missing, report generation still succeeds and email delivery is skipped.
