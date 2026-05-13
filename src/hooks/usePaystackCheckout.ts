import { useState } from 'react';

interface CheckoutParams {
  email: string;
  amount: number; // in Kobo
  userId: string;
}

interface PaystackResponse {
  authorization_url: string;
}

/**
 * Reusable React Hook for Paystack Checkout Redirect
 */
export const usePaystackCheckout = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const initializeCheckout = async ({ email, amount, userId }: CheckoutParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, amount, userId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to initialize payment gateway');
      }

      const { authorization_url }: PaystackResponse = await response.json();

      if (authorization_url) {
        window.location.assign(authorization_url);
      } else {
        throw new Error('No authorization URL received');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    initializeCheckout,
    isLoading,
    error
  };
};
