import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email diperlukan" }, { status: 400 });

    // Ambil data token saat ini
    const { data } = await supabase.from('user_credits').select('kredit').eq('email', email).single();
    
    // Tambah 10 token instan
    const saldoBaru = (data ? data.kredit : 0) + 10;

    if (data) {
      await supabase.from('user_credits').update({ kredit: saldoBaru }).eq('email', email);
    } else {
      await supabase.from('user_credits').insert([{ email, kredit: saldoBaru }]);
    }

    return NextResponse.json({ success: true, saldoBaru });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}