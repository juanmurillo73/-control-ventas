import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, Target, ShoppingBag, Percent, Plus, Trash2, Trophy, ChevronDown, X, LogOut, Pencil, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient.js';
import { getPagoYAcelerador, getAceleradorTabla, TABLA_ADICIONES, TABLA_UPGRADES } from './comisionTables.js';

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
  const [cotizacionesInput, setCotizacionesInput] = useState('0');
  const [adiciones, setAdiciones] = useState(0);
  const [adicionesInput, setAdicionesInput] = useState('0');
  const [upgrades, setUpgrades] = useState(0);
  const [upgradesInput, setUpgradesInput] = useState('0');
  const [comisionRecibida, setComisionRecibida] = useState(0);
  const [comisionRecibidaInput, setComisionRecibidaInput] = useState('0');
  const [ventas, setVentas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState('');
  const fileInputRef = React.useRef(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const flashOk = (msg) => { setOkMsg(msg); setErrorMsg(''); setTimeout(() => setOkMsg(''), 2000); };
  const [form, setForm] = useState({ nombre:'', acv:'', valorFacturado:'', origen: ORIGENES[0], probabilidad:'Media', fecha:'', seguimiento:'', factura:'', notas:'' });

  const loadMonthsList = useCallback(async () => {
    const { data } = await supabase.from('metas').select('mes').eq('user_id', userId).order('mes', { ascending: false });
    const keys = (data || []).map(r => r.mes);
    const cur = currentMonthKey();
    const all = keys.includes(cur) ? keys : [cur, ...keys];
    setMonths(all);
  }, [userId]);

  const ensureMonthRow = useCallback(async (k) => {
    const { error } = await supabase.from('metas').upsert({ user_id: userId, mes: k, meta: 0, cotizaciones: 0 }, { onConflict: 'user_id,mes', ignoreDuplicates: true });
    if (error) setErrorMsg(error.message);
  }, [userId]);

  const loadMonth = useCallback(async (k) => {
    const { data: metaRow, error: metaErr } = await supabase.from('metas').select('*').eq('user_id', userId).eq('mes', k).maybeSingle();
    if (metaErr) setErrorMsg(metaErr.message);
    if (metaRow) {
      setMeta(metaRow.meta || 0);
      setMetaInput(String(metaRow.meta || 0));
      setCotizaciones(metaRow.cotizaciones || 0);
      setCotizacionesInput(String(metaRow.cotizaciones || 0));
      setAdiciones(metaRow.adiciones_nomina || 0);
      setAdicionesInput(String(metaRow.adiciones_nomina || 0));
      setUpgrades(metaRow.upgrades || 0);
      setUpgradesInput(String(metaRow.upgrades || 0));
      setComisionRecibida(metaRow.comision_recibida || 0);
      setComisionRecibidaInput(String(metaRow.comision_recibida || 0));
    } else {
      setMeta(0); setMetaInput('0'); setCotizaciones(0); setCotizacionesInput('0');
      setAdiciones(0); setAdicionesInput('0'); setUpgrades(0); setUpgradesInput('0');
      setComisionRecibida(0); setComisionRecibidaInput('0');
    }
    const { data: ventasData, error: ventasErr } = await supabase.from('ventas').select('*').eq('user_id', userId).eq('mes', k).order('created_at', { ascending: false });
    if (ventasErr) setErrorMsg(ventasErr.message);
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
    const { error } = await supabase.from('metas').upsert({ user_id: userId, mes: month, meta: val, cotizaciones }, { onConflict: 'user_id,mes' });
    setSaving(false);
    if (error) setErrorMsg(error.message); else flashOk('Meta guardada');
  };

  const saveCotizaciones = async () => {
    const num = parseInt(cotizacionesInput,10) || 0;
    setCotizaciones(num);
    setCotizacionesInput(String(num));
    setSaving(true);
    const { error } = await supabase.from('metas').upsert({ user_id: userId, mes: month, meta, cotizaciones: num }, { onConflict: 'user_id,mes' });
    setSaving(false);
    if (error) setErrorMsg(error.message); else flashOk('Cotizaciones guardadas');
  };

  const saveComision = async () => {
    const adicionesNum = parseInt(adicionesInput,10) || 0;
    const upgradesNum = parseInt(upgradesInput,10) || 0;
    const comisionRecibidaNum = parseFloat(comisionRecibidaInput.replace(/[^0-9.]/g,'')) || 0;
    setAdiciones(adicionesNum); setAdicionesInput(String(adicionesNum));
    setUpgrades(upgradesNum); setUpgradesInput(String(upgradesNum));
    setComisionRecibida(comisionRecibidaNum); setComisionRecibidaInput(String(comisionRecibidaNum));
    setSaving(true);
    const { error } = await supabase.from('metas').upsert({
      user_id: userId, mes: month, meta, cotizaciones,
      adiciones_nomina: adicionesNum, upgrades: upgradesNum, comision_recibida: comisionRecibidaNum,
    }, { onConflict: 'user_id,mes' });
    setSaving(false);
    if (error) setErrorMsg(error.message); else flashOk('Datos de comisión guardados');
  };

  const TEMPLATE_HEADERS = ['Nombre','ACV','Valor Facturado','Origen','Probabilidad de Recompra','Fecha (AAAA-MM-DD)','N Seguimiento Comercial','N Factura Comercial','Notas'];

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      TEMPLATE_HEADERS,
      ['Empresa Ejemplo SAS', 1500000, 1785000, ORIGENES[0], 'Media', '2026-07-15', 'SEG-001', 'FAC-001', 'Ejemplo de nota'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

    const wsAyuda = XLSX.utils.aoa_to_sheet([
      ['Valores válidos para "Origen"'], ...ORIGENES.map(o => [o]),
      [''],
      ['Valores válidos para "Probabilidad de Recompra"'], ...PROBABILIDADES.map(p => [p]),
    ]);
    wsAyuda['!cols'] = [{ wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsAyuda, 'Valores válidos');

    XLSX.writeFile(wb, 'plantilla-ventas.xlsx');
  };

  const parseFechaCelda = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().slice(0,10);
    if (typeof val === 'number') {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(d) ? null : d.toISOString().slice(0,10);
    }
    const s = String(val).trim();
    return s || null;
  };

  const parseNumeroCelda = (val) => {
    if (typeof val === 'number') return val;
    return parseFloat(String(val || '').replace(/[^0-9.]/g,'')) || 0;
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportSummary('');
    setErrorMsg('');
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const paraInsertar = [];
      let omitidas = 0;
      for (const row of rows) {
        const nombre = String(row['Nombre'] || '').trim();
        const acvRaw = row['ACV'];
        if (!nombre || !acvRaw) { omitidas++; continue; }
        const origenVal = String(row['Origen'] || '').trim();
        const probVal = String(row['Probabilidad de Recompra'] || '').trim();
        paraInsertar.push({
          user_id: userId,
          mes: month,
          nombre,
          acv: parseNumeroCelda(acvRaw),
          valor_facturado: parseNumeroCelda(row['Valor Facturado']),
          origen: ORIGENES.includes(origenVal) ? origenVal : ORIGENES[0],
          probabilidad: PROBABILIDADES.includes(probVal) ? probVal : 'Media',
          fecha: parseFechaCelda(row['Fecha (AAAA-MM-DD)'] || row['Fecha']),
          seguimiento: String(row['N Seguimiento Comercial'] || ''),
          factura: String(row['N Factura Comercial'] || ''),
          notas: String(row['Notas'] || ''),
        });
      }

      if (paraInsertar.length === 0) {
        setErrorMsg('No se encontraron filas válidas en el archivo (revisa que tengan al menos Nombre y ACV).');
        setImporting(false);
        e.target.value = '';
        return;
      }

      const { data, error } = await supabase.from('ventas').insert(paraInsertar).select();
      if (error) { setErrorMsg(error.message); setImporting(false); e.target.value = ''; return; }
      setVentas(v => [...(data || []), ...v]);
      setImportSummary(`Se importaron ${data.length} ventas${omitidas ? ` (se omitieron ${omitidas} filas sin Nombre o ACV)` : ''}.`);
      flashOk(`${data.length} ventas importadas`);
    } catch (err) {
      setErrorMsg('No se pudo leer el archivo. Verifica que sea un .xlsx válido basado en la plantilla.');
    }
    setImporting(false);
    e.target.value = '';
  };

  const addVenta = async () => {
    if (!form.nombre.trim() || !form.acv) return;
    setSaving(true);
    const acvNum = parseFloat(form.acv.replace(/[^0-9.]/g,'')) || 0;
    const facturadoNum = parseFloat(String(form.valorFacturado).replace(/[^0-9.]/g,'')) || 0;
    const { data, error } = await supabase.from('ventas').insert({
      user_id: userId, mes: month, nombre: form.nombre, acv: acvNum, valor_facturado: facturadoNum, origen: form.origen,
      probabilidad: form.probabilidad, fecha: form.fecha || null, seguimiento: form.seguimiento,
      factura: form.factura, notas: form.notas,
    }).select();
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    if (data) setVentas(v => [data[0], ...v]);
    flashOk('Venta guardada');
    setForm({ nombre:'', acv:'', valorFacturado:'', origen: ORIGENES[0], probabilidad:'Media', fecha:'', seguimiento:'', factura:'', notas:'' });
    setShowForm(false);
  };

  const openVenta = (v) => {
    setSelectedVenta(v);
    setEditForm({
      nombre: v.nombre || '', acv: String(v.acv || ''), valorFacturado: String(v.valor_facturado || ''), origen: v.origen || ORIGENES[0],
      probabilidad: v.probabilidad || 'Media', fecha: v.fecha || '',
      seguimiento: v.seguimiento || '', factura: v.factura || '', notas: v.notas || '',
    });
  };

  const closeVenta = () => { setSelectedVenta(null); setEditForm(null); };

  const saveEditVenta = async () => {
    if (!selectedVenta || !editForm) return;
    setSaving(true);
    const acvNum = parseFloat(String(editForm.acv).replace(/[^0-9.]/g,'')) || 0;
    const facturadoNum = parseFloat(String(editForm.valorFacturado).replace(/[^0-9.]/g,'')) || 0;
    const { data, error } = await supabase.from('ventas').update({
      nombre: editForm.nombre, acv: acvNum, valor_facturado: facturadoNum, origen: editForm.origen, probabilidad: editForm.probabilidad,
      fecha: editForm.fecha || null, seguimiento: editForm.seguimiento, factura: editForm.factura, notas: editForm.notas,
    }).eq('id', selectedVenta.id).eq('user_id', userId).select();
    setSaving(false);
    if (error) { setErrorMsg(error.message); return; }
    if (data && data[0]) setVentas(vs => vs.map(x => x.id === selectedVenta.id ? data[0] : x));
    flashOk('Venta actualizada');
    closeVenta();
  };

  const deleteFromModal = async () => {
    if (!selectedVenta) return;
    await deleteVenta(selectedVenta.id);
    closeVenta();
  };

  const deleteVenta = async (id) => {
    setVentas(v => v.filter(x => x.id !== id));
    await supabase.from('ventas').delete().eq('id', id).eq('user_id', userId);
  };

  const createNewMonth = async () => {
    setErrorMsg('');
    const [y,m] = month.split('-').map(Number);
    let ny = y, nm = m+1;
    if (nm > 12) { nm = 1; ny += 1; }
    const nextKey = `${ny}-${String(nm).padStart(2,'0')}`;
    await ensureMonthRow(nextKey);
    await loadMonthsList();
    setMonth(nextKey);
    flashOk(`${monthLabel(nextKey)} creado`);
  };

  const vendido = useMemo(() => ventas.reduce((s,v) => s + (Number(v.acv)||0), 0), [ventas]);
  const totalFacturado = useMemo(() => ventas.reduce((s,v) => s + (Number(v.valor_facturado)||0), 0), [ventas]);
  const nVentas = ventas.length;
  const cumplimiento = meta > 0 ? Math.round((vendido/meta)*100) : 0;
  const falta = Math.max(0, meta - vendido);
  const sobrecumplido = vendido > meta && meta > 0;
  const sobrecumplimientoPct = sobrecumplido ? Math.round(((vendido-meta)/meta)*100) : 0;
  const efectividad = cotizaciones > 0 ? Math.round((nVentas/cotizaciones)*100) : 0;

  const { pago: pagoPct, acelerador: acelSobrecumpPct } = useMemo(() => getPagoYAcelerador(cumplimiento), [cumplimiento]);
  const acelAdicionesPct = useMemo(() => getAceleradorTabla(TABLA_ADICIONES, adiciones, cumplimiento), [adiciones, cumplimiento]);
  const acelUpgradesPct = useMemo(() => getAceleradorTabla(TABLA_UPGRADES, upgrades, cumplimiento), [upgrades, cumplimiento]);
  const comisionBase = vendido * (pagoPct/100);
  const bonoSobrecump = comisionBase * (acelSobrecumpPct/100);
  const bonoAdiciones = comisionBase * (acelAdicionesPct/100);
  const bonoUpgrades = comisionBase * (acelUpgradesPct/100);
  const comisionTotalCalculada = comisionBase + bonoSobrecump + bonoAdiciones + bonoUpgrades;
  const diffComision = comisionRecibida - comisionTotalCalculada;

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
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input value={metaInput} onChange={e=>setMetaInput(e.target.value)}
              style={{ fontSize:22, fontWeight:600, border:'none', background:'transparent', padding:0, width:'100%' }} />
            <button onClick={saveMeta} style={{ fontSize:11, padding:'4px 8px', flexShrink:0 }}>Guardar</button>
          </div>
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
          <p style={{ fontSize:10, color:'var(--text-muted)', margin:'2px 0 6px' }}>{nVentas} ventas ÷ {cotizaciones} cotizaciones</p>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>Cotizaciones:</span>
            <input type="number" value={cotizacionesInput} onChange={e=>setCotizacionesInput(e.target.value)}
              style={{ width:50, fontSize:12, padding:'2px 6px' }} />
            <button onClick={saveCotizaciones} style={{ fontSize:11, padding:'4px 8px' }}>Guardar</button>
          </div>
        </div>
      </div>

      {(errorMsg || okMsg) && (
        <div style={{
          background: errorMsg ? '#FBE4E1' : 'var(--success-bg)',
          color: errorMsg ? 'var(--danger)' : 'var(--success)',
          borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: '1rem'
        }}>
          {errorMsg || okMsg}
        </div>
      )}

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

      <div style={{ background:'var(--surface-1)', borderRadius:10, padding:'0.85rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <span style={{ fontSize:13, color:'var(--text-secondary)' }}>Valor facturado (informativo, no afecta la meta)</span>
        <span style={{ fontSize:17, fontWeight:600 }}>{fmtCOP(totalFacturado)}</span>
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

      <div style={{ marginBottom:'2rem' }}>
        <p style={{ fontSize:16, fontWeight:600, margin:'0 0 0.75rem' }}>💰 Comisión estimada del mes</p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:12 }}>
          <label style={{ fontSize:12, color:'var(--text-secondary)' }}>
            Adiciones de Nómina
            <input type="number" value={adicionesInput} onChange={e=>setAdicionesInput(e.target.value)} style={{ width:'100%', marginTop:4 }} />
          </label>
          <label style={{ fontSize:12, color:'var(--text-secondary)' }}>
            Upgrades
            <input type="number" value={upgradesInput} onChange={e=>setUpgradesInput(e.target.value)} style={{ width:'100%', marginTop:4 }} />
          </label>
          <label style={{ fontSize:12, color:'var(--text-secondary)' }}>
            Comisión recibida (real)
            <input value={comisionRecibidaInput} onChange={e=>setComisionRecibidaInput(e.target.value)} style={{ width:'100%', marginTop:4 }} />
          </label>
          <button onClick={saveComision} style={{ alignSelf:'end', background:'var(--accent-bg)', color:'var(--accent)', fontWeight:600 }}>Guardar</button>
        </div>

        <div style={{ background:'var(--surface-1)', borderRadius:10, padding:'1rem', display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
            <span style={{ color:'var(--text-secondary)' }}>Comisión base ({pagoPct}% de {fmtCOP(vendido)})</span>
            <span>{fmtCOP(comisionBase)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
            <span style={{ color:'var(--text-secondary)' }}>+ Acelerador sobrecumplimiento ({acelSobrecumpPct}%)</span>
            <span>{fmtCOP(bonoSobrecump)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
            <span style={{ color:'var(--text-secondary)' }}>+ Acelerador adiciones de nómina ({acelAdicionesPct}%)</span>
            <span>{fmtCOP(bonoAdiciones)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
            <span style={{ color:'var(--text-secondary)' }}>+ Acelerador upgrades ({acelUpgradesPct}%)</span>
            <span>{fmtCOP(bonoUpgrades)}</span>
          </div>
          <div style={{ height:1, background:'var(--border)', margin:'4px 0' }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:600 }}>
            <span>Comisión total calculada</span>
            <span>{fmtCOP(comisionTotalCalculada)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginTop:6 }}>
            <span style={{ color:'var(--text-secondary)' }}>Comisión recibida (real)</span>
            <span>{fmtCOP(comisionRecibida)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, fontWeight:600, color: diffComision === 0 ? 'var(--text-secondary)' : (diffComision > 0 ? 'var(--success)' : 'var(--danger)') }}>
            <span>Diferencia</span>
            <span>{diffComision >= 0 ? '+' : ''}{fmtCOP(diffComision)}</span>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem', flexWrap:'wrap', gap:8 }}>
        <p style={{ fontSize:16, fontWeight:600, margin:0 }}>Ventas del mes</p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={downloadTemplate} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Download size={14} /> Plantilla Excel
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={importing} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <Upload size={14} /> {importing ? 'Importando...' : 'Importar Excel'}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportFile} style={{ display:'none' }} />
          <button onClick={() => setShowForm(s=>!s)} style={{ display:'flex', alignItems:'center', gap:6 }}>
            {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancelar' : 'Nueva venta'}
          </button>
        </div>
      </div>

      {importSummary && (
        <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:-6, marginBottom:10 }}>{importSummary}</p>
      )}

      {showForm && (
        <div style={{ background:'var(--surface-1)', borderRadius:10, padding:'1rem', marginBottom:'1rem', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <input placeholder="Nombre del cliente" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} />
          <input placeholder="ACV (valor de la venta)" value={form.acv} onChange={e=>setForm(f=>({...f,acv:e.target.value}))} />
          <input placeholder="Valor facturado (informativo)" value={form.valorFacturado} onChange={e=>setForm(f=>({...f,valorFacturado:e.target.value}))} />
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
            <div key={v.id} onClick={() => openVenta(v)} style={{ cursor:'pointer', background:'var(--surface-1)', borderRadius:10, padding:'0.75rem 1rem', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:14, fontWeight:600, margin:0 }}>{v.nombre}</p>
                <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'2px 0 0' }}>
                  {v.origen} · {v.fecha || 'sin fecha'} ·
                  <span style={{ color: PROB_COLOR[v.probabilidad] }}> recompra {v.probabilidad?.toLowerCase()}</span>
                </p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
                <span style={{ fontSize:15, fontWeight:600 }}>{fmtCOP(v.acv)}</span>
                <Pencil size={14} color="var(--text-muted)" />
                <button onClick={(e) => { e.stopPropagation(); deleteVenta(v.id); }} aria-label="Eliminar venta" style={{ padding:6 }}>
                  <Trash2 size={14} color="var(--danger)" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVenta && editForm && (
        <div onClick={closeVenta} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', zIndex:100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background:'var(--surface-2)', borderRadius:12, padding:'1.5rem', maxWidth:480, width:'100%', maxHeight:'85vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <p style={{ fontSize:17, fontWeight:600, margin:0 }}>Detalle de la venta</p>
              <button onClick={closeVenta} aria-label="Cerrar" style={{ padding:6 }}><X size={16} /></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <label style={{ gridColumn:'1 / -1', fontSize:12, color:'var(--text-secondary)' }}>
                Nombre del cliente
                <input value={editForm.nombre} onChange={e=>setEditForm(f=>({...f,nombre:e.target.value}))} style={{ width:'100%', marginTop:4 }} />
              </label>
              <label style={{ fontSize:12, color:'var(--text-secondary)' }}>
                ACV
                <input value={editForm.acv} onChange={e=>setEditForm(f=>({...f,acv:e.target.value}))} style={{ width:'100%', marginTop:4 }} />
              </label>
              <label style={{ fontSize:12, color:'var(--text-secondary)' }}>
                Valor facturado (informativo)
                <input value={editForm.valorFacturado} onChange={e=>setEditForm(f=>({...f,valorFacturado:e.target.value}))} style={{ width:'100%', marginTop:4 }} />
              </label>
              <label style={{ fontSize:12, color:'var(--text-secondary)' }}>
                Fecha
                <input type="date" value={editForm.fecha} onChange={e=>setEditForm(f=>({...f,fecha:e.target.value}))} style={{ width:'100%', marginTop:4 }} />
              </label>
              <label style={{ fontSize:12, color:'var(--text-secondary)' }}>
                Origen
                <select value={editForm.origen} onChange={e=>setEditForm(f=>({...f,origen:e.target.value}))} style={{ width:'100%', marginTop:4 }}>
                  {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label style={{ fontSize:12, color:'var(--text-secondary)' }}>
                Probabilidad de recompra
                <select value={editForm.probabilidad} onChange={e=>setEditForm(f=>({...f,probabilidad:e.target.value}))} style={{ width:'100%', marginTop:4 }}>
                  {PROBABILIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <label style={{ fontSize:12, color:'var(--text-secondary)' }}>
                N° seguimiento comercial
                <input value={editForm.seguimiento} onChange={e=>setEditForm(f=>({...f,seguimiento:e.target.value}))} style={{ width:'100%', marginTop:4 }} />
              </label>
              <label style={{ fontSize:12, color:'var(--text-secondary)' }}>
                N° factura comercial
                <input value={editForm.factura} onChange={e=>setEditForm(f=>({...f,factura:e.target.value}))} style={{ width:'100%', marginTop:4 }} />
              </label>
              <label style={{ gridColumn:'1 / -1', fontSize:12, color:'var(--text-secondary)' }}>
                Notas
                <textarea value={editForm.notas} onChange={e=>setEditForm(f=>({...f,notas:e.target.value}))} rows={3} style={{ width:'100%', marginTop:4, fontFamily:'inherit', fontSize:14, padding:8, borderRadius:8, border:'1px solid var(--border)' }} />
              </label>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'1.25rem' }}>
              <button onClick={deleteFromModal} style={{ color:'var(--danger)', display:'flex', alignItems:'center', gap:6 }}>
                <Trash2 size={14} /> Eliminar
              </button>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={closeVenta}>Cancelar</button>
                <button onClick={saveEditVenta} style={{ background:'var(--accent-bg)', color:'var(--accent)', fontWeight:600 }}>Guardar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {saving && <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'right', marginTop:8 }}>Guardando...</p>}
    </div>
  );
}
