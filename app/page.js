'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ADMIN KULLANICI ADLARI
const ADMIN_USERS = ['admin', 'faruk', 'omerfarukeker'];

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [activeTab, setActiveTab] = useState('hastalar'); // 'hastalar' | 'admin'

  const [hastalar, setHastalar] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHasta, setSelectedHasta] = useState(null);

  const [hastaReceteler, setHastaReceteler] = useState([]);
  const [hastaRaporlar, setHastaRaporlar] = useState([]);

  // Admin İstatistikleri ve İnceleme State'leri
  const [allUsersStats, setAllUsersStats] = useState([]);
  const [inspectUser, setInspectUser] = useState(null);
  const [inspectHastalar, setInspectHastalar] = useState([]);

  const [yeniHasta, setYeniHasta] = useState({ tc: '', ad: '', soyad: '', telefon: '' });
  const [yeniRecete, setYeniRecete] = useState({ ilac_adi: '', doz: '', tarih: '' });
  const [yeniRapor, setYeniRapor] = useState({ rapor_adi: '', baslangic_tarihi: '', bitis_tarihi: '', notlar: '' });

  const getInternalEmail = (uName) => {
    if (!uName) return '';
    const cleanName = uName
      .toString()
      .trim()
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '');
    return `${cleanName}@eczane.local`;
  };

  const getDisplayName = (emailStr) => {
    if (!emailStr) return '';
    return emailStr.split('@')[0];
  };

  const formatTarih = (tarihStr) => {
    if (!tarihStr) return '-';
    const parts = tarihStr.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return tarihStr;
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? session.user : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // HASTALARI ÇEK
  const fetchHastalar = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('hastalar').select('*').eq('user_id', user.id);
    if (data) setHastalar(data);
  }, [user]);

  useEffect(() => {
    if (user) fetchHastalar();
  }, [user, fetchHastalar]);

  // HASTA DETAYLARINI ÇEK
  const fetchHastaDetaylari = useCallback(async (hastaId) => {
    if (!user) return;
    const { data: receteData } = await supabase.from('receteler').select('*').eq('hasta_id', hastaId).order('created_at', { ascending: false });
    if (receteData) setHastaReceteler(receteData);

    const { data: raporData } = await supabase.from('raporlar').select('*').eq('hasta_id', hastaId).order('created_at', { ascending: false });
    if (raporData) setHastaRaporlar(raporData);
  }, [user]);

  useEffect(() => {
    if (selectedHasta && user) fetchHastaDetaylari(selectedHasta.id);
  }, [selectedHasta, user, fetchHastaDetaylari]);

  // ADMIN: TÜM KULLANICILARI VE HASTA SAYILARINI ÇEK
  const fetchAdminStats = useCallback(async () => {
    if (!user) return;
    const { data: tumHastalar } = await supabase.from('hastalar').select('user_id, id');
    if (tumHastalar) {
      const userMap = {};
      tumHastalar.forEach(h => {
        const uId = h.user_id || 'Sahipsiz / Eski Veri';
        userMap[uId] = (userMap[uId] || 0) + 1;
      });

      const statsList = Object.keys(userMap).map(uId => ({
        user_id: uId,
        hasta_sayisi: userMap[uId]
      }));

      setAllUsersStats(statsList);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'admin' && user) fetchAdminStats();
  }, [activeTab, user, fetchAdminStats]);

  // ADMIN: BİR KULLANICININ HASTALARINI İNCELE
  const handleInspectUser = async (targetUserId) => {
    setInspectUser(targetUserId);
    let query = supabase.from('hastalar').select('*');
    if (targetUserId === 'Sahipsiz / Eski Veri') {
      query = query.is('user_id', null);
    } else {
      query = query.eq('user_id', targetUserId);
    }
    const { data } = await query;
    if (data) setInspectHastalar(data);
  };

  // ADMIN: KULLANICIYI VE TÜM VERİLERİNİ SİL (SİSTEMDEN AT)
  const executeKullaniciSil = async (targetUserId) => {
    let queryHastalar = supabase.from('hastalar').select('id');
    if (targetUserId === 'Sahipsiz / Eski Veri') {
      queryHastalar = queryHastalar.is('user_id', null);
    } else {
      queryHastalar = queryHastalar.eq('user_id', targetUserId);
    }

    const { data: userHastalar } = await queryHastalar;

    if (userHastalar && userHastalar.length > 0) {
      const hastaIds = userHastalar.map(h => h.id);
      await supabase.from('receteler').delete().in('hasta_id', hastaIds);
      await supabase.from('raporlar').delete().in('hasta_id', hastaIds);
    }

    if (targetUserId === 'Sahipsiz / Eski Veri') {
      await supabase.from('hastalar').delete().is('user_id', null);
    } else {
      await supabase.from('hastalar').delete().eq('user_id', targetUserId);
    }

    showToast('Kullanıcının verileri tamamen temizlendi! 🗑️', 'success');
    if (inspectUser === targetUserId) setInspectUser(null);
    fetchAdminStats();
    setConfirmModal(null);
  };

  // GİRİŞ / KAYIT İŞLEMLERİ
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);

    const internalEmail = getInternalEmail(username);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: internalEmail,
        password: password,
        options: {
          data: { display_name: username }
        }
      });

      if (error) {
        showToast('Kayıt Hatası: ' + error.message, 'error');
      } else {
        setUser(data.user);
        showToast(`Kayıt Başarılı! Hoş geldin ${username}!`, 'success');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password
      });

      if (error) {
        showToast('Giriş Yapılamadı! Şifrenizi veya kullanıcı adınızı kontrol edin.', 'error');
      } else {
        setUser(data.user);
        showToast(`Hoş geldin ${username}!`, 'success');
      }
    }
    setLoading(false);
  };

  // HASTA EKLE
  const handleHastaEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('hastalar').insert([{ ...yeniHasta, user_id: user.id }]);
    if (error) {
      showToast('Hata: ' + error.message, 'error');
    } else {
      setYeniHasta({ tc: '', ad: '', soyad: '', telefon: '' });
      fetchHastalar();
      showToast('Hasta klasörü oluşturuldu! 🎉', 'success');
    }
  };

  const executeHastaSil = async (hastaId) => {
    await supabase.from('receteler').delete().eq('hasta_id', hastaId);
    await supabase.from('raporlar').delete().eq('hasta_id', hastaId);
    const { error } = await supabase.from('hastalar').delete().eq('id', hastaId);
    if (error) {
      showToast('Hata: ' + error.message, 'error');
    } else {
      showToast('Hasta klasörü silindi 🗑️', 'success');
      if (selectedHasta?.id === hastaId) setSelectedHasta(null);
      fetchHastalar();
      if (inspectUser) handleInspectUser(inspectUser);
    }
    setConfirmModal(null);
  };

  // REÇETE EKLE
  const handleReceteEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('receteler').insert([{ ...yeniRecete, hasta_id: selectedHasta.id, user_id: user.id }]);
    if (error) {
      showToast('Hata: ' + error.message, 'error');
    } else {
      setYeniRecete({ ilac_adi: '', doz: '', tarih: '' });
      fetchHastaDetaylari(selectedHasta.id);
      showToast('İlaç eklendi! 💊', 'success');
    }
  };

  const executeReceteSil = async (receteId) => {
    const { error } = await supabase.from('receteler').delete().eq('id', receteId);
    if (error) showToast('Hata: ' + error.message, 'error');
    else {
      showToast('İlaç silindi 🗑️', 'success');
      fetchHastaDetaylari(selectedHasta.id);
    }
    setConfirmModal(null);
  };

  // RAPOR EKLE
  const handleRaporEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('raporlar').insert([{ ...yeniRapor, hasta_id: selectedHasta.id, user_id: user.id }]);
    if (error) showToast('Hata: ' + error.message, 'error');
    else {
      setYeniRapor({ rapor_adi: '', baslangic_tarihi: '', bitis_tarihi: '', notlar: '' });
      fetchHastaDetaylari(selectedHasta.id);
      showToast('Rapor kaydedildi! 📄', 'success');
    }
  };

  const executeRaporSil = async (raporId) => {
    const { error } = await supabase.from('raporlar').delete().eq('id', raporId);
    if (error) showToast('Hata: ' + error.message, 'error');
    else {
      showToast('Rapor silindi 🗑️', 'success');
      fetchHastaDetaylari(selectedHasta.id);
    }
    setConfirmModal(null);
  };

  const filteredHastalar = hastalar
    .filter(h => h.ad?.toLowerCase().includes(searchTerm.toLowerCase()) || h.soyad?.toLowerCase().includes(searchTerm.toLowerCase()) || h.tc?.includes(searchTerm))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

  const currentUserDisplayName = user ? getDisplayName(user.email) : '';
  const isAdmin = ADMIN_USERS.includes(currentUserDisplayName.toLowerCase());

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', fontFamily: 'system-ui, sans-serif', color: '#f1f5f9', padding: '24px 16px' }}>
      {/* TOAST BİLDİRİMİ */}
      {toast && (
        <div style={{ position: 'fixed', top: '24px', right: '24px', backgroundColor: toast.type === 'error' ? '#dc2626' : '#059669', color: '#ffffff', padding: '14px 22px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', zIndex: 9999, fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* SİLME ONAY MODALI */}
      {confirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '20px', padding: '28px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>İşlemi Onayla</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 24px 0' }}><strong style={{ color: '#ef4444' }}>"{confirmModal.title}"</strong> silmek/temizlemek istediğinizden emin misiniz?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmModal(null)} style={{ flex: 1, backgroundColor: '#1f2937', color: '#9ca3af', border: '1px solid #374151', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>İptal</button>
              <button onClick={() => {
                if (confirmModal.type === 'hasta') executeHastaSil(confirmModal.id);
                if (confirmModal.type === 'recete') executeReceteSil(confirmModal.id);
                if (confirmModal.type === 'rapor') executeRaporSil(confirmModal.id);
                if (confirmModal.type === 'user') executeKullaniciSil(confirmModal.id);
              }} style={{ flex: 1, backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* GİRİŞ VE KAYIT EKRANI */}
      {!user ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '85vh' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '24px', padding: '40px 32px', width: '100%', maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '54px', marginBottom: '12px' }}>💊</div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#ffffff', margin: '0 0 6px 0' }}>Eczane Takip</h1>
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                {isSignUp ? 'Hesap oluşturun (Onay beklemeden anında girin)' : 'Hesabınıza giriş yapın'}
              </p>
            </div>
            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>KULLANICI ADI</label>
                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Kullanıcı Adı" style={modernInputStyle} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>ŞİFRE</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={modernInputStyle} />
              </div>

              <button type="submit" disabled={loading} style={btnPrimaryStyle}>
                {loading ? 'İşleniyor...' : (isSignUp ? 'Kayıt Ol ve Giriş Yap ➔' : 'Giriş Yap ➔')}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                  {isSignUp ? 'Zaten hesabınız var mı? Giriş Yapın' : 'Hesabınız yok mu? Anında Kayıt Olun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* ANA PANEL */
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* ÜST BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '20px 24px', backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#064e3b', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📂</div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#ffffff' }}>Eczane Takip Sistemi</h1>
                <p style={{ fontSize: '13px', color: '#10b981', margin: '2px 0 0 0', fontWeight: '600' }}>
                  👤 Kullanıcı: {currentUserDisplayName} {isAdmin && <span style={{ backgroundColor: '#312e81', color: '#818cf8', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', marginLeft: '6px' }}>👑 Admin</span>}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {isAdmin && (
                <div style={{ backgroundColor: '#090d16', padding: '4px', borderRadius: '12px', border: '1px solid #1f2937', display: 'flex', gap: '4px' }}>
                  <button onClick={() => { setActiveTab('hastalar'); setInspectUser(null); }} style={{ ...navBtnStyle, backgroundColor: activeTab === 'hastalar' ? '#059669' : 'transparent', color: activeTab === 'hastalar' ? '#ffffff' : '#9ca3af' }}>📂 Hastalarım</button>
                  <button onClick={() => setActiveTab('admin')} style={{ ...navBtnStyle, backgroundColor: activeTab === 'admin' ? '#4f46e5' : 'transparent', color: activeTab === 'admin' ? '#ffffff' : '#9ca3af' }}>👑 Admin Paneli</button>
                </div>
              )}
              <button onClick={() => { setSelectedHasta(null); supabase.auth.signOut(); showToast('Çıkış yapıldı', 'success'); }} style={{ ...navBtnStyle, backgroundColor: '#374151', color: '#d1d5db' }}>Çıkış Yap</button>
            </div>
          </div>

          {/* HASTALAR SEKMESİ */}
          {activeTab === 'hastalar' && (
            !selectedHasta ? (
              <div>
                {/* HASTA EKLE KARTI */}
                <div style={cardStyle}>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#10b981', fontSize: '18px' }}>➕ Yeni Hasta Klasörü Oluştur</h3>
                  <form onSubmit={handleHastaEkle} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={labelStyle}>T.C. KİMLİK NO</label>
                      <input placeholder="11 haneli T.C." maxLength={11} value={yeniHasta.tc} onChange={e => setYeniHasta({...yeniHasta, tc: e.target.value})} required style={modernInputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>AD</label>
                      <input placeholder="Hasta Adı" value={yeniHasta.ad} onChange={e => setYeniHasta({...yeniHasta, ad: e.target.value})} required style={modernInputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>SOYAD</label>
                      <input placeholder="Hasta Soyadı" value={yeniHasta.soyad} onChange={e => setYeniHasta({...yeniHasta, soyad: e.target.value})} required style={modernInputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>TELEFON</label>
                      <input placeholder="05xx xxx xx xx" value={yeniHasta.telefon} onChange={e => setYeniHasta({...yeniHasta, telefon: e.target.value})} style={modernInputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                      <button type="submit" style={btnPrimaryStyle}>📁 Klasörü Kaydet ve Oluştur</button>
                    </div>
                  </form>
                </div>

                {/* HASTA LİSTESİ KARTI */}
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff' }}>📁 Kayıtlı Hasta Klasörleri ({filteredHastalar.length})</h3>
                    <input placeholder="🔍 Hasta Ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ ...modernInputStyle, width: '280px' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {filteredHastalar.map(h => (
                      <div key={h.id} style={{ backgroundColor: '#090d16', border: '1px solid #1f2937', borderRadius: '16px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div onClick={() => setSelectedHasta(h)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                          <span style={{ fontSize: '40px' }}>📁</span>
                          <div>
                            <h4 style={{ margin: '0 0 4px 0', color: '#f3f4f6', fontSize: '16px', fontWeight: '700' }}>{h.ad} {h.soyad}</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>TC: {h.tc}</p>
                          </div>
                        </div>
                        <button onClick={() => setConfirmModal({ id: h.id, title: `${h.ad} ${h.soyad}`, type: 'hasta' })} style={compactDeleteBtn}>🗑️</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* HASTA DETAY SAYFASI */
              <div>
                <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => setSelectedHasta(null)} style={{ backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⬅️ Klasörlere Dön
                    </button>
                    <div>
                      <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '22px', fontWeight: '800' }}>{selectedHasta.ad} {selectedHasta.soyad}</h2>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#1e293b', padding: '3px 10px', borderRadius: '6px' }}>🆔 T.C.: <strong style={{ color: '#cbd5e1' }}>{selectedHasta.tc}</strong></span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', backgroundColor: '#1e293b', padding: '3px 10px', borderRadius: '6px' }}>📞 Tel: <strong style={{ color: '#cbd5e1' }}>{selectedHasta.telefon || 'Girilmemiş'}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                  {/* İLAÇ BÖLÜMÜ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                      <h3 style={{ margin: '0 0 16px 0', color: '#fbbf24', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>💊 Yeni İlaç Ekle</h3>
                      <form onSubmit={handleReceteEkle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input placeholder="İlaç Adı (ör. Parol)" value={yeniRecete.ilac_adi} onChange={e => setYeniRecete({...yeniRecete, ilac_adi: e.target.value})} required style={modernInputStyle} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <input placeholder="Doz (ör. 1*2)" value={yeniRecete.doz} onChange={e => setYeniRecete({...yeniRecete, doz: e.target.value})} style={modernInputStyle} />
                          <input type="date" value={yeniRecete.tarih} onChange={e => setYeniRecete({...yeniRecete, tarih: e.target.value})} required style={modernInputStyle} />
                        </div>
                        <button type="submit" style={{ ...modernBtnStyle, backgroundColor: '#d97706', color: '#ffffff' }}>+ İlaç Kaydet</button>
                      </form>
                    </div>

                    <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                      <h4 style={{ margin: '0 0 14px 0', color: '#94a3b8', fontSize: '14px' }}>📋 İlaç Geçmişi ({hastaReceteler.length})</h4>
                      {hastaReceteler.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>Henüz ilaç kaydı yok.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {hastaReceteler.map(r => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: '#1e293b', borderRadius: '10px', border: '1px solid #334155' }}>
                              <div>
                                <strong style={{ color: '#f8fafc', fontSize: '14px' }}>{r.ilac_adi}</strong>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Doz: <span style={{ color: '#fbbf24' }}>{r.doz || '-'}</span> | Tarih: {formatTarih(r.tarih)}</div>
                              </div>
                              <button onClick={() => setConfirmModal({ id: r.id, title: r.ilac_adi, type: 'recete' })} style={compactDeleteBtn}>🗑️</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RAPOR BÖLÜMÜ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                      <h3 style={{ margin: '0 0 16px 0', color: '#34d399', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>📄 Yeni Rapor Ekle</h3>
                      <form onSubmit={handleRaporEkle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <input placeholder="Rapor Adı veya Teşhis" value={yeniRapor.rapor_adi} onChange={e => setYeniRapor({...yeniRapor, rapor_adi: e.target.value})} required style={modernInputStyle} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>BAŞLANGIÇ</label>
                            <input type="date" value={yeniRapor.baslangic_tarihi} onChange={e => setYeniRapor({...yeniRapor, baslangic_tarihi: e.target.value})} style={modernInputStyle} />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '2px' }}>BİTİŞ</label>
                            <input type="date" value={yeniRapor.bitis_tarihi} onChange={e => setYeniRapor({...yeniRapor, bitis_tarihi: e.target.value})} style={modernInputStyle} />
                          </div>
                        </div>
                        <textarea placeholder="Notlar / Kullanım Talimatları..." value={yeniRapor.notlar} onChange={e => setYeniRapor({...yeniRapor, notlar: e.target.value})} style={{ ...modernInputStyle, minHeight: '50px', resize: 'vertical' }} />
                        <button type="submit" style={{ ...modernBtnStyle, backgroundColor: '#059669', color: '#ffffff' }}>+ Rapor Kaydet</button>
                      </form>
                    </div>

                    <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
                      <h4 style={{ margin: '0 0 14px 0', color: '#94a3b8', fontSize: '14px' }}>📂 Kayıtlı Raporlar ({hastaRaporlar.length})</h4>
                      {hastaRaporlar.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>Henüz rapor kaydı yok.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {hastaRaporlar.map(rap => (
                            <div key={rap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', backgroundColor: '#1e293b', borderRadius: '10px', border: '1px solid #334155' }}>
                              <div>
                                <strong style={{ color: '#f8fafc', fontSize: '14px' }}>{rap.rapor_adi}</strong>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>📅 {formatTarih(rap.baslangic_tarihi)} ➔ {formatTarih(rap.bitis_tarihi)}</div>
                                {rap.notlar && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>📝 {rap.notlar}</div>}
                              </div>
                              <button onClick={() => setConfirmModal({ id: rap.id, title: rap.rapor_adi, type: 'rapor' })} style={compactDeleteBtn}>🗑️</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ADMIN PANOLARI VE KULLANICI İNCELEME */}
          {activeTab === 'admin' && isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={cardStyle}>
                <h3 style={{ marginTop: 0, color: '#818cf8', fontSize: '18px', marginBottom: '20px' }}>👑 Admin Paneli - Eczane Personelleri & İstatistikler</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {allUsersStats.map((st, idx) => (
                    <div key={idx} style={{ backgroundColor: '#090d16', border: '1px solid #312e81', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#818cf8', fontWeight: '700', textTransform: 'uppercase' }}>KULLANICI / USER ID</div>
                        <div style={{ fontSize: '13px', color: '#f3f4f6', wordBreak: 'break-all', margin: '4px 0 14px 0', fontFamily: 'monospace' }}>{st.user_id}</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#34d399' }}>{st.hasta_sayisi} <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: 'normal' }}>Hasta Klasörü</span></div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                        <button onClick={() => handleInspectUser(st.user_id)} style={{ ...modernBtnStyle, backgroundColor: '#4f46e5', color: '#ffffff', flex: 1 }}>
                          👁️ İncele
                        </button>
                        <button onClick={() => setConfirmModal({ id: st.user_id, title: `Kullanıcı (${st.user_id}) ve Tüm Verileri`, type: 'user' })} style={{ ...modernBtnStyle, backgroundColor: '#dc2626', color: '#ffffff', width: '42px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Kullanıcıyı ve Hastalarını Sil">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEÇİLEN PERSONELİN HASTALARINI İNCELEME EKRANI */}
              {inspectUser && (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0, color: '#f3f4f6', fontSize: '16px' }}>🔍 İnceleme Ekranı: <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{inspectUser}</span></h4>
                    <button onClick={() => setInspectUser(null)} style={{ backgroundColor: '#374151', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Kapat</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                    {inspectHastalar.map(h => (
                      <div key={h.id} style={{ backgroundColor: '#090d16', border: '1px solid #1f2937', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#ffffff', fontSize: '14px' }}>{h.ad} {h.soyad}</strong>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>TC: {h.tc} | Tel: {h.telefon || '-'}</div>
                        </div>
                        <button onClick={() => setConfirmModal({ id: h.id, title: `${h.ad} ${h.soyad}`, type: 'hasta' })} style={compactDeleteBtn}>🗑️</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const modernInputStyle = { width: '100%', padding: '10px 14px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc', outline: 'none', fontSize: '13px', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#9ca3af', marginBottom: '6px' };
const btnPrimaryStyle = { width: '100%', backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' };
const modernBtnStyle = { width: '100%', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', marginTop: '4px' };
const navBtnStyle = { border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' };
const cardStyle = { backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '20px', padding: '24px', marginBottom: '24px' };
const compactDeleteBtn = { backgroundColor: '#334155', color: '#ef4444', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' };
