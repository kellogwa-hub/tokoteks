import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai'; // <--- NAMA MESIN YANG BENAR

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // <--- NAMA MESIN YANG BENAR

export async function POST(req) {
  try {
    const { image, targetPlatform, style } = await req.json();

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
      "description": "Deskripsi lengkap dengan keunggulan, spesifikasi, dan hashtag"
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

    // 5. Lempar hasilnya kembali ke frontend
    return NextResponse.json({ success: true, result: hasilTeks });

  } catch (error) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}