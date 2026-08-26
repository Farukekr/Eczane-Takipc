'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ADMIN_EMAIL = 'omerfarukeker23@gmail.com'; 

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Özel Site İçi Toast Bildirim Durumu
  const [toast, setToast] = useState(null);

  const [activeTab, setActiveTab] = useState('hastalar');
  const [hastalar, setHastalar] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHasta, setSelectedHasta] = useState(null);

  const [hastaReceteler, setHastaReceteler] = useState([]);
  const [hastaRaporlar, setHastaRaporlar] = useState([]);

  const [yeniHasta, setYeniHasta] = useState({ tc: '', ad: '', soyad: '', telefon: '' });
  const [yeniRecete, setYeniRecete] = useState({ ilac_adi: '', doz: '', tarih: '' });
  const [yeniRapor, setYeniRapor] = useState({ rapor_adi: '', baslangic_tarihi: '', bitis_tarihi: '', notlar: '' });

  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Şık Site İçi Bildirim Gösterme Fonksiyonu
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && activeTab === 'hastalar') fetchHastalar();
    if (user && activeTab === 'admin') fetchAdminStats();
  }, [user, activeTab]);

  useEffect(() => {
    if (selectedHasta && user) {
      fetchHastaDetaylari(selectedHasta.id);
    }
  }, [selectedHasta, user]);

  const fetchHastalar = async () => {
    const { data } = await supabase
      .from('hastalar')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setHastalar(data);
  };

  const fetchHastaDetaylari = async (hastaId) => {
    const { data: receteData } = await supabase
      .from('receteler')
      .select('*')
      .eq('hasta_id', hastaId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (receteData) setHastaReceteler(receteData);

    const { data: raporData } = await supabase
      .from('raporlar')
      .select('*')
      .eq('hasta_id', hastaId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (raporData) setHastaRaporlar(raporData);
  };

  const fetchAdminStats = async () => {
    setAdminLoading(true);
    const { data, error } = await supabase.rpc('get_admin_dashboard_stats');
    if (data) setAdminUsers(data);
    if (error) console.error('Admin istatistik hatası:', error);
    setAdminLoading(false);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        const signUpRes = await supabase.auth.signUp({ email, password });
        if (signUpRes.error) {
          showToast(signUpRes.error.message, 'error');
        } else {
          showToast('Kayıt başarılı! E-postanıza gelen doğrulama bağlantısına tıklayın.', 'success');
        }
        setLoading(false);
        return;
      }
      showToast(error.message, 'error');
    } else {
      setUser(data.user);
      showToast('Başarıyla giriş yapıldı! 👋', 'success');
    }
    setLoading(false);
  };

  const handleHastaEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('hastalar').insert([{
      ...yeniHasta,
      user_id: user.id
    }]);
    
    if (error) {
      showToast('Hasta eklenirken hata: ' + error.message, 'error');
    } else {
      setYeniHasta({ tc: '', ad: '', soyad: '', telefon: '' });
      fetchHastalar();
      showToast('Hasta klasörü başarıyla oluşturuldu! 🎉', 'success');
    }
  };

  const handleReceteEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('receteler').insert([{
      ...yeniRecete,
      hasta_id: selectedHasta.id,
      user_id: user.id
    }]);
    
    if (error) {
      showToast('İlaç eklenirken hata: ' + error.message, 'error');
    } else {
      setYeniRecete({ ilac_adi: '', doz: '', tarih: '' });
      fetchHastaDetaylari(selectedHasta.id);
      showToast('İlaç klasöre eklendi! 💊', 'success');
    }
  };

  const handleRaporEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('raporlar').insert([{
      ...yeniRapor,
      hasta_id: selectedHasta.id,
      user_id: user.id
    }]);
    
    if (error) {
      showToast('Rapor eklenirken hata: ' + error.message, 'error');
    } else {
      setYeniRapor({ rapor_adi: '', baslangic_tarihi: '', bitis_tarihi: '', notlar: '' });
      fetchHastaDetaylari(selectedHasta.id);
      showToast('Rapor klasöre kaydedildi! 📄', 'success');
    }
  };

  const filteredHastalar = hastalar.filter(h => 
    h.ad?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.tc?.includes(searchTerm)
  );

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#f8fafc', padding: '20px' }}>
      
      {/* ŞIK SİTE İÇİ BİLDİRİM (TOAST) */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.3s'
        }}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {!user ? (
        /* GİRİŞ EKRANI */
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>💊</div>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold' }}>Eczane Takip</h1>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>Giriş yapın veya kayıt olun</p>
            </div>
            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>E-POSTA</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="eczane@ornek.com" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>ŞİFRE</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={btnPrimaryStyle}>{loading ? 'Bekleyin...' : 'Giriş Yap / Kayıt Ol'}</button>
            </form>
          </div>
        </div>
      ) : (
        /* ANA PANEL */
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px' }}>📂</span>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Eczane Takip Sistemi</h1>
                <p style={{ fontSize: '12px', color: '#38bdf8', margin: 0 }}>{user.email} {isAdmin && '👑 (Yönetici)'}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => { setActiveTab('hastalar'); setSelectedHasta(null); }}
                style={{ ...navBtnStyle, backgroundColor: activeTab === 'hastalar' ? '#3b82f6' : '#334155' }}
              >
                📁 Hastalarım
              </button>

              {isAdmin && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  style={{ ...navBtnStyle, backgroundColor: activeTab === 'admin' ? '#ef4444' : '#334155' }}
                >
                  👑 Admin Paneli
                </button>
              )}

              <button onClick={() => { setSelectedHasta(null); supabase.auth.signOut(); showToast('Çıkış yapıldı', 'success'); }} style={{ ...navBtnStyle, backgroundColor: '#64748b' }}>Çıkış</button>
            </div>
          </div>

          {/* ADMIN PANELI */}
          {activeTab === 'admin' && isAdmin && (
            <div>
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ margin: 0, color: '#f87171' }}>👑 Sistemdeki Eczacılar ve Kullanıcılar</h2>
                  <button onClick={fetchAdminStats} style={{ ...navBtnStyle, backgroundColor: '#1e293b', border: '1px solid #475569' }}>🔄 Yenile</button>
                </div>
                
                {adminLoading ? (
                  <p style={{ color: '#94a3b8' }}>Kullanıcı verileri yükleniyor...</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                          <th style={{ padding: '12px' }}>E-Posta</th>
                          <th style={{ padding: '12px' }}>Doğrulama</th>
                          <th style={{ padding: '12px' }}>Hasta Sayısı</th>
                          <th style={{ padding: '12px' }}>Reçete</th>
                          <th style={{ padding: '12px' }}>Rapor</th>
                          <th style={{ padding: '12px' }}>Kayıt Tarihi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.map(u => (
                          <tr key={u.user_id} style={{ borderBottom: '1px solid #1e293b' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.email}</td>
                            <td style={{ padding: '12px' }}>
                              {u.email_confirmed_at ? (
                                <span style={{ color: '#34d399', backgroundColor: '#064e3b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Onaylı</span>
                              ) : (
                                <span style={{ color: '#fca5a5', backgroundColor: '#451a1a', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Bekliyor</span>
                              )}
                            </td>
                            <td style={{ padding: '12px', color: '#38bdf8', fontWeight: 'bold' }}>{u.total_hastalar}</td>
                            <td style={{ padding: '12px', color: '#fbbf24' }}>{u.total_receteler}</td>
                            <td style={{ padding: '12px', color: '#34d399' }}>{u.total_raporlar}</td>
                            <td style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>
                              {new Date(u.created_at).toLocaleDateString('tr-TR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HASTALAR SEKMESİ */}
          {activeTab === 'hastalar' && (
            <>
              {!selectedHasta ? (
                <div>
                  <div style={cardStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#38bdf8' }}>➕ Yeni Hasta Klasörü Oluştur</h3>
                    <form onSubmit={handleHastaEkle} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <input placeholder="T.C. Kimlik No" value={yeniHasta.tc} onChange={e => setYeniHasta({...yeniHasta, tc: e.target.value})} required style={inputStyle} />
                      <input placeholder="Ad" value={yeniHasta.ad} onChange={e => setYeniHasta({...yeniHasta, ad: e.target.value})} required style={inputStyle} />
                      <input placeholder="Soyad" value={yeniHasta.soyad} onChange={e => setYeniHasta({...yeniHasta, soyad: e.target.value})} required style={inputStyle} />
                      <input placeholder="Telefon" value={yeniHasta.telefon} onChange={e => setYeniHasta({...yeniHasta, telefon: e.target.value})} style={inputStyle} />
                      <button type="submit" style={{ ...btnPrimaryStyle, gridColumn: '1 / -1' }}>Klasörü Kaydet</button>
                    </form>
                  </div>

                  <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ margin: 0 }}>📁 Hasta Klasörleriniz ({filteredHastalar.length})</h3>
                      <input placeholder="Hasta Ara (Ad, Soyad, TC)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...inputStyle, width: '250px' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {filteredHastalar.map(h => (
                        <div 
                          key={h.id} 
                          onClick={() => setSelectedHasta(h)}
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '12px',
                            padding: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <span style={{ fontSize: '36px' }}>📁</span>
                          <div>
                            <h4 style={{ margin: '0 0 4px 0', color: '#f8fafc', fontSize: '16px' }}>{h.ad} {h.soyad}</h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>TC: {h.tc}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>Klasörü Aç ➔</p>
                          </div>
                        </div>
                      ))}
                      {filteredHastalar.length === 0 && (
                        <p style={{ color: '#64748b', gridColumn: '1 / -1' }}>Henüz bir hasta klasörü oluşturmadınız.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* KLASÖR İÇERİĞİ */
                <div>
                  <div style={{ ...cardStyle, borderColor: '#38bdf8' }}>
                    <button 
                      onClick={() => setSelectedHasta(null)}
                      style={{ backgroundColor: '#334155', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', marginBottom: '12px', fontSize: '13px' }}
                    >
                      ⬅️ Klasörler Listesine Dön
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '48px' }}>📂</span>
                      <div>
                        <h2 style={{ margin: '0 0 4px 0', color: '#38bdf8' }}>{selectedHasta.ad} {selectedHasta.soyad}</h2>
                        <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}><strong>T.C. Kimlik:</strong> {selectedHasta.tc} | <strong>Telefon:</strong> {selectedHasta.telefon || 'Kayıt yok'}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, color: '#f59e0b' }}>💊 Klasöre İlaç / Reçete Ekle</h3>
                        <form onSubmit={handleReceteEkle} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <input placeholder="İlaç Adı" value={yeniRecete.ilac_adi} onChange={e => setYeniRecete({...yeniRecete, ilac_adi: e.target.value})} required style={inputStyle} />
                          <input placeholder="Doz / Kullanım (Örn: 2x1 Tok)" value={yeniRecete.doz} onChange={e => setYeniRecete({...yeniRecete, doz: e.target.value})} style={inputStyle} />
                          <input type="date" value={yeniRecete.tarih} onChange={e => setYeniRecete({...yeniRecete, tarih: e.target.value})} required style={inputStyle} />
                          <button type="submit" style={{ ...btnPrimaryStyle, backgroundColor: '#f59e0b' }}>İlacı Kaydet</button>
                        </form>
                      </div>

                      <div style={cardStyle}>
                        <h4 style={{ marginTop: 0 }}>Kayıtlı İlaç Geçmişi ({hastaReceteler.length})</h4>
                        {hastaReceteler.map(r => (
                          <div key={r.id} style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #f59e0b' }}>
                            <strong style={{ display: 'block', color: '#f8fafc' }}>{r.ilac_adi}</strong>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Doz: {r.doz || '-'} | Tarih: {r.tarih}</span>
                          </div>
                        ))}
                        {hastaReceteler.length === 0 && <p style={{ fontSize: '13px', color: '#64748b' }}>Henüz kayıtlı ilaç yok.</p>}
                      </div>
                    </div>

                    <div>
                      <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, color: '#10b981' }}>📄 Klasöre Rapor Ekle</h3>
                        <form onSubmit={handleRaporEkle} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <input placeholder="Rapor Adı / Teşhis" value={yeniRapor.rapor_adi} onChange={e => setYeniRapor({...yeniRapor, rapor_adi: e.target.value})} required style={inputStyle} />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="date" title="Başlangıç Tarihi" value={yeniRapor.baslangic_tarihi} onChange={e => setYeniRapor({...yeniRapor, baslangic_tarihi: e.target.value})} style={inputStyle} />
                            <input type="date" title="Bitiş Tarihi" value={yeniRapor.bitis_tarihi} onChange={e => setYeniRapor({...yeniRapor, bitis_tarihi: e.target.value})} style={inputStyle} />
                          </div>
                          <textarea placeholder="Rapor Notları / Açıklama..." value={yeniRapor.notlar} onChange={e => setYeniRapor({...yeniRapor, notlar: e.target.value})} style={{ ...inputStyle, minHeight: '60px' }} />
                          <button type="submit" style={{ ...btnPrimaryStyle, backgroundColor: '#10b981' }}>Raporu Kaydet</button>
                        </form>
                      </div>

                      <div style={cardStyle}>
                        <h4 style={{ marginTop: 0 }}>Kayıtlı Raporlar ({hastaRaporlar.length})</h4>
                        {hastaRaporlar.map(rap => (
                          <div key={rap.id} style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '8px', borderLeft: '4px solid #10b981' }}>
                            <strong style={{ display: 'block', color: '#f8fafc' }}>{rap.rapor_adi}</strong>
                            <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block' }}>
                              Tarih: {rap.baslangic_tarihi || '?'} - {rap.bitis_tarihi || '?'}
                            </span>
                            {rap.notlar && <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0 0 0' }}>Not: {rap.notlar}</p>}
                          </div>
                        ))}
                        {hastaRaporlar.length === 0 && <p style={{ fontSize: '13px', color: '#64748b' }}>Henüz kayıtlı rapor yok.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 12px', backgroundColor: '#0f172a',
  border: '1px solid #334155', borderRadius: '8px', color: 'white', boxSizing: 'border-box', outline: 'none'
};
const btnPrimaryStyle = {
  backgroundColor: '#4f46e5', color: 'white', border: 'none',
  padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
};
const navBtnStyle = {
  color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px'
};
const cardStyle = {
  backgroundColor: '#1e293b', border: '1px solid #334155',
  borderRadius: '12px', padding: '20px', marginBottom: '20px'
};
