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

## Background admin order notifications

The admin dashboard uses Web Push so subscribed devices can receive new-order notifications while the dashboard is closed. The server requires `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`; these are configured in the ignored local `.env.local` for development. Add the same VAPID key pair to the hosting provider's server-side environment variables and set `VAPID_SUBJECT` to a valid `mailto:` contact or the production site URL, then redeploy. Never expose the private key with a `NEXT_PUBLIC_` prefix or commit it.

On each admin device, open the deployed dashboard, go to **Orders**, select **Enable Order Notifications**, and allow browser notifications. Keep notifications enabled in the device/browser settings. The service worker displays background notifications and opens the dashboard when tapped. Notification sounds are controlled by the operating system/browser; the web app cannot force a custom sound. Background delivery requires a supported browser, HTTPS, and an internet connection.

## Secure Telegram webhook

The Telegram webhook rejects requests unless these server-side Vercel Production environment variables are configured:

- `TELEGRAM_WEBHOOK_SECRET`: a random secret using only letters, numbers, underscores, and hyphens. Use the same value when registering the Telegram webhook.
- `TELEGRAM_ADMIN_IDS`: comma-separated numeric Telegram user IDs allowed to update orders.
- `TELEGRAM_CHAT_ID`: the Telegram chat where order notifications and admin actions are expected.

### Easy 1-Click Telegram Webhook Setup (Recommended)

Once deployed to Vercel, simply open this URL in your web browser:
```
https://<your-production-domain>/api/telegram-webhook?setup=1
```
This automatically registers the webhook with Telegram Bot API, syncs your `TELEGRAM_WEBHOOK_SECRET`, and enables button callback handling immediately with zero command line needed!

### Manual Setup via curl (Alternative)

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://<production-domain>/api/telegram-webhook","secret_token":"<same TELEGRAM_WEBHOOK_SECRET value>"}'
```

To verify the webhook status at any time, visit `https://<your-production-domain>/api/telegram-webhook`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
