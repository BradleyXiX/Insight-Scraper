import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;

  // Billing is optional. Building the client at module scope made the whole
  // Next.js build fail whenever the key was absent — which is every local build
  // and every CI run. Fail closed at request time instead.
  if (!secretKey || !priceId) {
    return new NextResponse("Billing is not configured", { status: 503 });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2026-04-22.dahlia", // Use the latest API version or your account's default
  });

  try {
    const { userId, orgId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!orgId) {
      return new NextResponse("User must belong to an Organization to subscribe", { status: 403 });
    }

    // Determine the host URL for success/cancel redirects
    const host = req.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    const appUrl = `${protocol}://${host}`;

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/dashboard?success=1`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
      subscription_data: {
        metadata: {
          tenant_id: orgId, // Crucial: This links the subscription to the Clerk Organization
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Stripe Checkout Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
