"use client";
import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase"; 
import { useRouter } from "next/navigation"; 
import Script from "next/script"; // <-- Alat baru untuk memuat sistem Midtrans

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null); 
  const [kredit, setKredit] = useState(0); 
  const [isCheckingUser, setIsCheckingUser] = useState(true);

  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [platform, setPlatform] = useState("ecommerce");
  const [style, setStyle] = useState("fomo");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login'); 
      } else {
        setUser(session.user); 
        const { data: creditData } = await supabase
          .from('user_credits')
          .select('kredit')
          .eq('id', session.user.id)
          .single();
        if (creditData) setKredit(creditData.kredit);
      }
      setIsCheckingUser(false);
    };

    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) router.push('/login');
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleImageClick = () => { fileInputRef.current.click(); };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setImagePreview(null);
    setImageFile(null);
    setResult("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleGenerate = async () => {
    if (!imageFile) return alert("Tolong unggah foto produk terlebih dahulu ya, Bos!");
    if (kredit <= 0) return alert("Token AI Anda habis! Silakan Top Up di pojok kanan atas.");

    setLoading(true);
    setResult("");

    try {
      const base64Image = await fileToBase64(imageFile);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image, platform, style, userId: user.id }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.text);
        setKredit(data.sisaKredit); 
      }
      else alert("Pesan Sistem: " + data.error);
    } catch (error) {
      alert("Gagal menghubungi server: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FUNGSI KASIR: Membuka Pop-up Midtrans
  // ==========================================
  const handleTopUp = async () => {
    try {
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email })
      });
      const data = await res.json();

      if (data.success) {
        window.snap.pay(data.token, {
          onSuccess: async function(result) {
            // Jika pembayaran berhasil (LUNAS), tambah 10 token ke brankas!
            const koinBaru = kredit + 10;
            await supabase.from('user_credits').update({ kredit: koinBaru }).eq('id', user.id);
            setKredit(koinBaru);
            alert("LUNAS! 10 Token telah ditambahkan ke akun Anda. 🎉");
          },
          onPending: function(result) { alert("Menunggu pembayaran Anda diselesaikan..."); },
          onError: function(result) { alert("Waduh, pembayaran gagal!"); },
          onClose: function() { console.log("Jendela ditutup"); }
        });
      } else {
        alert("Sistem kasir sedang sibuk: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  if (isCheckingUser) return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-blue-600 font-bold">Memuat TokoTeks...</div>;
  if (!user) return null; 

  return (
    <>
      {/* Skrip Resmi Midtrans Sandbox */}
      <Script 
        src="https://app.sandbox.midtrans.com/snap/snap.js" 
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} 
        strategy="lazyOnload" 
      />

      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 relative">
          
          <div className="absolute top-4 right-4 flex flex-col items-end">
            <span className="text-xs text-gray-500 font-medium mb-1">{user.email}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold bg-yellow-100 text-yellow-700 px-2 py-1.5 rounded-md shadow-sm border border-yellow-300">
                🪙 {kredit} Token
              </span>
              {/* TOMBOL TOP UP BARU */}
              <button onClick={handleTopUp} className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-md transition font-semibold shadow-sm">
                + Isi Ulang
              </button>
              <button onClick={handleLogout} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-md transition font-semibold border border-red-200">
                Keluar
              </button>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-center text-blue-600 mb-1 mt-8">TokoTeks</h1>
          <p className="text-center text-gray-500 mb-6 text-sm font-medium">Asisten AI Copywriting UMKM 🚀</p>

          <div onClick={handleImageClick} className={`border-2 border-dashed rounded-xl text-center mb-5 cursor-pointer transition-colors relative overflow-hidden flex flex-col items-center justify-center ${ imagePreview ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50 min-h-[160px]' }`}>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            {imagePreview ? (
              <div className="relative w-full h-48">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview Produk" className="w-full h-full object-contain bg-white" />
                <button onClick={handleRemoveImage} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 shadow-md transition-colors" title="Hapus Gambar">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-2">📸</div>
                <p className="text-gray-600 font-medium text-sm px-4">Klik untuk Unggah Foto Produk</p>
              </>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Target Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition">
                <option value="ecommerce">Shopee / Tokopedia (Fokus SEO)</option>
                <option value="sosmed">TikTok / Instagram (Fokus Viral)</option>
                <option value="chat">WhatsApp (Fokus Broadcast/Promo)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gaya Bahasa Jualan</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition">
                <option value="fomo">🔥 Hard Selling (Mendesak/FOMO)</option>
                <option value="santai">💬 Santai & Gaul (Bahasa Lokal)</option>
                <option value="elegan">✨ Elegan & Profesional (Premium)</option>
              </select>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading} className={`w-full text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-md flex justify-center items-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
            <span>{loading ? '⏳' : '✨'}</span> 
            {loading ? 'AI Sedang Menulis...' : 'Buat Teks Jualan Sekarang'}
          </button>

          {result && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-blue-800 text-sm">Hasil Copywriting:</h3>
                <button onClick={() => navigator.clipboard.writeText(result)} className="text-xs font-semibold bg-white border border-blue-300 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition shadow-sm">
                  📋 Salin Teks
                </button>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{result}</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}