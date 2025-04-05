// src/services/subscriptionService.ts
import axiosClient from "@/lib/axiosClient";

export const SubscriptionService = {
  async getSubscriptionData(token: string) {
    const response = await axiosClient.get(
      "/api/app/subscription/getStripeData",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
    return response.data;
  },

  async cancelSubscription(token: string, subscriptionId: string) {
    const response = await axiosClient.post(
      `/api/app/subscription/${subscriptionId}/cancel`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    return response.data;
  },

  async reactivateSubscription(token: string, subscriptionId: string) {
    const response = await axiosClient.post(
      `/api/app/subscription/${subscriptionId}/reactivate`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    return response.data;
  },

  async updateSubscriptionPlan(
    token: string,
    subscriptionId: string,
    newPriceId: string
  ) {
    const response = await axiosClient.put(
      `/api/app/subscription/${subscriptionId}/update`,
      {
        newPriceId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    return response.data;
  },

  async updatePaymentMethod(
    token: string,
    subscriptionId: string,
    paymentMethodId: string
  ) {
    const response = await axiosClient.put(
      `/api/app/subscription/${subscriptionId}/payment-method`,
      {
        paymentMethodId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    return response.data;
  },
  async updateBillingInfo(
    token: string,
    subscriptionId: string,
    data: {
      name: string;
      email: string;
    }
  ) {
    const response = await axiosClient.put(
      `/api/app/subscription/customer/${subscriptionId}/billing`,
      {
        name: data.name,
        email: data.email,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    return response.data;
  },
  async makeDefaultPaymentMethod(
    token: string,
    customerId: string,
    paymentMethodId: string
  ) {
    const response = await axiosClient.put(
      `/api/app/subscription/payment-methods/${customerId}/default`,
      {
        paymentMethodId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    return response.data;
  },
  async deletePaymentMethod(token: string, paymentMethodId: string) {
    const response = await axiosClient.put(
      `/api/app/subscription/payment-methods/${paymentMethodId}`,
      {
        paymentMethodId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    return response.data;
  },
  async loadMoreInvoices(token: string, limit: number, customerId: string) {
    const response = await axiosClient.get(
      `/api/app/subscription/invoices/${customerId}?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );
    console.log(response);
    return response.data;
  },
};
