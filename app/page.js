'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Önce Giriş Yapmayı Dene
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // Kullanıcı yoksa Otomatik Kayıt Et
    if (error && error.message.includes("Invalid login credentials")) {
      const signUpRes = await supabase.auth.signUp({ email, password });
      data = signUpRes.data;
      error = signUpRes.error;
    }

    setLoading(false);

    if (error) {
      alert("Hata: " + error.message);
    } else {
      setUser(data.user);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Giriş Yapılmışsa Gösterilecek Panel
  if (user) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex flex-col items-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200">
          <div className="flex justify-between items-center mb-6 pb-4 border-b">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">💊 Eczane Takip Paneli</h1>
              <p className="text-sm text-slate-500">Giriş Yapıldı: {user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            >
              Çıkış Yap
            </button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-800 text-sm">
            🎉 Hoş geldin! Sisteme anında giriş yaptın. Artık buraya hasta ve reçete modüllerini bağlayabiliriz.
          </div>
        </div>
      </div>
    );
  }

  // Giriş/Kayıt Formu
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white text-3xl shadow-lg shadow-blue-500/30">
            💊
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Eczane Takip Sistemi</h1>
          <p className="text-sm text-slate-500 mt-1">E-posta ve şifrenizle anında giriş yapın</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-Posta Adresi</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@eczane.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'İşlem Yapılıyor...' : 'Giriş Yap / Kayıt Ol'}
          </button>
        </form>
      </div>
    </div>
  );
}
