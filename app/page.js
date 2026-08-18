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
  const [message, setMessage] = useState(null);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Giriş Denemesi
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // Hesap yoksa kayıt et
    if (error && error.message.includes("Invalid login credentials")) {
      const signUpRes = await supabase.auth.signUp({ email, password });
      if (signUpRes.error) {
        setMessage({ type: 'error', text: signUpRes.error.message });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Kayıt başarılı! E-posta adresinize doğrulama bağlantısı gönderildi. Lütfen mailinizi kontrol edin.' 
        });
      }
      setLoading(false);
      return;
    }

    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setUser(data.user);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMessage(null);
  };

  return (
    <>
      {/* CDN üzerinden Tailwind ve Font Yükleme */}
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        
        {user ? (
          /* Giriş Yapılmış Panel */
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-3xl">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <span className="text-3xl">💊</span>
                <div>
                  <h1 className="text-xl font-bold text-white">Eczane Takip Paneli</h1>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              >
                Çıkış Yap
              </button>
            </div>
            
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-emerald-400 text-sm flex items-center gap-3">
              <span>✅</span>
              <div>
                <strong>Giriş Başarılı!</strong> Hasta ve reçete yönetim modüllerin hazır.
              </div>
            </div>
          </div>
        ) : (
          /* Giriş / Kayıt Kartı Preset */
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
                💊
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Eczane Takip</h1>
              <p className="text-sm text-slate-400 mt-1">Sisteme giriş yapın veya hesap oluşturun</p>
            </div>

            {message && (
              <div className={`p-4 mb-6 rounded-2xl text-sm border ${
                message.type === 'error' 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">E-Posta</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="eczane@ornek.com"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder-slate-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Şifre</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-white placeholder-slate-500 transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-150 text-sm mt-2 disabled:opacity-50"
              >
                {loading ? 'İşleniyor...' : 'Giriş Yap / Kayıt Ol'}
              </button>
            </form>
          </div>
        )}

      </div>
    </>
  );
}
  );
}
