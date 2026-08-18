'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export default function Home() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [patients, setPatients] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [medName, setMedName] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchPatients();
    });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const { error: signUpErr } = await supabase.auth.signUp({ email, password });
      if (signUpErr) alert(signUpErr.message);
      else alert('Kayıt başarılı! Giriş yapabilirsiniz.');
    } else {
      window.location.reload();
    }
  };

  const fetchPatients = async () => {
    const { data } = await supabase.from('patients').select('*, prescriptions(*)');
    if (data) setPatients(data);
  };

  const addPatient = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('patients').insert([{ full_name: name, phone }]).select();
    if (!error && data) {
      setName(''); setPhone('');
      fetchPatients();
    }
  };

  const addPrescription = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return alert('Hasta seçiniz');
    const { error } = await supabase.from('prescriptions').insert([{
      patient_id: selectedPatient,
      medicine_name: medName,
      end_date: endDate
    }]);
    if (!error) {
      setMedName(''); setEndDate('');
      fetchPatients();
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-4 text-center text-blue-600">Eczane Takip Giriş</h1>
          <input type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded mb-3" required />
          <input type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded mb-4" required />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">Giriş Yap / Kayıt Ol</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">Eczane Hasta Takip Paneli</h1>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded">Çıkış</button>
        </div>

        <div className="grid md:grid-[#grid-cols-2] gap-6">
          {/* Hasta Ekle */}
          <form onSubmit={addPatient} className="bg-white p-4 rounded-xl shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-700">Yeni Hasta Ekle</h2>
            <input type="text" placeholder="Ad Soyad" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded" required />
            <input type="text" placeholder="Telefon (05xx...)" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 border rounded" />
            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-medium">Hasta Kaydet</button>
          </form>

          {/* İlaç/Reçete Ekle */}
          <form onSubmit={addPrescription} className="bg-white p-4 rounded-xl shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-700">Reçete / İlaç Ekle</h2>
            <select value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)} className="w-full p-2 border rounded" required>
              <option value="">Hasta Seçin</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <input type="text" placeholder="İlaç Adı" value={medName} onChange={e => setMedName(e.target.value)} className="w-full p-2 border rounded" required />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 border rounded" required />
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-medium">İlaç Takibi Ekle</button>
          </form>
        </div>

        {/* Hasta Listesi */}
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-700">Takipteki Hastalar</h2>
          {patients.map(p => (
            <div key={p.id} className="border-b pb-3 last:border-0">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">{p.full_name} ({p.phone || 'Tel Yok'})</span>
                {p.phone && (
                  <a href={`https://wa.me/90${p.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Merhaba ${p.full_name}, ilacınızın süresi dolmak üzeredir.`)}`} target="_blank" rel="noreferrer" className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">WhatsApp Hatırlat</a>
                )}
              </div>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                {p.prescriptions?.map(pr => (
                  <div key={pr.id} className="flex justify-between bg-gray-50 p-2 rounded">
                    <span>💊 {pr.medicine_name}</span>
                    <span className="font-medium text-amber-600">Bitiş: {pr.end_date}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
