import { PricingCard } from '@/components/PricingCard';

export default function PricingPage() {
  return (
    <div className="py-24 sm:py-32 bg-gray-50 flex-1 min-h-screen">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">Pricing</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Choose the right plan for your business
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
          Start for free, then upgrade when you need more power and deeper insights.
        </p>
        
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:gap-x-8 xl:gap-x-12">
          <PricingCard
            name="Basic"
            price="19"
            description="Perfect for individuals just getting started with local lead generation."
            priceId="price_basic_123"
            features={[
              "Up to 100 scrapes per day",
              "Standard email support",
              "Basic search filters",
              "CSV exports"
            ]}
          />
          
          <PricingCard
            name="Pro"
            price="49"
            description="For professional teams requiring unlimited scrapes and advanced features."
            priceId="price_pro_456"
            isPopular={true}
            features={[
              "Unlimited daily scrapes",
              "Priority 24/7 support",
              "Advanced search filters & custom fields",
              "API access",
              "Webhooks integration"
            ]}
          />
        </div>
      </div>
    </div>
  );
}
