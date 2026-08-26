'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin Kullanıcı Adı (Küçük harfle yazın)
const ADMIN_USERNAME = 'omerfarukeker23';

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Özel Site İçi Toast Bildirim Durumu
  const [toast, setToast] = useState(null);

  // Özel Silme/İşlem Onay Modal Durumu
  const [confirmModal, setConfirmModal] = useState(null);

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

  // Kullanıcı adını dahili e-postaya dönüştürme yardımcısı
  const getInternalEmail = (uName) => {
    const cleanName = uName.trim().toLowerCase().replace(/\s+/g, '');
    return `${cleanName}@eczane.local`;
  };

  const getDisplayName = (emailStr) => {
    if (!emailStr) return '';
    return emailStr.split('@')[0];
  };

  const formatTarih = (tarihStr) => {
    if (!tarihStr) return '-';
    const parts = tarihStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return tarihStr;
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // KULLANICI GİRİŞ DURUMUNU VE ADMİN ONAYINI KONTROL ET
  const checkUserApprovalAndSet = async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      return;
    }

    const currentUsername = getDisplayName(sessionUser.email);

    // Admin ise doğrudan al
    if (currentUsername === ADMIN_USERNAME.toLowerCase()) {
      setUser(sessionUser);
      return;
    }

    // Normal kullanıcı ise onaylı mı bak
    const { data } = await supabase
      .from('user_approvals')
      .select('is_approved')
      .eq('user_id', sessionUser.id)
      .maybeSingle();

    if (data && data.is_approved) {
      setUser(sessionUser);
    } else {
      await supabase.auth.signOut();
      setUser(null);
      showToast('Hesabınız oluşturuldu ancak yönetici (Admin) onayı bekliyor.', 'error');
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkUserApprovalAndSet(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkUserApprovalAndSet(session.user);
      } else {
        setUser(null);
      }
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
      .eq('user_id', user.id);
    
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

  // GİRİŞ YAP & ADMIN ONAY KONTROLLÜ KAYIT (KULLANICI ADI İLE)
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    const internalEmail = getInternalEmail(username);

    let { data, error } = await supabase.auth.signInWithPassword({ 
      email: internalEmail, 
      password 
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        // Hesap yoksa otomatik oluştur
        const signUpRes = await supabase.auth.signUp({ 
          email: internalEmail, 
          password 
        });
        
        if (signUpRes.error) {
          showToast(signUpRes.error.message, 'error');
        } else {
          showToast('Hesabınız oluşturuldu! Yönetici onayı verildikten sonra giriş yapabilirsiniz.', 'success');
        }
        setLoading(false);
        return;
      }
      showToast('Giriş hatası: ' + error.message, 'error');
    } else {
      if (data.user) {
        await checkUserApprovalAndSet(data.user);
      }
    }
    setLoading(false);
  };

  // --- ADMIN ONAY VE KULLANICI YÖNETİM İŞLEMLERİ ---
  const handleToggleApproval = async (targetUserId, targetUsername, currentStatus) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.rpc('admin_toggle_user_approval', { 
      target_user_id: targetUserId, 
      new_status: newStatus 
    });

    if (error) {
      showToast('Onay durumu güncellenemedi: ' + error.message, 'error');
    } else {
      showToast(`${targetUsername} kullanıcısının onay durumu güncellendi: ${newStatus ? 'ONAYLANDI ✅' : 'ONAY KALDIRILDI ⏸️'}`, 'success');
      fetchAdminStats();
    }
  };

  const handleUserRevoke = async (targetUserId, targetUsername) => {
    const { error } = await supabase.rpc('admin_revoke_user_sessions', { target_user_id: targetUserId });
    if (error) {
      showToast('Kullanıcı atılırken hata oluştu: ' + error.message, 'error');
    } else {
      showToast(`${targetUsername} kullanıcısının oturumu kapatıldı! 🚪`, 'success');
      fetchAdminStats();
    }
    setConfirmModal(null);
  };

  const handleUserDelete = async (targetUserId, targetUsername) => {
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: targetUserId });
    if (error) {
      showToast('Kullanıcı silinirken hata oluştu: ' + error.message, 'error');
    } else {
      showToast(`${targetUsername} kullanıcısı ve verileri silindi! 🗑️`, 'success');
      fetchAdminStats();
    }
    setConfirmModal(null);
  };

  // --- HASTA EKLE VE SİL ---
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

  const executeHastaSil = async (hastaId) => {
    await supabase.from('receteler').delete().eq('hasta_id', hastaId);
    await supabase.from('raporlar').delete().eq('hasta_id', hastaId);
    
    const { error } = await supabase.from('hastalar').delete().eq('id', hastaId);

    if (error) {
      showToast('Hasta silinirken hata oluştu: ' + error.message, 'error');
    } else {
      showToast('Hasta klasörü ve tüm verileri silindi 🗑️', 'success');
      if (selectedHasta?.id === hastaId) setSelectedHasta(null);
      fetchHastalar();
    }
    setConfirmModal(null);
  };

  // --- REÇETE EKLE VE SİL ---
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

  const executeReceteSil = async (receteId) => {
    const { error } = await supabase.from('receteler').delete().eq('id', receteId);
    if (error) {
      showToast('İlaç silinemedi: ' + error.message, 'error');
    } else {
      showToast('İlaç silindi 🗑️', 'success');
      fetchHastaDetaylari(selectedHasta.id);
    }
    setConfirmModal(null);
  };

  // --- RAPOR EKLE VE SİL ---
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

  const executeRaporSil = async (raporId) => {
    const { error } = await supabase.from('raporlar').delete().eq('id', raporId);
    if (error) {
      showToast('Rapor silinemedi: ' + error.message, 'error');
    } else {
      showToast('Rapor silindi 🗑️', 'success');
      fetchHastaDetaylari(selectedHasta.id);
    }
    setConfirmModal(null);
  };

  const filteredHastalar = hastalar
    .filter(h => 
      h.ad?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      h.soyad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.tc?.includes(searchTerm)
    )
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));

  const currentUserDisplayName = user ? getDisplayName(user.email) : '';
  const isAdmin = currentUserDisplayName.toLowerCase() === ADMIN_USERNAME.toLowerCase();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#f1f5f9', padding: '24px 16px' }}>
      
      {/* SİTE İÇİ ŞIK BİLDİRİM (TOAST) */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: toast.type === 'error' ? '#dc2626' : '#059669',
          color: '#ffffff',
          padding: '14px 22px',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          fontWeight: '600',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)'
        }}>
          <span style={{ fontSize: '18px' }}>{toast.type === 'error' ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ÖZEL İŞLEM VE SİLME ONAY PENCERESİ (MODAL) */}
      {confirmModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '20px',
            padding: '28px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
              İşlemi Onayla
            </h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 24px 0', lineHeight: '1.5' }}>
              <strong style={{ color: '#ef4444' }}>"{confirmModal.title}"</strong> işlemi gerçekleştirilecek. Devam etmek istiyor musunuz?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setConfirmModal(null)}
                style={{
                  flex: 1, backgroundColor: '#1f2937', color: '#9ca3af', border: '1px solid #374151',
                  padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px'
                }}
              >
                İptal
              </button>
              <button 
                onClick={() => {
                  if (confirmModal.type === 'hasta') executeHastaSil(confirmModal.id);
                  if (confirmModal.type === 'recete') executeReceteSil(confirmModal.id);
                  if (confirmModal.type === 'rapor') executeRaporSil(confirmModal.id);
                  if (confirmModal.type === 'revoke_user') handleUserRevoke(confirmModal.id, confirmModal.title);
                  if (confirmModal.type === 'delete_user') handleUserDelete(confirmModal.id, confirmModal.title);
                }}
                style={{
                  flex: 1, backgroundColor: '#dc2626', color: '#ffffff', border: 'none',
                  padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px'
                }}
              >
                Evet, Devam Et
              </button>
            </div>
          </div>
        </div>
      )}

      {!user ? (
        /* GİRİŞ EKRANI */
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '85vh' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '24px', padding: '40px 32px', width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', filter: 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.3))' }}>💊</div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>Eczane Takip</h1>
              <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>Profesyonel Hasta & Reçete Portalı</p>
            </div>
            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#9ca3af', marginBottom: '8px', letterSpacing: '0.5px' }}>KULLANICI ADI</label>
                <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="kullanici_adi" style={inputStyle} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#9ca3af', marginBottom: '8px', letterSpacing: '0.5px' }}>PAROLA</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} style={btnPrimaryStyle}>
                {loading ? 'İşlem Yapılıyor...' : 'Giriş Yap / Kayıt Ol ➔'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ANA PANEL */
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* ÜST BAR (HEADER) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '20px 24px', backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: '#064e3b', width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📂</div>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#ffffff' }}>Eczane Takip Sistemi</h1>
                <p style={{ fontSize: '13px', color: '#10b981', margin: '2px 0 0 0', fontWeight: '500' }}>
                  👤 {currentUserDisplayName} {isAdmin && <span style={{ backgroundColor: '#991b1b', color: '#fecaca', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', marginLeft: '6px' }}>👑 Admin</span>}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => { setActiveTab('hastalar'); setSelectedHasta(null); }}
                style={{ ...navBtnStyle, backgroundColor: activeTab === 'hastalar' ? '#10b981' : '#1f2937', color: activeTab === 'hastalar' ? '#ffffff' : '#9ca3af' }}
              >
                📁 Hastalarım
              </button>

              {isAdmin && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  style={{ ...navBtnStyle, backgroundColor: activeTab === 'admin' ? '#dc2626' : '#1f2937', color: activeTab === 'admin' ? '#ffffff' : '#9ca3af' }}
                >
                  👑 Admin Paneli
                </button>
              )}

              <button onClick={() => { setSelectedHasta(null); supabase.auth.signOut(); showToast('Çıkış yapıldı', 'success'); }} style={{ ...navBtnStyle, backgroundColor: '#374151', color: '#d1d5db' }}>Çıkış</button>
            </div>
          </div>

          {/* ADMIN PANELI */}
          {activeTab === 'admin' && isAdmin && (
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#ef4444', fontSize: '20px', fontWeight: '700' }}>👑 Admin Yönetim Paneli</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>Kullanıcıların siteye girişini onaylayın, oturumlarını kapatın veya tamamen silin</p>
                </div>
                <button onClick={fetchAdminStats} style={{ ...navBtnStyle, backgroundColor: '#1f2937', border: '1px solid #374151' }}>🔄 Verileri Yenile</button>
              </div>
              
              {adminLoading ? (
                <p style={{ color: '#9ca3af', padding: '20px 0', textAlign: 'center' }}>Yükleniyor...</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #1f2937', color: '#9ca3af' }}>
                        <th style={{ padding: '14px' }}>Kullanıcı Adı</th>
                        <th style={{ padding: '14px' }}>Admin Onayı</th>
                        <th style={{ padding: '14px', textAlign: 'center' }}>Hasta</th>
                        <th style={{ padding: '14px', textAlign: 'center' }}>Reçete</th>
                        <th style={{ padding: '14px', textAlign: 'center' }}>Rapor</th>
                        <th style={{ padding: '14px' }}>Kayıt Tarihi</th>
                        <th style={{ padding: '14px', textAlign: 'right' }}>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.user_id} style={{ borderBottom: '1px solid #1f2937' }}>
                          <td style={{ padding: '14px', fontWeight: '600', color: '#f3f4f6' }}>
                            👤 {u.display_name}
                            {u.display_name.toLowerCase() === ADMIN_USERNAME.toLowerCase() && <span style={{ color: '#ef4444', marginLeft: '6px', fontSize: '12px' }}>(Siz)</span>}
                          </td>
                          <td style={{ padding: '14px' }}>
                            {u.is_approved ? (
                              <span style={{ color: '#34d399', backgroundColor: '#064e3b', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>✅ Giriş İzinli</span>
                            ) : (
                              <span style={{ color: '#fca5a5', backgroundColor: '#451a1a', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>⏳ Onay Bekliyor</span>
                            )}
                          </td>
                          <td style={{ padding: '14px', color: '#38bdf8', fontWeight: 'bold', textAlign: 'center' }}>{u.total_hastalar}</td>
                          <td style={{ padding: '14px', color: '#fbbf24', fontWeight: 'bold', textAlign: 'center' }}>{u.total_receteler}</td>
                          <td style={{ padding: '14px', color: '#34d399', fontWeight: 'bold', textAlign: 'center' }}>{u.total_raporlar}</td>
                          <td style={{ padding: '14px', color: '#9ca3af', fontSize: '13px' }}>
                            {formatTarih(u.created_at?.split('T')[0])}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right' }}>
                            {u.display_name.toLowerCase() !== ADMIN_USERNAME.toLowerCase() ? (
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => handleToggleApproval(u.user_id, u.display_name, u.is_approved)}
                                  style={{ 
                                    backgroundColor: u.is_approved ? '#374151' : '#059669', 
                                    color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' 
                                  }}
                                >
                                  {u.is_approved ? '⏸️ Onayı Kaldır' : '✅ Onayla'}
                                </button>
                                <button 
                                  onClick={() => setConfirmModal({ id: u.user_id, title: `${u.display_name} kullanıcısını siteden at`, type: 'revoke_user' })}
                                  style={{ backgroundColor: '#d97706', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                >
                                  🚪 Siteden At
                                </button>
                                <button 
                                  onClick={() => setConfirmModal({ id: u.user_id, title: `${u.display_name} hesabını ve tüm verilerini sil`, type: 'delete_user' })}
                                  style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                >
                                  ❌ Kullanıcıyı Sil
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#6b7280' }}>Admin Korumalı</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* HASTALAR SEKMESİ */}
          {activeTab === 'hastalar' && (
            <>
              {!selectedHasta ? (
                <div>
                  {/* HASTA EKLE KARTI */}
                  <div style={cardStyle}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#10b981', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>➕</span> Yeni Hasta Klasörü Oluştur
                    </h3>
                    <form onSubmit={handleHastaEkle} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={labelStyle}>T.C. KİMLİK NO</label>
                        <input placeholder="11 haneli T.C." maxLength={11} value={yeniHasta.tc} onChange={e => setYeniHasta({...yeniHasta, tc: e.target.value})} required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>AD</label>
                        <input placeholder="Hasta Adı" value={yeniHasta.ad} onChange={e => setYeniHasta({...yeniHasta, ad: e.target.value})} required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>SOYAD</label>
                        <input placeholder="Hasta Soyadı" value={yeniHasta.soyad} onChange={e => setYeniHasta({...yeniHasta, soyad: e.target.value})} required style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>TELEFON (OPSİYONEL)</label>
                        <input placeholder="05xx xxx xx xx" value={yeniHasta.telefon} onChange={e => setYeniHasta({...yeniHasta, telefon: e.target.value})} style={inputStyle} />
                      </div>
                      <div style={{ gridColumn: '1 / -1', marginTop: '6px' }}>
                        <button type="submit" style={btnPrimaryStyle}>📁 Klasörü Kaydet ve Oluştur</button>
                      </div>
                    </form>
                  </div>

                  {/* HASTALARI LİSTELEME VE ARAMA */}
                  <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          📁 Kayıtlı Hasta Klasörleri ({filteredHastalar.length}) 
                          <span style={{ fontSize: '12px', backgroundColor: '#064e3b', color: '#34d399', padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>🔤 A-Z Sıralı</span>
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>Detayları görmek için klasöre tıklayın</p>
                      </div>
                      <input 
                        placeholder="🔍 Hasta Ara (Ad, Soyad, TC)..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        style={{ ...inputStyle, width: '280px' }} 
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                      {filteredHastalar.map(h => (
                        <div 
                          key={h.id} 
                          style={{
                            backgroundColor: '#090d16',
                            border: '1px solid #1f2937',
                            borderRadius: '16px',
                            padding: '18px',
                            position: 'relative',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div 
                            onClick={() => setSelectedHasta(h)} 
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}
                          >
                            <span style={{ fontSize: '40px' }}>📁</span>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', color: '#f3f4f6', fontSize: '16px', fontWeight: '700' }}>{h.ad} {h.soyad}</h4>
                              <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>TC: {h.tc}</p>
                              {h.telefon && <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#6b7280' }}>📞 {h.telefon}</p>}
                            </div>
                          </div>

                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setConfirmModal({ id: h.id, title: `${h.ad} ${h.soyad} klasörü ve tüm verileri`, type: 'hasta' });
                            }}
                            title="Klasörü Sil"
                            style={deleteBtnStyle}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}

                      {filteredHastalar.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                          <p style={{ fontSize: '15px' }}>Henüz kayıtlı bir hasta bulunamadı.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* HASTA SEÇİLDİĞİNDE KLASÖR İÇERİĞİ */
                <div>
                  <div style={{ ...cardStyle, borderLeft: '6px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <button 
                          onClick={() => setSelectedHasta(null)}
                          style={{ backgroundColor: '#1f2937', color: '#38bdf8', border: '1px solid #374151', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}
                        >
                          ⬅️ Tüm Klasörlere Dön
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontSize: '48px' }}>📂</span>
                          <div>
                            <h2 style={{ margin: '0 0 4px 0', color: '#ffffff', fontSize: '24px', fontWeight: '800' }}>{selectedHasta.ad} {selectedHasta.soyad}</h2>
                            <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
                              <strong style={{ color: '#d1d5db' }}>T.C. Kimlik:</strong> {selectedHasta.tc} &nbsp;|&nbsp; 
                              <strong style={{ color: '#d1d5db' }}> Telefon:</strong> {selectedHasta.telefon || 'Kayıt Yok'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => setConfirmModal({ id: selectedHasta.id, title: `${selectedHasta.ad} ${selectedHasta.soyad} klasörü`, type: 'hasta' })}
                        style={{ backgroundColor: '#7f1d1d', color: '#fecaca', border: 'none', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        🗑️ Hasta Klasörünü Sil
                      </button>
                    </div>
                  </div>

                  {/* İLAÇ VE RAPOR MODÜLLERİ (YAN YANA) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
                    
                    {/* SOL KOLON: İLAÇ / REÇETELER */}
                    <div>
                      <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, color: '#f59e0b', fontSize: '17px', marginBottom: '16px' }}>💊 Klasöre İlaç / Reçete Ekle</h3>
                        <form onSubmit={handleReceteEkle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label style={labelStyle}>İLAÇ ADI</label>
                            <input placeholder="Örn: Arveles 50mg" value={yeniRecete.ilac_adi} onChange={e => setYeniRecete({...yeniRecete, ilac_adi: e.target.value})} required style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>DOZ / KULLANIM</label>
                            <input placeholder="Örn: 2x1 Tok Karnına" value={yeniRecete.doz} onChange={e => setYeniRecete({...yeniRecete, doz: e.target.value})} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>REÇETE TARİHİ</label>
                            <input type="date" value={yeniRecete.tarih} onChange={e => setYeniRecete({...yeniRecete, tarih: e.target.value})} required style={inputStyle} />
                          </div>
                          <button type="submit" style={{ ...btnPrimaryStyle, backgroundColor: '#d97706', marginTop: '6px' }}>İlacı Kaydet</button>
                        </form>
                      </div>

                      <div style={cardStyle}>
                        <h4 style={{ marginTop: 0, color: '#f3f4f6', marginBottom: '16px' }}>Kayıtlı İlaç Geçmişi ({hastaReceteler.length})</h4>
                        {hastaReceteler.map(r => (
                          <div key={r.id} style={{ backgroundColor: '#090d16', padding: '14px', borderRadius: '12px', marginBottom: '10px', borderLeft: '4px solid #f59e0b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ display: 'block', color: '#ffffff', fontSize: '15px' }}>{r.ilac_adi}</strong>
                              <span style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', display: 'block' }}>
                                💊 Doz: {r.doz || '-'} &nbsp;|&nbsp; 📅 Tarih: <strong style={{ color: '#38bdf8' }}>{formatTarih(r.tarih)}</strong>
                              </span>
                            </div>
                            <button 
                              onClick={() => setConfirmModal({ id: r.id, title: r.ilac_adi, type: 'recete' })} 
                              style={deleteBtnStyle} 
                              title="İlacı Sil"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                        {hastaReceteler.length === 0 && <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', padding: '12px 0' }}>Henüz kaydedilmiş ilaç yok.</p>}
                      </div>
                    </div>

                    {/* SAĞ KOLON: RAPORLAR */}
                    <div>
                      <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, color: '#10b981', fontSize: '17px', marginBottom: '16px' }}>📄 Klasöre Rapor Ekle</h3>
                        <form onSubmit={handleRaporEkle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div>
                            <label style={labelStyle}>RAPOR ADI / TEŞHİS</label>
                            <input placeholder="Örn: Hipertansiyon Raporu" value={yeniRapor.rapor_adi} onChange={e => setYeniRapor({...yeniRapor, rapor_adi: e.target.value})} required style={inputStyle} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={labelStyle}>BAŞLANGIÇ TARİHİ</label>
                              <input type="date" value={yeniRapor.baslangic_tarihi} onChange={e => setYeniRapor({...yeniRapor, baslangic_tarihi: e.target.value})} style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>BİTİŞ TARİHİ</label>
                              <input type="date" value={yeniRapor.bitis_tarihi} onChange={e => setYeniRapor({...yeniRapor, bitis_tarihi: e.target.value})} style={inputStyle} />
                            </div>
                          </div>
                          <div>
                            <label style={labelStyle}>RAPOR NOTLARI</label>
                            <textarea placeholder="Ekstra notlar, açıklama..." value={yeniRapor.notlar} onChange={e => setYeniRapor({...yeniRapor, notlar: e.target.value})} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} />
                          </div>
                          <button type="submit" style={{ ...btnPrimaryStyle, backgroundColor: '#059669', marginTop: '6px' }}>Raporu Kaydet</button>
                        </form>
                      </div>

                      <div style={cardStyle}>
                        <h4 style={{ marginTop: 0, color: '#f3f4f6', marginBottom: '16px' }}>Kayıtlı Raporlar ({hastaRaporlar.length})</h4>
                        {hastaRaporlar.map(rap => (
                          <div key={rap.id} style={{ backgroundColor: '#090d16', padding: '14px', borderRadius: '12px', marginBottom: '10px', borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <strong style={{ display: 'block', color: '#ffffff', fontSize: '15px' }}>{rap.rapor_adi}</strong>
                              <span style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', display: 'block' }}>
                                📅 Geçerlilik: <strong style={{ color: '#38bdf8' }}>{formatTarih(rap.baslangic_tarihi)}</strong> ile <strong style={{ color: '#38bdf8' }}>{formatTarih(rap.bitis_tarihi)}</strong> arası
                              </span>
                              {rap.notlar && <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '6px 0 0 0', backgroundColor: '#111827', padding: '6px 10px', borderRadius: '6px' }}>📝 {rap.notlar}</p>}
                            </div>
                            <button 
                              onClick={() => setConfirmModal({ id: rap.id, title: rap.rapor_adi, type: 'rapor' })} 
                              style={{ ...deleteBtnStyle, marginLeft: '10px' }} 
                              title="Raporu Sil"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                        {hastaRaporlar.length === 0 && <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', padding: '12px 0' }}>Henüz kaydedilmiş rapor yok.</p>}
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

/* STİL TANIMLAMALARI */
const inputStyle = {
  width: '100%', padding: '12px 14px', backgroundColor: '#090d16',
  border: '1px solid #1f2937', borderRadius: '10px', color: '#ffffff', boxSizing: 'border-box', outline: 'none', fontSize: '14px'
};
const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: '700', color: '#9ca3af', marginBottom: '6px', letterSpacing: '0.5px'
};
const btnPrimaryStyle = {
  width: '100%', backgroundColor: '#059669', color: '#ffffff', border: 'none',
  padding: '12px 16px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'background-color 0.2s'
};
const navBtnStyle = {
  border: 'none', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: 'all 0.2s'
};
const cardStyle = {
  backgroundColor: '#111827', border: '1px solid #1f2937',
  borderRadius: '20px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
};
const deleteBtnStyle = {
  backgroundColor: '#374151', color: '#ffffff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0
};
