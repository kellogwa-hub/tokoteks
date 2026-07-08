import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

export async function POST(req) {
  try {
    const { email, userId } = await req.json();

    if (!process.env.MIDTRANS_SERVER_KEY) {
      return NextResponse.json({ error: "MIDTRANS_SERVER_KEY belum diisi di Vercel!" }, { status: 500 });
    }

    let snap = new midtransClient.Snap({
      isProduction: false, 
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    let parameter = {
      transaction_details: {
        order_id: 'TOKOTEKS-' + Date.now() + '-' + userId.substring(0, 5),
        gross_amount: 10000, 
      },
      customer_details: {
        email: email,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    // KITA KIRIM TOKEN SNAP & CLIENT KEY KE FRONTEND
    return NextResponse.json({ 
      token: transaction.token,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

  } catch (error) {
    console.error('Midtrans Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}