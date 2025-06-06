/**
 * Service for handling Stripe API operations
 */

interface StripeApiResponse<T> {
  error?: {
    message: string;
  };
  [key: string]: any;
}

/**
 * Attaches a payment method to a Stripe customer
 * @param paymentMethodId The ID of the payment method to attach
 * @param customerId The Stripe customer ID
 * @param secretKey The Stripe secret key
 * @returns The API response
 */
export const attachPaymentMethod = async (
  paymentMethodId: string,
  customerId: string,
  secretKey: string
): Promise<StripeApiResponse<any>> => {
  const response = await fetch(
    `https://api.stripe.com/v1/payment_methods/${paymentMethodId}/attach`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${secretKey}`,
      },
      body: new URLSearchParams({
        customer: customerId,
      }).toString(),
    }
  );

  const result = await response.json();
  return result;
};
