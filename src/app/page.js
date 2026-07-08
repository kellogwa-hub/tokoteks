'use client';

import { useState } from 'react';

export default function Home() {
  const [image, setImage] = useState(null);
  const [targetPlatform, setTargetPlatform] = useState('Shopee / Tokopedia (Fokus SEO)');
  const [style, setStyle] = useState('🔥 Hard Selling (Mendesak/FOMO)');
  const [loading, setLoading] = useState(false);
  const [copywriting, setCopywriting] = useState(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  // 1. Mesin Kompresi Gambar Otomatis (Anti-Error Vercel)
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Membatasi lebar gambar demi keamanan memori server
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Mengubah hasil padatan ke format JPEG kualitas 70% (Sangat ringan!)
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedBase64 = await fileToBase64(file);
        setImage(compressedBase64);
      } catch (error) {
        alert('Gagal memproses gambar');
      }
    }
  };

  // 2. Eksekusi Pengiriman ke Backend
  const handleGenerate = async () => {
    if (!image) return alert('Silakan unggah foto produk terlebih dahulu!');
    
    setLoading(true);
    setCopywriting(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, targetPlatform, style }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Mengubah teks JSON dari Gemini menjadi objek Javascript rapi
        const parsedResult = JSON.parse(data.result);
        setCopywriting(parsedResult);
      } else {
        alert('Gagal meracik teks: ' + (data.error || 'Terjadi kesalahan server'));
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan koneksi sistem');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fungsi Copy Mandiri dengan Efek Visual Berubah Teks
  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'title') {
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    } else {
      setCopiedDesc(true);
      setTimeout(() => setCopiedDesc(false), 2000);
    }
  };

  return (
    <main className="min-height-screen bg-slate-50 flex flex-col items-center py-12 px-4">
      {/* CARD UTAMA UTK INPUT */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-600 tracking-tight">TokoTeks</h1>
          <p className="text-slate-500 font-medium mt-1">Asisten AI Copywriting UMKM 🚀</p>
        </div>

        {/* AREA UNGHAH FOTO */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 mb-2">📸 Foto Produk</label>
          {!image ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl h-48 cursor-pointer hover:bg-slate-50 transition-colors">
              <span className="text-slate-400 font-medium">Klik untuk Unggah Foto Produk</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          ) : (
            <div className="relative border rounded-xl overflow-hidden bg-slate-100 flex justify-center items-center h-52">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Preview" className="max-h-full object-contain" />
              <button 
                onClick={() => setImage(null)} 
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow hover:bg-red-600 font-bold transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* PILIHAN TARGET PLATFORM */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-700 mb-2">Target Platform</label>
          <select 
            value={targetPlatform} 
            onChange={(e) => setTargetPlatform(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option>Shopee / Tokopedia (Fokus SEO)</option>
            <option>TikTok / Instagram (Fokus Viral)</option>
            <option>WhatsApp (Fokus Broadcast/Promo)</option>
          </select>
        </div>

        {/* PILIHAN GAYA BAHASA */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-700 mb-2">Gaya Bahasa Jualan</label>
          <select 
            value={style} 
            onChange={(e) => setStyle(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option>🔥 Hard Selling (Mendesak/FOMO)</option>
            <option>💬 Santai & Gaul (Bahasa Lokal)</option>
            <option>✨ Elegan & Profesional (Premium)</option>
          </select>
        </div>

        {/* TOMBOL EKSEKUSI */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={`w-full py-4 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all text-center flex items-center justify-center gap-2 ${
            loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
          }`}
        >
          {loading ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
              Sedang Meracik Mantra Jualan...
            </>
          ) : (
            '✨ Buat Teks Jualan Sekarang'
          )}
        </button>

        {/* OUTPUT AREA: DUA KOTAK UX TERPISAH */}
        {copywriting && (
          <div className="mt-8 space-y-6 pt-6 border-t border-slate-100 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-800">🎉 Hasil Racikan AI Selesai:</h3>
            
            {/* KOTAK 1: JUDUL SEO */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider">📌 Judul Produk (SEO Friendly)</span>
                <button 
                  onClick={() => handleCopy(copywriting.title, 'title')} 
                  className={`text-xs px-3 py-1.5 font-bold rounded-lg border transition-all shadow-sm ${
                    copiedTitle ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  {copiedTitle ? 'Tersalin! ✅' : '📋 Salin Judul'}
                </button>
              </div>
              <p className="text-slate-800 font-semibold leading-relaxed">{copywriting.title}</p>
            </div>

            {/* KOTAK 2: DESKRIPSI UTUH */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">📝 Deskripsi Lengkap Produk</span>
                <button 
                  onClick={() => handleCopy(copywriting.description, 'desc')} 
                  className={`text-xs px-3 py-1.5 font-bold rounded-lg border transition-all shadow-sm ${
                    copiedDesc ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {copiedDesc ? 'Tersalin! ✅' : '📋 Salin Deskripsi'}
                </button>
              </div>
              <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{copywriting.description}</p>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}