import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';

export async function POST(req) {
  try {
    const { email, userId } = await req.json();

    if (!process.env.MIDTRANS_SERVER_KEY) {
      return NextResponse.json({ error: "MIDTRANS_SERVER_KEY belum diisi di Environment Variables Vercel!" }, { status: 500 });
    }

    // Inisialisasi Midtrans Snap Sandbox
    let snap = new midtransClient.Snap({
      isProduction: false, 
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY
    });

    // Parameter transaksi dasar Midtrans (Contoh Paket Rp 10.000)
    let parameter = {
      transaction_details: {
        order_id: 'TOKOTEKS-' + Date.now() + '-' + userId.substring(0, 5),
        gross_amount: 10000, 
      },
      customer_details: {
        email: email,
      },
    };

    // Minta link pembayaran dari Midtrans
    const transaction = await snap.createTransaction(parameter);

    // Kirim url pembayaran kembali ke frontend
    return NextResponse.json({ url: transaction.redirect_url });

  } catch (error) {
    console.error('Midtrans Backend Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}