export interface Customer {
  userId: string;
  id: string;
  name: string | null;
  email: string | null;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  expired: boolean;
  expiredSoon: boolean;
  isSub: boolean;
}

export interface Device {
  deviceName: string;
  deviceImage?: string | null;
}

export interface Subscription {
  deviceId: string;
  subscriptionIdDb: string;
  id: string;
  status: string;
  amount: string;
  interval: string;
  interval_count?: number;
  renewalDate: string;
  cancelAt?: string;
  isCancelled?: boolean;
  isInGracePeriod?: boolean;
  graceEndDate?: string;
  gracePeriodMessage?: string;
  gracePeriodRemainingDays?: number;
  isCollectionPaused?: boolean;
  resumeAt?: string;
  device?: Device;
  paymentMethod?: PaymentMethod;
  planId: string;
  paymentStatus?: string;
  graceStatus?: string;
  currentPeriodEnd: string;
  isFreeTrial: boolean;
  nextPaymentAttempt?: string;
  pauseResumesAt?: string;
  reactivate?: boolean;
  pauseBehavior: string;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  amount: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  currency: string;
  status: string;
  url?: string;
}

export interface SubscriptionData {
  customer: Customer;
  subscriptions: Subscription[];
  paymentMethods: PaymentMethod[];
  plans: Plan[];
  stripePublishableKey: string;
  secret_key: string;
  clientSecret: string;
  endDate: Date;
  invoices?: {
    data: Invoice[];
    hasMore: boolean;
  };
}
