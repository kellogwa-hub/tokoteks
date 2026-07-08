import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Menyiapkan kabel database khusus untuk mesin belakang
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  try {
    const body = await req.json();
    // Sekarang mesin menerima userId dari depan
    const { image, platform, style, userId } = body; 

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Sesi tidak valid, silakan login ulang.' }, { status: 401 });
    }

    // ==========================================
    // TAHAP 1: CEK BRANKAS SALDO PENGGUNA
    // ==========================================
    const { data: userCredit, error: creditError } = await supabase
      .from('user_credits')
      .select('kredit')
      .eq('id', userId)
      .single();

    if (creditError || !userCredit) {
      return NextResponse.json({ success: false, error: 'Gagal membaca brankas token Anda.' }, { status: 500 });
    }

    if (userCredit.kredit <= 0) {
      return NextResponse.json({ success: false, error: 'Token AI Anda habis! Silakan isi ulang (Top Up) untuk melanjutkan.' }, { status: 403 });
    }

    // ==========================================
    // TAHAP 2: PROSES AI (Sama seperti sebelumnya)
    // ==========================================
    const [mimeInfo, base64Data] = image.split(',');
    const mimeType = mimeInfo.split(':')[1].split(';')[0];

    let prompt = `Tugas Anda adalah menjadi asisten Copywriting profesional untuk UMKM. Buatkan teks jualan (caption/deskripsi) untuk produk yang ada dalam foto ini.\n\n`;
    
    if (platform === 'ecommerce') { prompt += `Platform: Shopee / Tokopedia.\nFokus: SEO friendly, gunakan bullet points, profesional.\n\n`; } 
    else if (platform === 'sosmed') { prompt += `Platform: Instagram / TikTok.\nFokus: Viral, hook kalimat pertama, emoji, hashtag.\n\n`; } 
    else { prompt += `Platform: WhatsApp Broadcast.\nFokus: Singkat, padat, wajib ada Call to Action (CTA).\n\n`; }

    if (style === 'fomo') { prompt += `Gaya Bahasa: Hard selling, mendesak, FOMO.`; } 
    else if (style === 'santai') { prompt += `Gaya Bahasa: Santai, gaul, lokal.`; } 
    else { prompt += `Gaya Bahasa: Elegan, premium, eksklusif.`; }

    // Menggunakan model tercepat yang kemarin berhasil
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Data } }] }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Gagal menghubungi AI');
    const generatedText = data.candidates[0].content.parts[0].text;

    // ==========================================
    // TAHAP 3: POTONG SALDO JIKA TULISAN SUKSES
    // ==========================================
    const sisaKreditBaru = userCredit.kredit - 1;
    await supabase
      .from('user_credits')
      .update({ kredit: sisaKreditBaru })
      .eq('id', userId);

    // Kirim balik teks hasil AI dan sisa koin ke HP pengguna
    return NextResponse.json({ success: true, text: generatedText, sisaKredit: sisaKreditBaru });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}