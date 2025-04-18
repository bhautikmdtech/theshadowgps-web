import { Metadata } from "next";
import axiosClient from "@/lib/axiosClient";
import PaymentStatusViewer from "./PaymentStatusViewer";

export const metadata: Metadata = {
  title: "Payment Status - ShadowGPS",
  description: "View your payment status and subscription details",
};

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string }>;
}) {
  const { transaction_id, status } = await searchParams;

  try {
    const response = await axiosClient.get(
      `/api/app/noauth/getPaymentStatus/${transaction_id}/${status}`,
      {
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-store",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

    return <PaymentStatusViewer response={response.data} />;
  } catch (error) {
    console.error("Error fetching payment status:", error);
    return (
      <PaymentStatusViewer
        response={{
          status: "error",
          error: "Failed to load payment status. Please try again later.",
        }}
      />
    );
  }
}
