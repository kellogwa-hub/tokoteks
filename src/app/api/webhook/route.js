import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Menggunakan KUNCI MASTER karena Webhook tidak punya KTP sesi login
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Mengekstrak status dan KTP yang kita titipkan tadi
    const { transaction_status, custom_field1, order_id } = body;

    // Midtrans mengirim banyak status (pending, expire, dll). Kita hanya proses yang LUNAS.
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      const userId = custom_field1;

      if (userId) {
        // 1. Cek saldo saat ini di brankas
        const { data: userCredit } = await supabase
          .from('user_credits')
          .select('kredit')
          .eq('id', userId)
          .single();

        if (userCredit) {
          // 2. Tambahkan 10 Token secara gaib di latar belakang!
          const koinBaru = userCredit.kredit + 10;
          await supabase
            .from('user_credits')
            .update({ kredit: koinBaru })
            .eq('id', userId);
            
          console.log(`✅ [WEBHOOK] Sukses! 10 Token ditambahkan untuk Order: ${order_id}`);
        }
      }
    }

    // Midtrans hanya butuh dijawab "OK / 200" agar tidak mengirim ulang terus-terusan
    return NextResponse.json({ success: true, message: 'Notifikasi Diterima' });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}