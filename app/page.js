'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sayfa / Sekme Durumları
  const [activeTab, setActiveTab] = useState('hastalar'); // 'hastalar' veya 'admin'
  const [usersList, setUsersList] = useState([]);
  const [hastalar, setHastalar] = useState([]);

  // Türkçe karakter ve boşluk temizleme
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

  // 1. GİRİŞ YAP & KAYIT OL
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const cleanEmail = getInternalEmail(username);

      // Oturum Açmayı Dene
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      // Hesap Yoksa Kayıt Yap
      if (authError && authError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: { display_name: username }
          }
        });

        if (signUpError) throw signUpError;
        authData = signUpData;
      } else if (authError) {
        throw authError;
      }

      const user = authData?.user;

      if (user) {
        // Kurucu Admin Kontrolü
        const isKurucu = cleanEmail.startsWith('omerfarukeker');

        if (isKurucu) {
          // Kurucu Admin'i veritabanında otomatik onaylı yap
          await supabase
            .from('user_approvals')
            .upsert({ user_id: user.id, is_approved: true });

          setCurrentUser(user);
          setIsLoggedIn(true);
        } else {
          // Normal Kullanıcı Onay Sorgusu
          const { data: approvalData } = await supabase
            .from('user_approvals')
            .select('is_approved')
            .eq('user_id', user.id)
            .maybeSingle();

          if (approvalData && approvalData.is_approved) {
            setCurrentUser(user);
            setIsLoggedIn(true);
          } else {
            await supabase.auth.signOut();
            alert('Hesabınız admin onayı bekliyor! Lütfen yöneticinizle iletişime geçin.');
          }
        }
      }
    } catch (err) {
      console.error('Giriş Hatası:', err);
      setErrorMessage(err.message || 'Giriş yapılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // 2. VERİLERİ YÜKLE (Giriş Yapılınca)
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      fetchAdminData();
    }
  }, [isLoggedIn, currentUser]);

  const fetchAdminData = async () => {
    // Admin Paneli İçin Kullanıcı Listesi Çek
    const { data: approvals } = await supabase.from('user_approvals').select('*');
    // Hastalar Listesini Çek
    const { data: hastalarData } = await supabase.from('hastalar').select('*');

    setHastalar(hastalarData || []);
    setUsersList(approvals || []);
  };

  // 3. ADMIN ONAY DEĞİŞTİRME
  const handleToggleApproval = async (targetUserId, currentStatus) => {
    try {
      const { error } = await supabase.rpc('admin_toggle_user_approval', {
        target_user_id: targetUserId,
        new_status: !currentStatus
      });

      if (error) {
        // RPC yoksa doğrudan tabloya yaz
        await supabase
          .from('user_approvals')
          .upsert({ user_id: targetUserId, is_approved: !currentStatus });
      }

      fetchAdminData();
    } catch (err) {
      alert('Onay değiştirilirken hata oluştu: ' + err.message);
    }
  };

  // 4. ÇIKIŞ YAP
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#fff', fontFamily: 'sans-serif' }}>
      {!isLoggedIn ? (
        // --- GİRİŞ EKRANI ---
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <form onSubmit={handleLogin} style={{ backgroundColor: '#131b2e', padding: '2.5rem', borderRadius: '16px', width: '360px', display: 'flex', flexDirection: 'column', gap: '1.2rem', border: '1px solid #1e293b' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💊</div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Eczane Takip</h2>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Yönetici: Ömer Faruk EKER</span>
            </div>

            {errorMessage && (
              <div style={{ backgroundColor: '#450a0a', border: '1px solid #991b1b', color: '#fca5a5', padding: '0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                {errorMessage}
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>KULLANICI ADI</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Kullanıcı adınız"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', marginTop: '0.3rem', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>PAROLA</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="******"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff', marginTop: '0.3rem', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#10b981', color: '#fff', padding: '0.85rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap / Kayıt Ol ➔'}
            </button>
          </form>
        </div>
      ) : (
        // --- ANA PANEL & ADMIN PANELİ ---
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          {/* Üst Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#131b2e', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid #1e293b', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📁</span>
              <div>
                <h3 style={{ margin: 0 }}>Eczane Takip Sistemi</h3>
                <span style={{ fontSize: '0.8rem', color: '#10b981' }}>👤 {username} (Admin)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setActiveTab('hastalar')}
                style={{ backgroundColor: activeTab === 'hastalar' ? '#3b82f6' : '#1e293b', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                📁 Hastalarım
              </button>
              <button 
                onClick={() => setActiveTab('admin')}
                style={{ backgroundColor: activeTab === 'admin' ? '#ef4444' : '#1e293b', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                👑 Admin Paneli
              </button>
              <button 
                onClick={handleLogout}
                style={{ backgroundColor: '#334155', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}
              >
                Çıkış
              </button>
            </div>
          </div>

          {/* İÇERİK SEKMELERİ */}
          {activeTab === 'hastalar' ? (
            <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '12px', border: '1px solid #1e293b' }}>
              <h3>Hastalarım ({hastalar.length})</h3>
              <p style={{ color: '#94a3b8' }}>Kayıtlı hastalarınız burada listelenir.</p>
              {/* Hastalar Listesi Tablosu */}
            </div>
          ) : (
            // ADMIN PANELİ SEKMESİ
            <div style={{ backgroundColor: '#131b2e', padding: '1.5rem', borderRadius: '12px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#f87171' }}>👑 Admin Yönetim Paneli</h3>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Kullanıcıların siteye girişini onaylayın, oturumlarını kapatın veya silin</span>
                </div>
                <button onClick={fetchAdminData} style={{ backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
                  🔄 Verileri Yenile
                </button>
              </div>

              {/* Kullanıcı Yönetim Tablosu */}
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem' }}>Kullanıcı ID</th>
                    <th style={{ padding: '0.75rem' }}>Admin Onayı</th>
                    <th style={{ padding: '0.75rem' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.user_id} style={{ borderBottom: '1px solid #0f172a' }}>
                      <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{u.user_id}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ backgroundColor: u.is_approved ? '#065f46' : '#854d0e', color: u.is_approved ? '#34d399' : '#fde047', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          {u.is_approved ? '✓ Giriş İzinli' : '⏳ Onay Bekliyor'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <button
                          onClick={() => handleToggleApproval(u.user_id, u.is_approved)}
                          style={{ backgroundColor: u.is_approved ? '#991b1b' : '#047857', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                        >
                          {u.is_approved ? 'İzni Kaldır' : 'Girişe İzin Ver'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
