'use client';
import { useState, useEffect } from 'react';
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

  // Panel Durumları (State)
  const [activeTab, setActiveTab] = useState('hastalar'); // 'hastalar' veya 'receteler'
  const [hastalar, setHastalar] = useState([]);
  const [receteler, setReceteler] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form Durumları
  const [yeniHasta, setYeniHasta] = useState({ tc: '', ad: '', soyad: '', telefon: '' });
  const [yeniRecete, setYeniRecete] = useState({ hasta_id: '', ilac_adi: '', doz: '', tarih: '' });

  // Oturum Kontrolü
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Verileri Çek
  useEffect(() => {
    if (user) {
      fetchHastalar();
      fetchReceteler();
    }
  }, [user]);

  const fetchHastalar = async () => {
    const { data } = await supabase.from('hastalar').select('*').order('created_at', { ascending: false });
    if (data) setHastalar(data);
  };

  const fetchReceteler = async () => {
    const { data } = await supabase.from('receteler').select('*, hastalar(ad, soyad, tc)').order('created_at', { ascending: false });
    if (data) setReceteler(data);
  };

  // Auth İşlemleri
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
        setMessage({ type: 'success', text: 'Kayıt başarılı! Giriş yapabilirsiniz.' });
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

  // Hasta Ekleme
  const handleHastaEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('hastalar').insert([yeniHasta]);
    if (error) {
      alert('Hasta eklenirken hata oluştu: ' + error.message);
    } else {
      setYeniHasta({ tc: '', ad: '', soyad: '', telefon: '' });
      fetchHastalar();
      alert('Hasta başarıyla eklendi!');
    }
  };

  // Reçete Ekleme
  const handleReceteEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('receteler').insert([yeniRecete]);
    if (error) {
      alert('Reçete eklenirken hata oluştu: ' + error.message);
    } else {
      setYeniRecete({ hasta_id: '', ilac_adi: '', doz: '', tarih: '' });
      fetchReceteler();
      alert('Reçete başarıyla eklendi!');
    }
  };

  // Filtreleme
  const filteredHastalar = hastalar.filter(h => 
    h.ad?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.tc?.includes(searchTerm)
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#f8fafc',
      padding: '20px'
    }}>
      {!user ? (
        /* GİRİŞ EKRANI */
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>💊</div>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold' }}>Eczane Takip</h1>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>Giriş yapın veya kayıt olun</p>
            </div>

            {message && (
              <div style={{
                padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px',
                backgroundColor: message.type === 'error' ? '#451a1a' : '#064e3b',
                color: message.type === 'error' ? '#fca5a5' : '#6ee7b7'
              }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>E-POSTA</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="eczane@ornek.com" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>ŞİFRE</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={btnPrimaryStyle}>
                {loading ? 'Bekleyin...' : 'Giriş Yap / Kayıt Ol'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* YÖNETİM PANELİ */
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>💊</span>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Eczane Takip Sistemi</h1>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{user.email}</p>
              </div>
            </div>
            <button onClick={() => supabase.auth.signOut()} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Çıkış Yap
            </button>
          </div>

          {/* Tab Butonları */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <button onClick={() => setActiveTab('hastalar')} style={activeTab === 'hastalar' ? tabActiveStyle : tabInactiveStyle}>
              👥 Hasta Yönetimi
            </button>
            <button onClick={() => setActiveTab('receteler')} style={activeTab === 'receteler' ? tabActiveStyle : tabInactiveStyle}>
              📋 Reçete Kayıtları
            </button>
          </div>

          {/* HASTA YÖNETİMİ TABI */}
          {activeTab === 'hastalar' && (
            <div>
              {/* Hasta Ekleme Formu */}
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#38bdf8' }}>Yeni Hasta Ekle</h3>
                <form onSubmit={handleHastaEkle} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <input placeholder="T.C. Kimlik No" value={yeniHasta.tc} onChange={e => setYeniHasta({...yeniHasta, tc: e.target.value})} required style={inputStyle} />
                  <input placeholder="Ad" value={yeniHasta.ad} onChange={e => setYeniHasta({...yeniHasta, ad: e.target.value})} required style={inputStyle} />
                  <input placeholder="Soyad" value={yeniHasta.soyad} onChange={e => setYeniHasta({...yeniHasta, soyad: e.target.value})} required style={inputStyle} />
                  <input placeholder="Telefon" value={yeniHasta.telefon} onChange={e => setYeniHasta({...yeniHasta, telefon: e.target.value})} style={inputStyle} />
                  <button type="submit" style={{ ...btnPrimaryStyle, gridColumn: '1 / -1' }}>Hastayı Kaydet</button>
                </form>
              </div>

              {/* Hasta Listesi & Arama */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0 }}>Kayitli Hastalar ({filteredHastalar.length})</h3>
                  <input placeholder="Arama yap (Ad, Soyad, TC)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle, width: '250px' }} />
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={thStyle}>TC</th>
                        <th style={thStyle}>AD SOYAD</th>
                        <th style={thStyle}>TELEFON</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHastalar.map(h => (
                        <tr key={h.id} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={tdStyle}>{h.tc}</td>
                          <td style={tdStyle}>{h.ad} {h.soyad}</td>
                          <td style={tdStyle}>{h.telefon || '-'}</td>
                        </tr>
                      ))}
                      {filteredHastalar.length === 0 && (
                        <tr><td colSpan="3" style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>Hasta bulunamadı.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REÇETE TABI */}
          {activeTab === 'receteler' && (
            <div>
              {/* Reçete Ekleme Formu */}
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#38bdf8' }}>Yeni Reçete Ekle</h3>
                <form onSubmit={handleReceteEkle} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <select value={yeniRecete.hasta_id} onChange={e => setYeniRecete({...yeniRecete, hasta_id: e.target.value})} required style={inputStyle}>
                    <option value="">Hasta Seçin...</option>
                    {hastalar.map(h => (
                      <option key={h.id} value={h.id}>{h.ad} {h.soyad} ({h.tc})</option>
                    ))}
                  </select>
                  <input placeholder="İlaç Adı" value={yeniRecete.ilac_adi} onChange={e => setYeniRecete({...yeniRecete, ilac_adi: e.target.value})} required style={inputStyle} />
                  <input placeholder="Doz / Kullanım (örn: 2x1)" value={yeniRecete.doz} onChange={e => setYeniRecete({...yeniRecete, doz: e.target.value})} style={inputStyle} />
                  <input type="date" value={yeniRecete.tarih} onChange={e => setYeniRecete({...yeniRecete, tarih: e.target.value})} required style={inputStyle} />
                  <button type="submit" style={{ ...btnPrimaryStyle, gridColumn: '1 / -1' }}>Reçeteyi Kaydet</button>
                </form>
              </div>

              {/* Reçete Listesi */}
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Son Reçeteler</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={thStyle}>HASTA</th>
                        <th style={thStyle}>İLAÇ</th>
                        <th style={thStyle}>DOZ</th>
                        <th style={thStyle}>TARİH</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receteler.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={tdStyle}>{r.hastalar?.ad} {r.hastalar?.soyad}</td>
                          <td style={tdStyle}>{r.ilac_adi}</td>
                          <td style={tdStyle}>{r.doz || '-'}</td>
                          <td style={tdStyle}>{r.tarih}</td>
                        </tr>
                      ))}
                      {receteler.length === 0 && (
                        <tr><td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#64748b' }}>Kayıtlı reçete bulunamadı.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Ortak Stiller
const inputStyle = {
  width: '100%', padding: '10px 12px', backgroundColor: '#0f172a',
  border: '1px solid #334155', borderRadius: '8px', color: 'white', boxSizing: 'border-box', outline: 'none'
};
const btnPrimaryStyle = {
  backgroundColor: '#4f46e5', color: 'white', border: 'none',
  padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
};
const cardStyle = {
  backgroundColor: '#1e293b', border: '1px solid #334155',
  borderRadius: '12px', padding: '20px', marginBottom: '20px'
};
const tabActiveStyle = {
  padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
};
const tabInactiveStyle = {
  padding: '10px 20px', backgroundColor: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
};
const thStyle = { padding: '12px', fontSize: '12px' };
const tdStyle = { padding: '12px', fontSize: '14px' };
