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

    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error && error.message.includes("Invalid login credentials")) {
      const signUpRes = await supabase.auth.signUp({ email, password });
      if (signUpRes.error) {
        setMessage({ type: 'error', text: signUpRes.error.message });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Kayıt başarılı! E-posta adresinize doğrulama bağlantısı gönderildi.' 
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'Center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#f8fafc',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '32px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>💊</div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 6px 0' }}>Eczane Takip</h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>Giriş yapın veya kayıt olun</p>
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px',
            backgroundColor: message.type === 'error' ? '#451a1a' : '#064e3b',
            border: `1px solid ${message.type === 'error' ? '#7f1d1d' : '#047857'}`,
            color: message.type === 'error' ? '#fca5a5' : '#6ee7b7'
          }}>
            {message.text}
          </div>
        )}

        {user ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#4ade80', fontWeight: 'bold' }}>Giriş Başarılı!</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>{user.email}</p>
            <button 
              onClick={() => supabase.auth.signOut().then(() => setUser(null))}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Çıkış Yap
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>E-POSTA</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="eczane@ornek.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>ŞİFRE</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: 'white',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Bekleyin...' : 'Giriş Yap / Kayıt Ol'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
