import webPush, { type PushSubscription } from "web-push";
import { connectToDatabase } from "@/lib/mongodb";
import PushSubscriptionModel from "@/models/PushSubscription";

export function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Web Push is not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.");
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  return publicKey;
}

export async function notifyAdminsOfNewOrder(order: {
  id: string;
  total: number;
  customerName: string;
}) {
  configureWebPush();
  await connectToDatabase();

  const subscriptions = await PushSubscriptionModel.find().lean();
  const payload = JSON.stringify({
    title: "New Momo Order",
    body: `${order.customerName} placed an order for ₹${order.total.toLocaleString("en-IN")}.`,
    tag: `order-${order.id}`,
    url: "/dashboard",
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const pushSubscription: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      try {
        await webPush.sendNotification(pushSubscription, payload);
      } catch (error) {
        const statusCode =
          typeof error === "object" && error !== null && "statusCode" in error
            ? Number(error.statusCode)
            : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await PushSubscriptionModel.deleteOne({ _id: subscription._id });
          return;
        }

        console.error("Web Push delivery failed:", {
          endpoint: subscription.endpoint,
          statusCode,
          error,
        });
      }
    })
  );
}
