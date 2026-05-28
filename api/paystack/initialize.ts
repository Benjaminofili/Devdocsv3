import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withSentry } from '../_lib/withSentry.js';
import { TIERS, TierId } from '../../shared/tiers.config.js';

async function handler(request: VercelRequest, response: VercelResponse) {
  // CORS Configuration
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, userId, plan, amount } = request.body;

  // Accept either plan OR amount
  if (!email || !userId || (!plan && !amount)) {
    return response.status(400).json({
      error: 'Missing required fields: email, userId, and either plan or amount',
    });
  }

  try {
    let paystackPayload: any = {
      email,
      metadata: {
        firebaseUid: userId,
        plan: plan || 'free',
      },
      callback_url: `${request.headers.origin}/dashboard?payment=success`,
    };

    if (plan && TIERS[plan as TierId]?.paystackPlanCode) {
      paystackPayload.plan = TIERS[plan as TierId].paystackPlanCode;
    } else if (amount) {
      paystackPayload.amount = amount;
    } else {
      return response.status(400).json({ error: 'Invalid payment configuration' });
    }

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackPayload),
    });

    const data = await paystackResponse.json();

    if (!paystackResponse.ok || !data.status) {
      return response
        .status(paystackResponse.status)
        .json({ error: 'Paystack Initialization Failed', details: data.message || 'Unknown error' });
    }

    return response.status(200).json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('[API/PAYSTACK/INITIALIZE] Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withSentry(handler);
