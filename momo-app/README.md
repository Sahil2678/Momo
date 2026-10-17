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

## Telegram order notifications

The order API reads `TELEGRAM_TOKEN` and `TELEGRAM_CHAT_ID` on the server. Add both variables in the Vercel project's **Settings > Environment Variables** for the Production environment (and Preview too, if testing preview deployments), then redeploy. Do not prefix them with `NEXT_PUBLIC_` or commit their values. The bot must also be able to send messages to the configured chat.

If an order still does not appear, check the Vercel function logs for the order API request; Telegram API errors are logged there. If the receipt PDF cannot be sent, the API attempts to send the order details as a text message instead.

## Secure Telegram webhook

The Telegram webhook rejects requests unless these server-side Vercel Production environment variables are configured:

- `TELEGRAM_WEBHOOK_SECRET`: a random secret using only letters, numbers, underscores, and hyphens. Use the same value when registering the Telegram webhook.
- `TELEGRAM_ADMIN_IDS`: comma-separated numeric Telegram user IDs allowed to update orders.
- `TELEGRAM_CHAT_ID`: the Telegram chat where order notifications and admin actions are expected.

After adding the variables, redeploy and register/update the webhook with Telegram's `secret_token` set to the same `TELEGRAM_WEBHOOK_SECRET`. The webhook URL is `https://<production-domain>/api/telegram-webhook`. Do not put the bot token or webhook secret in source code or share them.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
