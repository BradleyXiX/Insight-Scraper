'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PricingCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  priceId: string;
  isPopular?: boolean;
}

export function PricingCard({
  name,
  price,
  description,
  features,
  priceId,
  isPopular,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        alert('You must be logged in to upgrade.');
        return;
      }

      // We'll assume the backend is hosted at http://localhost:8000 for local dev
      // In production, this should be an environment variable.
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/dashboard?success=true`,
          cancel_url: `${window.location.origin}/dashboard/pricing?canceled=true`,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned', data);
        alert('Failed to start checkout process.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred while starting checkout.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col p-8 rounded-3xl bg-white border transition-all duration-200 hover:shadow-xl",
        isPopular ? "border-indigo-600 shadow-lg scale-105" : "border-gray-200"
      )}
    >
      {isPopular && (
        <div className="absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1 text-center text-sm font-medium text-white shadow-sm">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900">{name}</h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>

      <div className="mb-6 flex items-baseline text-5xl font-extrabold text-gray-900">
        ${price}
        <span className="ml-1 text-xl font-medium text-gray-500">/mo</span>
      </div>

      <ul className="mb-8 flex-1 space-y-4">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start">
            <div className="flex-shrink-0">
              <Check className="h-6 w-6 text-indigo-500" />
            </div>
            <p className="ml-3 text-base text-gray-700">{feature}</p>
          </li>
        ))}
      </ul>

      <button
        onClick={handleCheckout}
        disabled={isLoading}
        className={cn(
          "mt-auto block w-full rounded-xl px-6 py-4 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors",
          isPopular
            ? "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600"
            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
          isLoading && "opacity-70 cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          "Upgrade to " + name
        )}
      </button>
    </div>
  );
}
