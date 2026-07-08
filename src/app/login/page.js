"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleAuth = async (type) => {
    if (!email || !password) {
      setMessage("❌ Email dan Password wajib diisi ya, Bos!");
      return;
    }
    
    setLoading(true);
    setMessage("");
    
    try {
      if (type === 'register') {
        // Proses Pendaftaran
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("✅ Pendaftaran berhasil! Silakan klik tombol 'Masuk'.");
      } else {
        // Proses Login
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage("✅ Berhasil masuk! Mengalihkan...");
        
        // Membawa pengguna masuk ke halaman utama setelah sukses
        setTimeout(() => {
          window.location.href = "/"; 
        }, 1000);
      }
    } catch (error) {
      setMessage("❌ Waduh, ada error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-extrabold text-center text-blue-600 mb-1">TokoTeks</h1>
        <p className="text-center text-gray-500 mb-8 text-sm font-medium">Masuk atau Daftar untuk mulai meracik kata</p>

        {/* Kotak Pesan Error/Sukses */}
        {message && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-semibold text-center border ${message.includes('❌') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
            {message}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Alamat Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full border border-gray-300 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="email@perusahaan.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full border border-gray-300 rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="Minimal 6 karakter"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => handleAuth('login')} 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-md disabled:bg-gray-400"
            >
              {loading ? '⏳...' : 'Masuk'}
            </button>
            <button 
              onClick={() => handleAuth('register')} 
              disabled={loading}
              className="w-full bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-3.5 px-4 rounded-xl transition-colors shadow-sm disabled:border-gray-400 disabled:text-gray-400"
            >
              Daftar Baru
            </button>
          </div>
        </div>
        
      </div>
    </main>
  );
}