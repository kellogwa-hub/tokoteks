'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Home() {
  // --- STATE UNTUK AKUN & TOKEN ---
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);

  // --- STATE UNTUK MODAL LOGIN (EMAIL/PASSWORD) ---
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- STATE UNTUK AI ---
  const [image, setImage] = useState(null);
  const [targetPlatform, setTargetPlatform] = useState('Shopee / Tokopedia (Fokus SEO)');
  const [style, setStyle] = useState('🔥 Hard Selling (Mendesak/FOMO)');
  const [loading, setLoading] = useState(false);
  const [copywriting, setCopywriting] = useState(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  // --- 1. LOGIKA AKUN & SUPABASE ---
  useEffect(() => {
    checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') checkUser();
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data } = await supabase.from('user_credits').select('kredit').eq('id', user.id).single();
      if (data) setCredits(data.kredit);
    } else {
      setCredits(0);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isSignUp) {
        // Proses Daftar
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Pendaftaran berhasil! Anda sekarang sudah masuk.");
        setShowAuthModal(false);
      } else {
        // Proses Masuk
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setShowAuthModal(false);
      }
    } catch (error) {
      alert("Gagal: " + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const handleTopUp = async () => {
    if (!user) return setShowAuthModal(true);
    try {
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, userId: user.id })
      });
      const data = await res.json();
      
      if (data.token) {
        // Fungsi untuk memanggil pop-up Midtrans
        const payWithSnap = () => {
          window.snap.pay(data.token, {
            onSuccess: function(result) {
              alert("Pembayaran berhasil! Saldo token Anda akan segera bertambah.");
              checkUser(); // Refresh UI
            },
            onPending: function(result) {
              alert("Menunggu pembayaran Anda!");
            },
            onError: function(result) {
              alert("Pembayaran gagal!");
            },
            onClose: function() {
              alert("Anda menutup kotak kasir sebelum menyelesaikannya.");
            }
          });
        };

        // Cek apakah mesin pop-up Midtrans sudah dipasang di browser
        if (!document.getElementById('midtrans-script')) {
          const script = document.createElement('script');
          script.id = 'midtrans-script';
          script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
          script.setAttribute('data-client-key', data.clientKey);
          script.onload = () => payWithSnap();
          document.body.appendChild(script);
        } else {
          payWithSnap();
        }

      } else {
        alert("Gagal memanggil kasir: " + (data.error || "Token pembayaran tidak ditemukan"));
      }
    } catch (error) {
      alert("Gagal menghubungi server kasir: " + error.message);
    }
  };

  // --- 2. LOGIKA KOMPRESI & AI ---
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

  const handleGenerate = async () => {
    if (!user) return setShowAuthModal(true);
    if (credits <= 0) return alert('Token Anda habis! Silakan isi ulang.');
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
        setCredits((prev) => prev - 1);
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
    <main className="min-h-screen bg-slate-50 flex flex-col items-center relative">
      
      {/* POP-UP MODAL LOGIN & DAFTAR */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fadeIn">
          <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 font-bold text-xl">✕</button>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">{isSignUp ? 'Daftar Akun Baru' : 'Masuk ke TokoTeks'}</h2>
            <p className="text-sm text-slate-500 mb-6">{isSignUp ? 'Buat akun untuk mulai meracik teks jualan.' : 'Silakan masuk untuk melanjutkan.'}</p>
            
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="contoh@email.com" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Minimal 6 karakter" />
              </div>
              <button type="submit" disabled={authLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-colors">
                {authLoading ? 'Memproses...' : (isSignUp ? 'Daftar Sekarang' : 'Masuk')}
              </button>
            </form>
            
            <div className="mt-6 text-center text-sm text-slate-600">
              {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'} 
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="ml-1 text-blue-600 font-bold hover:underline">
                {isSignUp ? 'Masuk di sini' : 'Daftar di sini'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER / NAVBAR */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="font-extrabold text-xl text-blue-600 tracking-tight">TokoTeks</div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200 shadow-sm">
                <span className="text-sm font-bold text-yellow-700">🪙 {credits} Token</span>
              </div>
              <button onClick={handleTopUp} className="text-sm font-bold bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-full transition-colors shadow-sm">+ Isi Ulang</button>
              <button onClick={logout} className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors">Keluar</button>
            </>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full transition-colors shadow-sm">
              Masuk / Daftar
            </button>
          )}
        </div>
      </header>

      {/* CARD UTAMA */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8 mt-10 mb-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Mesin <span className="text-blue-600">Copywriting</span> AI</h1>
          <p className="text-slate-500 font-medium mt-1">Biarkan AI meracik kata, Anda tinggal terima pesanan 🚀</p>
        </div>

        {/* INPUT FOTO */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 mb-2">📸 Foto Produk (1 Token / Racikan)</label>
          {!image ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl h-48 cursor-pointer hover:bg-blue-50 transition-colors">
              <span className="text-slate-400 font-medium">Klik untuk Unggah Foto Produk</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          ) : (
            <div className="relative border rounded-xl overflow-hidden bg-slate-100 flex justify-center items-center h-52">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Preview" className="max-h-full object-contain" />
              <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow hover:bg-red-600 font-bold transition-colors">✕</button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-700 mb-2">Target Platform</label>
          <select value={targetPlatform} onChange={(e) => setTargetPlatform(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700">
            <option>Shopee / Tokopedia (Fokus SEO)</option>
            <option>TikTok / Instagram (Fokus Viral)</option>
            <option>WhatsApp (Fokus Broadcast/Promo)</option>
          </select>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-bold text-slate-700 mb-2">Gaya Bahasa Jualan</label>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700">
            <option>🔥 Hard Selling (Mendesak/FOMO)</option>
            <option>💬 Santai & Gaul (Bahasa Lokal)</option>
            <option>✨ Elegan & Profesional (Premium)</option>
          </select>
        </div>

        {/* TOMBOL GENERATE */}
        <button
          onClick={handleGenerate}
          disabled={loading || !user}
          className={`w-full py-4 text-white font-bold rounded-xl shadow-lg transition-all text-center flex items-center justify-center gap-2 ${
            loading || !user ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-200'
          }`}
        >
          {loading ? (
            <><span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span> Sedang Meracik...</>
          ) : !user ? (
            '🔒 Login Untuk Mulai Meracik'
          ) : (
            '✨ Buat Teks Jualan Sekarang'
          )}
        </button>

        {/* OUTPUT DUA KOTAK */}
        {copywriting && (
          <div className="mt-8 space-y-6 pt-6 border-t border-slate-100 animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-800">🎉 Hasil Racikan AI Selesai:</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-extrabold text-blue-700 uppercase tracking-wider">📌 Judul Produk (SEO Friendly)</span>
                <button onClick={() => handleCopy(copywriting.title, 'title')} className={`text-xs px-3 py-1.5 font-bold rounded-lg border transition-all shadow-sm ${copiedTitle ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-100'}`}>
                  {copiedTitle ? 'Tersalin! ✅' : '📋 Salin Judul'}
                </button>
              </div>
              <p className="text-slate-800 font-semibold leading-relaxed">{copywriting.title}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">📝 Deskripsi Lengkap Produk</span>
                <button onClick={() => handleCopy(copywriting.description, 'desc')} className={`text-xs px-3 py-1.5 font-bold rounded-lg border transition-all shadow-sm ${copiedDesc ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
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