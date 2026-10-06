/**
 * Payment System Utilities (Background - Not Enforced Yet)
 *
 * This file provides infrastructure for a payment system that's in the background.
 * It's not actively blocking users until activated by the admin.
 *
 * Once activated:
 * 1. Payment processing will be required for boosts and premium subscriptions
 * 2. Posting limits will be enforced based on subscription tier
 * 3. Ads limits will apply
 *
 * For now, this is just the structure and helper functions.
 */

export type PaymentPlan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  productLimit: number;
  gigLimit: number;
  adsLimit: number;
  features: string[];
};

/**
 * Payment plans (can be customized later)
 * These are generous plans as requested
 */
export const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: "free",
    name: "Free Plan",
    description: "Perfect for getting started",
    monthlyPrice: 0,
    productLimit: 5,
    gigLimit: 2,
    adsLimit: 2,
    features: [
      "5 active product listings",
      "2 active gigs",
      "2 active ads",
      "Basic analytics",
      "WhatsApp integration",
    ],
  },
  {
    id: "starter",
    name: "Starter Plan",
    description: "For active sellers",
    monthlyPrice: 4999, // ~$5 USD, reasonable for Tanzania
    productLimit: 25,
    gigLimit: 10,
    adsLimit: 10,
    features: [
      "25 active product listings",
      "10 active gigs",
      "10 active ads",
      "Advanced analytics",
      "WhatsApp integration",
      "1 free product boost per month",
      "Priority support",
    ],
  },
  {
    id: "business",
    name: "Business Plan",
    description: "For growing businesses",
    monthlyPrice: 9999, // ~$10 USD
    productLimit: 100,
    gigLimit: 50,
    adsLimit: 50,
    features: [
      "100 active product listings",
      "50 active gigs",
      "50 active ads",
      "Detailed analytics & reports",
      "WhatsApp integration",
      "4 free product boosts per month",
      "4 free gig boosts per month",
      "Bulk ad discounts",
      "Priority support",
      "Custom branding on profile",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    description: "For high-volume operations",
    monthlyPrice: 24999, // ~$25 USD
    productLimit: 500,
    gigLimit: 200,
    adsLimit: 200,
    features: [
      "Unlimited product listings",
      "Unlimited gigs",
      "Unlimited ads",
      "Real-time analytics & API access",
      "WhatsApp integration",
      "Unlimited boosts",
      "Dedicated account manager",
      "Custom reporting",
      "White-label options",
      "24/7 priority support",
    ],
  },
];

/**
 * Boost pricing (per level, per platform)
 */
export const BOOST_PRICING = {
  product: {
    basic: 9999, // 10k TZS (Level 1)
    popular: 19999, // 20k TZS (Level 2)
    featured: 49999, // 50k TZS (Level 3)
  },
  gig: {
    basic: 4999, // 5k TZS (Level 1)
    popular: 9999, // 10k TZS (Level 2)
    featured: 24999, // 25k TZS (Level 3)
  },
};

/**
 * Ad pricing
 */
export const AD_PRICING = {
  perAd: 9999, // 10k TZS per ad
  bulkDiscount: {
    5: 0.1, // 10% off for 5+ ads
    10: 0.15, // 15% off for 10+ ads
    20: 0.2, // 20% off for 20+ ads
  },
};

/**
 * Payment methods configuration
 * These are placeholders - implement actual integrations when needed
 */
export const SUPPORTED_PAYMENT_METHODS = [
  {
    id: "m_pesa",
    name: "M-Pesa",
    description: "Pay via M-Pesa (Tanzania)",
    enabled: false, // Not enabled yet
    requiresPhone: true,
  },
  {
    id: "airtel_money",
    name: "Airtel Money",
    description: "Pay via Airtel Money (Tanzania)",
    enabled: false,
    requiresPhone: true,
  },
  {
    id: "stripe",
    name: "Credit/Debit Card",
    description: "Visa, MasterCard via Stripe",
    enabled: false,
    requiresPhone: false,
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "PayPal (International)",
    enabled: false,
    requiresPhone: false,
  },
];

/**
 * Calculate total cost for boosts with discounts
 */
