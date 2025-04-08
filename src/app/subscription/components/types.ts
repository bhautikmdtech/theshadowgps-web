export interface Customer {
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
}

export interface Device {
  deviceName: string;
  deviceImage?: string | null;
}

export interface Subscription {
  id: string;
  status: string;
  amount: string;
  interval: string;
  intervalCount?: number;
  renewalDate: string;
  cancelAt?: string;
  isCancelled?: boolean;
  isInGracePeriod?: boolean;
  graceEndDate?: string;
  gracePeriodMessage?: string;
  isCollectionPaused?: boolean;
  resumeAt?: string;
  device?: Device;
  paymentMethod?: PaymentMethod;
  planId: string;
  paymentStatus?: string;
  gracePeriodRemainingDays?: number;
  currentPeriodEnd: string;
  isFreeTrial: boolean;
  nextPaymentAttempt?: string;
  pauseResumesAt?: string;
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
  clientSecret: string;
  endDate: Date;
  invoices?: {
    data: Invoice[];
    hasMore: boolean;
  };
}
