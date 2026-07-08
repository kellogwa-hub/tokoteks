import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { userId, email } = await req.json();

    // 1. Mengambil kunci server dari brankas .env
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    // Midtrans mewajibkan kunci diubah ke format Base64
    const authString = Buffer.from(serverKey + ':').toString('base64');

    // 2. Meracik nota pesanan (Misal harga paket 10 Token = Rp 15.000)
    const payload = {
      transaction_details: {
        order_id: `TOKEN-${userId.substring(0,5)}-${Date.now()}`,
        gross_amount: 15000 
      },
      customer_details: { email: email },
      custom_field1: userId // <--- TITIPAN KTP UNTUK WEBHOOK
    };

    // 3. Mengirim nota ke Midtrans
    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error_messages?.[0] || 'Gagal membuat tagihan Midtrans');

    // 4. Mengembalikan Kunci Jendela Pembayaran (Snap Token) ke halaman depan
    return NextResponse.json({ success: true, token: data.token });

  } catch (error) {
    console.error("TopUp Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}