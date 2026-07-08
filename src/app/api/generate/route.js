import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  try {
    const { image, targetPlatform, style, email } = await req.json(); 

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.1-flash-lite",
      generationConfig: { responseMimeType: "application/json" } 
    });

    const instruksiTeks = `Analisis foto produk ini dan buatkan copywriting profesional. 
    Gunakan bahasa Indonesia. Target: ${targetPlatform}, Gaya: ${style}. 
    WAJIB menjawab hanya dalam format JSON murni tanpa markdown tambahan, mengikuti struktur ini:
    {
      "title": "Judul produk yang SEO friendly",
      "description": "Deskripsi lengkap dengan keunggulan, specifications, and hashtag"
    }`;

    const base64Data = image.split(',')[1] || image;
    const mimeType = image.match(/data:(.*?);/)?.[1] || 'image/jpeg';
    
    const komponenGambar = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    const response = await model.generateContent([instruksiTeks, komponenGambar]);
    const hasilTeks = response.response.text();

    // --- PROSES PENGURANGAN TOKEN DENGAN DETEKSI ERROR SAKTI ---
    let saldoTerbaru = 0;
    if (email) {
      const { data: userData, error: fetchError } = await supabase
        .from('user_credits')
        .select('kredit')
        .eq('email', email)
        .single();
      
      if (fetchError) throw new Error("Gagal membaca saldo database: " + fetchError.message);

      if (userData) {
        saldoTerbaru = Math.max(0, userData.kredit - 1);
        
        // Eksekusi update dan tangkap error-nya
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({ kredit: saldoTerbaru })
          .eq('email', email);
        
        // Jika ditolak RLS / Kunci salah, baris ini akan langsung memicu crash agar kita tahu masalahnya
        if (updateError) {
          throw new Error("Supabase MENOLAK menyimpan data baru! Alasan: " + updateError.message);
        }
      }
    }

    return NextResponse.json({ success: true, result: hasilTeks, newCredits: saldoTerbaru });

  } catch (error) {
    console.error("Sistem Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}