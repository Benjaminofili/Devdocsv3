import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless Function: Initialize Paystack Subscription Transaction
 * Endpoint: /api/paystack/initialize
 */
import { withSentry } from '../_lib/withSentry.js';

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // CORS Configuration
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, amount, userId } = request.body;

  if (!email || !amount || !userId) {
    return response.status(400).json({ error: 'Missing required fields: email, amount, userId' });
  }

  try {
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        amount,
        plan: 'PLN_y204dppkjg7r8mv',
        callback_url: `${request.headers.origin}/dashboard`,
        metadata: {
          userId
        }
      })
    });

    const data = await paystackResponse.json();

    if (!paystackResponse.ok || !data.status) {
      return response.status(paystackResponse.status).json({
        error: 'Paystack Initialization Failed',
        details: data.message || 'Unknown error'
      });
    }

    return response.status(200).json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference
    });

  } catch (error) {
    console.error('[API/PAYSTACK/INITIALIZE] Error:', error);
    return response.status(500).json({ error: 'Internal Server Error' });
  }
}

export default withSentry(handler);

