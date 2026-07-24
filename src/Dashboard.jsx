import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, Target, ShoppingBag, Percent, Plus, Trash2, Trophy, ChevronDown, X, LogOut } from 'lucide-react';
import { supabase } from './supabaseClient.js';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ORIGENES = ['In/Out','Referido Empresario','Referido Partner','Interno - Base de Clientes Propia'];
const PROBABILIDADES = ['Baja','Media','Alta'];
const PROB_COLOR = { Baja: '#A32D2D', Media: '#854F0B', Alta: '#0F6E56' };
const PIE_COLORS = ['#0F6E56','#185FA5','#854F0B','#993556','#534AB7','#712B13','#3B6D11'];

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function monthLabel(key) {
  const [y,m] = key.split('-');
  return `${MESES[parseInt(m,10)-1]} ${y}`;
}
function fmtCOP(n) {
  return '$' + Math.round(n||0).toLocaleString('es-CO');
}

export default function Dashboard({ session, onLogout }) {
  const userId = session.user.id;
  const [ready, setReady] = useState(false);
  const [months, setMonths] = useState([currentMonthKey()]);
  const [month, setMonth] = useState(currentMonthKey());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [meta, setMeta] = useState(0);
  const [metaInput, setMetaInput] = useState('0');
  const [cotizaciones, setCotizaciones] = useState(0);
  const [ventas, setVentas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre:'', acv:'', origen: ORIGENES[0], probabilidad:'Media', fecha:'', seguimiento:'', factura:'', notas:'' });

  const loadMonthsList = useCallback(async () => {
    const { data } = await supabase.from('metas').select('mes').eq('user_id', userId).order('mes', { ascending: false });
    const keys = (data || []).map(r => r.mes);
    const cur = currentMonthKey();
    const all = keys.includes(cur) ? keys : [cur, ...keys];
    setMonths(all);
  }, [userId]);

  const ensureMonthRow = useCallback(async (k) => {
    await supabase.from('metas').upsert({ user_id: userId, mes: k, meta: 0, cotizaciones: 0 }, { onConflict: 'user_id,mes', ignoreDuplicates: true });
  }, [userId]);

  const loadMonth = useCallback(async (k) => {
    const { data: metaRow } = await supabase.from('metas').select('*').eq('user_id', userId).eq('mes', k).maybeSingle();
    if (metaRow) {
      setMeta(metaRow.meta || 0);
      setMetaInput(String(metaRow.meta || 0));
      setCotizaciones(metaRow.cotizaciones || 0);
    } else {
      setMeta(0); setMetaInput('0'); setCotizaciones(0);
    }
    const { data: ventasData } = await supabase.from('ventas').select('*').eq('user_id', userId).eq('mes', k).order('created_at', { ascending: false });
    setVentas(ventasData || []);
  }, [userId]);

  useEffect(() => {
    (async () => {
      await ensureMonthRow(currentMonthKey());
      await loadMonthsList();
      await loadMonth(currentMonthKey());
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) loadMonth(month);
  }, [month]);

  const saveMeta = async () => {
    const val = parseFloat(metaInput.replace(/[^0-9.]/g,'')) || 0;
    setMeta(val);
    setSaving(true);
    await supabase.from('metas').upsert({ user_id: userId, mes: month, meta: val, cotizaciones }, { onConflict: 'user_id,mes' });
    setSaving(false);
  };

  const saveCotizaciones = async (val) => {
    const num = parseInt(val,10) || 0;
    setCotizaciones(num);
    setSaving(true);
    await supabase.from('metas').upsert({ user_id: userId, mes: month, meta, cotizaciones: num }, { onConflict: 'user_id,mes' });
    setSaving(false);
  };

  const addVenta = async () => {
    if (!form.nombre.trim() || !form.acv) return;
    setSaving(true);
    const acvNum = parseFloat(form.acv.replace(/[^0-9.]/g,'')) || 0;
    const { data, error } = await supabase.from('ventas').insert({
      user_id: userId, mes: month, nombre: form.nombre, acv: acvNum, origen: form.origen,
      probabilidad: form.probabilidad, fecha: form.fecha || null, seguimiento: form.seguimiento,
      factura: form.factura, notas: form.notas,
    }).select();
    if (!error && data) setVentas(v => [data[0], ...v]);
    setSaving(false);
    setForm({ nombre:'', acv:'', origen: ORIGENES[0], probabilidad:'Media', fecha:'', seguimiento:'', factura:'', notas:'' });
    setShowForm(false);
  };

  const deleteVenta = async (id) => {
    setVentas(v => v.filter(x => x.id !== id));
    await supabase.from('ventas').delete().eq('id', id).eq('user_id', userId);
  };

  const createNewMonth = async () => {
    const [y,m] = month.split('-').map(Number);
    let ny = y, nm = m+1;
    if (nm > 12) { nm = 1; ny += 1; }
    const nextKey = `${ny}-${String(nm).padStart(2,'0')}`;
    await ensureMonthRow(nextKey);
    await loadMonthsList();
    setMonth(nextKey);
  };

  const vendido = useMemo(() => ventas.reduce((s,v) => s + (Number(v.acv)||0), 0), [ventas]);
  const nVentas = ventas.length;
  const cumplimiento = meta > 0 ? Math.round((vendido/meta)*100) : 0;
  const falta = Math.max(0, meta - vendido);
  const sobrecumplido = vendido > meta && meta > 0;
  const sobrecumplimientoPct = sobrecumplido ? Math.round(((vendido-meta)/meta)*100) : 0;
  const efectividad = cotizaciones > 0 ? Math.round((nVentas/cotizaciones)*100) : 0;

  const origenData = useMemo(() => {
    const map = {};
    ventas.forEach(v => { map[v.origen] = (map[v.origen]||0) + (Number(v.acv)||0); });
    return Object.entries(map).map(([name,value]) => ({ name, value }));
  }, [ventas]);

  const barData = [{ name: 'Este mes', vendido, meta }];

  if (!ready) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando panel...</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', margin:0 }}>{session.user.email}</p>
          <h1 style={{ fontSize:22, fontWeight:600, margin:'2px 0 0' }}>Control de ventas</h1>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowMonthPicker(s=>!s)} style={{ display:'flex', alignItems:'center', gap:6 }}>
              {monthLabel(month)} <ChevronDown size={16} />
            </button>
            {showMonthPicker && (
              <div style={{ position:'absolute', right:0, top:'110%', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, zIndex:10, minWidth:180, overflow:'hidden' }}>
                {months.map(m => (
                  <div key={m} onClick={() => { setMonth(m); setShowMonthPicker(false); }}
                    style={{ padding:'10px 14px', cursor:'pointer', fontSize:14, background: m===month ? 'var(--surface-1)' : 'transparent' }}>
                    {monthLabel(m)}
                  </div>
                ))}
                <div onClick={createNewMonth} style={{ padding:'10px 14px', cursor:'pointer', fontSize:14, borderTop:'1px solid var(--border)', color:'var(--accent)', display:'flex', alignItems:'center', gap:6 }}>
                  <Plus size={14} /> Crear mes siguiente
                </div>
              </div>
            )}
          </div>
          <button onClick={onLogout} aria-label="Cerrar sesión" style={{ display:'flex', alignItems:'center', gap:6 }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:12, marginBottom:'1.5rem' }}>
        <div style={{ background:'var(--surface-1)', borderRadius:10, padding:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <TrendingUp size={14} color="var(--text-secondary)" />
            <span style={{ fontSize:13, color:'var(--text-secondary)' }}>Vendido</span>
          </div>
          <p style={{ fontSize:22, fontWeight:600, margin:0 }}>{fmtCOP(vendido)}</p>
        </div>
        <div style={{ background:'var(--surface-1)', borderRadius:10, padding:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <Target size={14} color="var(--text-secondary)" />
            <span style={{ fontSize:13, color:'var(--text-secondary)' }}>Meta del mes</span>
          </div>
          <input value={metaInput} onChange={e=>setMetaInput(e.target.value)} onBlur={saveMeta}
            style={{ fontSize:22, fontWeight:600, border:'none', background:'transparent', padding:0, width:'100%' }} />
        </div>
        <div style={{ background:'var(--surface-1)', borderRadius:10, padding:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <ShoppingBag size={14} color="var(--text-secondary)" />
            <span style={{ fontSize:13, color:'var(--text-secondary)' }}>Ventas cerradas</span>
          </div>
          <p style={{ fontSize:22, fontWeight:600, margin:0 }}>{nVentas}</p>
        </div>
        <div style={{ background:'var(--surface-1)', borderRadius:10, padding:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <Percent size={14} color="var(--text-secondary)" />
            <span style={{ fontSize:13, color:'var(--text-secondary)' }}>Efectividad</span>
          </div>
          <p style={{ fontSize:22, fontWeight:600, margin:0 }}>{efectividad}%</p>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>Cotizaciones:</span>
            <input type="number" value={cotizaciones} onChange={e=>saveCotizaciones(e.target.value)}
              style={{ width:50, fontSize:12, padding:'2px 6px' }} />
          </div>
        </div>
      </div>

      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:14, color:'var(--text-secondary)' }}>Cumplimiento de la meta</span>
          <span style={{ fontSize:16, fontWeight:600, color: cumplimiento>=100 ? 'var(--success)' : 'var(--text-primary)' }}>{cumplimiento}%</span>
        </div>
        <div style={{ position:'relative', height:14, background:'var(--surface-1)', borderRadius:999, overflow:'hidden' }}>
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${Math.min(cumplimiento,100)}%`, background: cumplimiento>=100 ? '#1baf7a' : '#378ADD', borderRadius:999 }} />
        </div>
        {sobrecumplido ? (
          <div style={{ background:'var(--success-bg)', borderRadius:10, padding:'10px 1rem', display:'flex', alignItems:'center', gap:10, marginTop:10 }}>
            <Trophy size={16} color="#04342C" />
            <span style={{ fontSize:14, color:'#04342C' }}>Meta superada por {fmtCOP(vendido-meta)} — {sobrecumplimientoPct}% de sobrecumplimiento</span>
          </div>
        ) : (
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginTop:8 }}>Faltan {fmtCOP(falta)} para llegar a la meta</p>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: origenData.length ? '1fr 1fr' : '1fr', gap:16, marginBottom:'2rem' }}>
        <div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'0 0 8px' }}>Vendido vs meta</p>
          <div style={{ height:200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left:10, right:20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e1e0d9" />
                <XAxis type="number" tick={{ fontSize:11, fill:'#898781' }} tickFormatter={(v)=>'$'+(v/1000000).toFixed(1)+'M'} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:12, fill:'#52514e' }} width={70} />
                <Tooltip formatter={(v)=>fmtCOP(v)} />
                <Bar dataKey="vendido" fill="#1baf7a" radius={[0,4,4,0]} maxBarSize={30} name="Vendido" />
                <Bar dataKey="meta" fill="#c3c2b7" radius={[0,4,4,0]} maxBarSize={30} name="Meta" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {origenData.length > 0 && (
          <div>
            <p style={{ fontSize:13, color:'var(--text-secondary)', margin:'0 0 8px' }}>Ventas por origen</p>
            <div style={{ height:200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={origenData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                    {origenData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v)=>fmtCOP(v)} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem' }}>
        <p style={{ fontSize:16, fontWeight:600, margin:0 }}>Ventas del mes</p>
        <button onClick={() => setShowForm(s=>!s)} style={{ display:'flex', alignItems:'center', gap:6 }}>
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancelar' : 'Nueva venta'}
        </button>
      </div>

      {showForm && (
        <div style={{ background:'var(--surface-1)', borderRadius:10, padding:'1rem', marginBottom:'1rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <input placeholder="Nombre del cliente" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} />
          <input placeholder="ACV (valor de la venta)" value={form.acv} onChange={e=>setForm(f=>({...f,acv:e.target.value}))} />
          <select value={form.origen} onChange={e=>setForm(f=>({...f,origen:e.target.value}))}>
            {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={form.probabilidad} onChange={e=>setForm(f=>({...f,probabilidad:e.target.value}))}>
            {PROBABILIDADES.map(p => <option key={p} value={p}>Recompra: {p}</option>)}
          </select>
          <input type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} />
          <input placeholder="N° seguimiento comercial" value={form.seguimiento} onChange={e=>setForm(f=>({...f,seguimiento:e.target.value}))} />
          <input placeholder="N° factura comercial" value={form.factura} onChange={e=>setForm(f=>({...f,factura:e.target.value}))} />
          <input placeholder="Notas" value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} />
          <button onClick={addVenta} style={{ gridColumn:'1 / -1', background:'var(--accent-bg)', color:'var(--accent)', fontWeight:600 }}>Guardar venta</button>
        </div>
      )}

      {ventas.length === 0 ? (
        <p style={{ fontSize:14, color:'var(--text-muted)', textAlign:'center', padding:'2rem 0' }}>Aún no has registrado ventas este mes.</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {ventas.map(v => (
            <div key={v.id} style={{ background:'var(--surface-1)', borderRadius:10, padding:'0.75rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:14, fontWeight:600, margin:0 }}>{v.nombre}</p>
                <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'2px 0 0' }}>
                  {v.origen} · {v.fecha || 'sin fecha'} ·
                  <span style={{ color: PROB_COLOR[v.probabilidad] }}> recompra {v.probabilidad?.toLowerCase()}</span>
                </p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
                <span style={{ fontSize:15, fontWeight:600 }}>{fmtCOP(v.acv)}</span>
                <button onClick={() => deleteVenta(v.id)} aria-label="Eliminar venta" style={{ padding:6 }}>
                  <Trash2 size={14} color="var(--danger)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {saving && <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'right', marginTop:8 }}>Guardando...</p>}
    </div>
  );
}
