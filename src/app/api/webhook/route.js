import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Gunakan Service Role Key untuk menembus tembok keamanan (RLS) Supabase dari belakang layar
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  try {
    const body = await req.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, custom_field1 } = body;

    // 1. VERIFIKASI KEAMANAN (Pastikan yang mengetuk pintu benar-benar Midtrans, bukan peretas)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const hash = crypto.createHash('sha512').update(order_id + status_code + gross_amount + serverKey).digest('hex');
    
    if (hash !== signature_key) {
      return NextResponse.json({ error: 'Akses Ditolak: Kunci Rahasia Palsu!' }, { status: 403 });
    }

    // 2. CEK STATUS PEMBAYARAN
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      if (fraud_status !== 'challenge') {
        const emailUser = custom_field1; // Ini email yang kita titipkan di Langkah 1
        
        // 3. PROSES PENAMBAHAN TOKEN DI SUPABASE
        if (emailUser) {
          // Ambil sisa saldo saat ini
          const { data: userData } = await supabase.from('user_credits').select('kredit').eq('email', emailUser).single();
          
          const saldoSekarang = userData ? userData.kredit : 0;
          const saldoBaru = saldoSekarang + 10; // 10.000 Rupiah = 10 Token
          
          // Suntikkan saldo baru ke database
          if (userData) {
            await supabase.from('user_credits').update({ kredit: saldoBaru }).eq('email', emailUser);
          } else {
            await supabase.from('user_credits').insert([{ email: emailUser, kredit: saldoBaru }]);
          }
        }
      }
    }

    // 4. BERI JEMPOL KE MIDTRANS (200 OK) AGAR MEREKA TIDAK MENGIRIM NOTIFIKASI BERULANG KALI
    return NextResponse.json({ success: true, message: 'Laporan kasir berhasil diterima' });

  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}