export function calculateBoostCost(
  itemType: "product" | "gig",
  boostLevel: 1 | 2 | 3,
  durationDays: number = 7,
): number {
  const baseCost =
    itemType === "product"
      ? boostLevel === 1
        ? BOOST_PRICING.product.basic
        : boostLevel === 2
          ? BOOST_PRICING.product.popular
          : BOOST_PRICING.product.featured
      : boostLevel === 1
        ? BOOST_PRICING.gig.basic
        : boostLevel === 2
          ? BOOST_PRICING.gig.popular
          : BOOST_PRICING.gig.featured;

  // Duration multiplier (7 days = 1x, 30 days = 1.2x, etc)
  const durationMultiplier = 1 + (durationDays - 7) * 0.01;

  return Math.round(baseCost * durationMultiplier);
}

/**
 * Calculate ad cost with bulk discount
 */
export function calculateAdCost(quantity: number): number {
  const basePerAd = AD_PRICING.perAd;
  let discountPercentage = 0;

  if (quantity >= 20) discountPercentage = AD_PRICING.bulkDiscount[20];
  else if (quantity >= 10) discountPercentage = AD_PRICING.bulkDiscount[10];
  else if (quantity >= 5) discountPercentage = AD_PRICING.bulkDiscount[5];

  const totalBeforeDiscount = basePerAd * quantity;
  const discount = totalBeforeDiscount * discountPercentage;

  return Math.round(totalBeforeDiscount - discount);
}

/**
 * Payment intent structure
 * This will be used when payment system is activated
 */
export interface PaymentIntent {
  id: string;
  userId: string;
  type: "boost" | "subscription" | "ad";
  itemId?: string;
  itemType?: "product" | "gig" | "ad";
  amount: number;
  currency: "TZS" | "USD";
  paymentMethod?: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  metadata?: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Create a payment intent (template for future implementation)
 */
export async function createPaymentIntent(
  userId: string,
  paymentType: "boost" | "subscription" | "ad",
  amount: number,
  metadata?: Record<string, unknown>,
): Promise<PaymentIntent> {
  // This is a template - actual implementation will integrate with payment provider
  const intent: PaymentIntent = {
    id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type: paymentType,
    amount,
    currency: "TZS",
    status: "pending",
    metadata,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minute expiry
  };

  // TODO: Save to database when payment system is activated
  console.log("Payment intent created (not persisted - system in background):", intent);

  return intent;
}

/**
 * Verify payment (template for future implementation)
 * This will check with payment provider (M-Pesa, Stripe, etc)
 */
export async function verifyPayment(
  paymentIntentId: string,
  _provider?: string,
): Promise<{ success: boolean; message: string }> {
  // This is a template - actual implementation will verify with provider
  console.log(`Payment verification not implemented (system in background): ${paymentIntentId}`);

  return {
    success: false,
    message: "Payment verification not yet implemented",
  };
}

/**
 * Process subscription upgrade
 * This will be called after payment is confirmed
 */
export async function upgradeSubscription(
  _userId: string,
  _planId: string,
): Promise<{ success: boolean; message: string }> {
  // TODO: Implement when payment system is activated
  console.log("Subscription upgrade not yet active");

  return {
    success: false,
    message: "Subscription upgrade not yet active",
  };
}

/**
 * Apply boost after payment
 * This will be called after payment is confirmed
 */
export async function applyBoost(
  _userId: string,
  _itemId: string,
  _itemType: "product" | "gig",
  _boostLevel: number,
): Promise<{ success: boolean; message: string }> {
  // TODO: Implement when payment system is activated
  console.log("Boost application not yet active");

  return {
    success: false,
    message: "Boost application not yet active",
  };
}

/**
 * Get payment status
 */
export async function getPaymentStatus(intentId: string): Promise<PaymentIntent | null> {
  // TODO: Fetch from database when payment system is activated
  console.log(`Getting payment status for: ${intentId}`);
  return null;
}

/**
 * Check if payment system is enabled
 * This allows for gradual rollout
 */
export function isPaymentSystemEnabled(): boolean {
  // This will be toggled by admin when ready
  // For now, always false to keep in background
  return false;
}

/**
 * Get applicable plan for user
 */
export function getUserPlan(planId: string): PaymentPlan | null {
  return PAYMENT_PLANS.find((p) => p.id === planId) ?? null;
}

/**
 * Calculate subscription renewal date
 */
export function getSubscriptionRenewalDate(currentDate: Date = new Date()): Date {
  const nextMonth = new Date(currentDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(currentDate.getDate());
  return nextMonth;
}
