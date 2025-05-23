// src/services/subscriptionService.ts
import axiosClient from "@/lib/axiosClient";

// Define custom error type with response property
interface ApiError extends Error {
  response?: any;
}

// Helper function to handle API errors consistently
const handleApiError = (error: any) => {
  if (error.response) {
    // The request was made and the server responded with a status code outside of 2xx range
    const errorData = error.response.data;
    const errorMessage = errorData?.message || errorData?.error || "API error occurred";
    const customError = new Error(errorMessage) as ApiError;
    customError.response = error.response;
    throw customError;
  } else if (error.request) {
    // The request was made but no response was received
    throw new Error("No response received from server. Please check your connection.");
  } else {
    // Something happened in setting up the request that triggered an Error
    throw new Error(error.message || "An unexpected error occurred");
  }
};

export const SubscriptionService = {
  async getSubscriptionData(token: string) {
    try {
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
    } catch (error) {
      handleApiError(error);
    }
  },

  async cancelSubscription(token: string, subscriptionId: string) {
    try {
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
    } catch (error) {
      handleApiError(error);
    }
  },

  async reactivateSubscription(token: string, subscriptionId: string) {
    try {
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
    } catch (error) {
      handleApiError(error);
    }
  },

  async updateSubscriptionPlan(
    token: string,
    subscriptionId: string,
    newPriceId: string
  ) {
    try {
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
    } catch (error) {
      handleApiError(error);
    }
  },

  async createNewSubscription(
    token: string,
    priceId: string,
    customerId: string,
    paymentMethodId: string,
    metadata: Record<string, string>
  ) {
    try {
      const response = await axiosClient.post(
        `/api/app/subscription/createNewSubscription`,
        {
          priceId,
          customerId,
          paymentMethodId,
          metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
  
  async updatePaymentMethod(
    token: string,
    subscriptionId: string,
    paymentMethodId: string
  ) {
    try {
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
    } catch (error) {
      handleApiError(error);
    }
  },
  
  async updateBillingInfo(
    token: string,
    subscriptionId: string,
    data: {
      name: string;
      email: string;
    }
  ) {
    try {
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
    } catch (error) {
      handleApiError(error);
    }
  },
  
  async makeDefaultPaymentMethod(
    token: string,
    customerId: string,
    paymentMethodId: string
  ) {
    try {
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
    } catch (error) {
      handleApiError(error);
    }
  },
  
  async deletePaymentMethod(token: string, paymentMethodId: string) {
    try {
      const response = await axiosClient.delete(
        `/api/app/subscription/payment-methods/${paymentMethodId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
  
  async loadMoreInvoices(token: string, limit: number, customerId: string) {
    try {
      const response = await axiosClient.get(
        `/api/app/subscription/invoices/${customerId}?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },
};
