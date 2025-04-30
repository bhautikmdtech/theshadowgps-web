import { Suspense } from "react";
import { Metadata } from "next";
import AcceptDeviceInviteViewer from "./AcceptDeviceInviteViewer";
import axiosClient from "@/lib/axiosClient";

export const metadata: Metadata = {
  title: "Subscription Management",
  description: "Manage your subscription and payment details",
};

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) {
  const { userId, deviceId, secondaryNotificationId } = await searchParams;

  const payload: Record<string, any> = {
    secondaryUserId: userId,
    deviceId,
  };

  if (secondaryNotificationId) {
    payload.notificationId = secondaryNotificationId;
  }

  const response = await axiosClient.post(
    "/api/app/noauth/deviceInviteAccept",
    payload,
    {
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          Loading...
        </div>
      }
    >
      <AcceptDeviceInviteViewer response={response.data} />
    </Suspense>
  );
}
