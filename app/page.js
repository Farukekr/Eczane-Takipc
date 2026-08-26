'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [usernameInput, setUsernameInput] = useState('');
  const [activeUser, setActiveUser] = useState(null);

  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const [hastalar, setHastalar] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHasta, setSelectedHasta] = useState(null);

  const [hastaReceteler, setHastaReceteler] = useState([]);
  const [hastaRaporlar, setHastaRaporlar] = useState([]);

  const [yeniHasta, setYeniHasta] = useState({ tc: '', ad: '', soyad: '', telefon: '' });
  const [yeniRecete, setYeniRecete] = useState({ ilac_adi: '', doz: '', tarih: '' });
  const [yeniRapor, setYeniRapor] = useState({ rapor_adi: '', baslangic_tarihi: '', bitis_tarihi: '', notlar: '' });

  // Kullanıcı adını temizleyip benzersiz ID'ye çevirir
  const cleanUserId = (name) => {
    if (!name) return '';
    return name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '_');
  };

  const formatTarih = (tarihStr) => {
    if (!tarihStr) return '-';
    const parts = tarihStr.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return tarihStr;
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sayfa açıldığında hafızadaki oturumu kontrol et
  useEffect(() => {
    const savedUser = localStorage.getItem('eczane_active_user');
    if (savedUser) {
      try {
        setActiveUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('eczane_active_user');
      }
    }
  }, []);

  // ŞİFRESİZ ANINDA GİRİŞ
  const handleLogin = (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    const uId = cleanUserId(usernameInput);
    const userData = { id: uId, name: usernameInput.trim() };

    localStorage.setItem('eczane_active_user', JSON.stringify(userData));
    setActiveUser(userData);
    showToast(`Hoş geldin ${userData.name}!`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('eczane_active_user');
    setActiveUser(null);
    setSelectedHasta(null);
    showToast('Çıkış yapıldı', 'success');
  };

  // HASTALARI ÇEK
  const fetchHastalar = useCallback(async () => {
    if (!activeUser) return;
    const { data, error } = await supabase
      .from('hastalar')
      .select('*')
      .eq('user_id', activeUser.id);

    if (error) console.error('Hasta çekme hatası:', error);
    if (data) setHastalar(data);
  }, [activeUser]);

  useEffect(() => {
    if (activeUser) fetchHastalar();
  }, [activeUser, fetchHastalar]);

  // HASTA DETAYLARINI ÇEK
  const fetchHastaDetaylari = useCallback(async (hastaId) => {
    if (!activeUser) return;

    const { data: receteData } = await supabase
      .from('receteler')
      .select('*')
      .eq('hasta_id', hastaId)
      .eq('user_id', activeUser.id)
      .order('created_at', { ascending: false });
    if (receteData) setHastaReceteler(receteData);

    const { data: raporData } = await supabase
      .from('raporlar')
      .select('*')
      .eq('hasta_id', hastaId)
      .eq('user_id', activeUser.id)
      .order('created_at', { ascending: false });
    if (raporData) setHastaRaporlar(raporData);
  }, [activeUser]);

  useEffect(() => {
    if (selectedHasta && activeUser) fetchHastaDetaylari(selectedHasta.id);
  }, [selectedHasta, activeUser, fetchHastaDetaylari]);

  // HASTA EKLE
  const handleHastaEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('hastalar')
      .insert([{ ...yeniHasta, user_id: activeUser.id }]);

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
    }
    setConfirmModal(null);
  };

  // İLAÇ EKLE / SİL
  const handleReceteEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('receteler')
      .insert([{ ...yeniRecete, hasta_id: selectedHasta.id, user_id: activeUser.id }]);

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

  // RAPOR EKLE / SİL
  const handleRaporEkle = async (e) => {
    e.preventDefault();
    const { error } = await supabase
      .from('raporlar')
      .insert([{ ...yeniRapor, hasta_id: selectedHasta.id, user_id: activeUser.id }]);

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
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 24px 0' }}><strong style={{ color: '#ef4444' }}>"{confirmModal.title}"</strong> öğesini silmek istediğinizden emin misiniz?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmModal(null)} style={{ flex: 1, backgroundColor: '#1f2937', color: '#9ca3af', border: '1px solid #374151', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>İptal</button>
              <button onClick={() => {
                if (confirmModal.type === 'hasta') executeHastaSil(confirmModal.id);
                if (confirmModal.type === 'recete') executeReceteSil(confirmModal.id);
                if (confirmModal.type === 'rapor') executeRaporSil(confirmModal.id);
              }} style={{ flex: 1, backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* GİRİŞ EKRANI */}
      {!activeUser ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '85vh' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '24px', padding: '40px 32px', width: '100%', maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '54px', marginBottom: '12px' }}>💊</div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#ffffff', margin: '0 0 6px 0' }}>Eczane Takip</h1>
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Giriş yapmak için adınızı yazın</p>
            </div>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>KULLANICI ADI</label>
                <input 
                  type="text" 
                  required 
                  value={usernameInput} 
                  onChange={(e) => setUsernameInput(e.target.value)} 
                  placeholder="Kullanıcı Adı" 
                  style={modernInputStyle} 
                />
              </div>
              <button type="submit" style={btnPrimaryStyle}>
                Sisteme Giriş Yap ➔
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ANA PANEL */
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* ÜST BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '20px 24px', backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#064e3b', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📂</div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#ffffff' }}>Eczane Takip Sistemi</h1>
                <p style={{ fontSize: '13px', color: '#10b981', margin: '2px 0 0 0', fontWeight: '600' }}>
                  👤 Aktif Kullanıcı: {activeUser.name}
                </p>
              </div>
            </div>

            <button onClick={handleLogout} style={{ ...navBtnStyle, backgroundColor: '#374151', color: '#d1d5db' }}>Çıkış Yap</button>
          </div>

          {!selectedHasta ? (
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
const navBtnStyle = { border: 'none', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' };
const cardStyle = { backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '20px', padding: '24px', marginBottom: '24px' };
const compactDeleteBtn = { backgroundColor: '#334155', color: '#ef4444', border: 'none', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' };
