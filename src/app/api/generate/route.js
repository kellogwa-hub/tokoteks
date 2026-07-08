import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js'; // <-- Hubungkan ke Supabase

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Inisialisasi Supabase Backend memakai kunci master service_role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  try {
    // Kita minta kiriman data 'email' juga dari frontend
    const { image, targetPlatform, style, email } = await req.json(); 

    // 1. Kunci Model ke gemini-3.1-flash-lite & Paksa Output berupa JSON
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite",
      generationConfig: { responseMimeType: "application/json" } 
    });

    // 2. Racik Instruksi Ketat di Sini
    const instruksiTeks = `Analisis foto produk ini dan buatkan copywriting profesional. 
    Gunakan bahasa Indonesia. Target: ${targetPlatform}, Gaya: ${style}. 
    WAJIB menjawab hanya dalam format JSON murni tanpa markdown tambahan, mengikuti struktur ini:
    {
      "title": "Judul produk yang SEO friendly",
      "description": "Deskripsi lengkap dengan keunggulan, specifications, and hashtag"
    }`;

    // 3. Mengubah format gambar base64 agar dipahami Gemini
    const base64Data = image.split(',')[1] || image;
    const mimeType = image.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    
    const komponenGambar = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    // 4. Kirim teks instruksi dan gambar sekaligus ke Gemini
    const response = await model.generateContent([instruksiTeks, komponenGambar]);
    const hasilTeks = response.response.text();

    // --- 5. PROSES PENGURANGAN TOKEN DI DATABASE SUPABASE ---
    let saldoTerbaru = 0;
    if (email) {
      const { data: userData } = await supabase.from('user_credits').select('kredit').eq('email', email).single();
      if (userData) {
        saldoTerbaru = Math.max(0, userData.kredit - 1); // Kurangi 1 token, pastikan tidak minus
        await supabase.from('user_credits').update({ kredit: saldoTerbaru }).eq('email', email);
      }
    }

    // 6. Lempar hasilnya beserta saldo terbaru yang sah ke frontend
    return NextResponse.json({ success: true, result: hasilTeks, newCredits: saldoTerbaru });

  } catch (error) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}