// src/pages/index.js
import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSession, signIn, signOut } from 'next-auth/react';

// 20 types → colors
const colorPalette = {
  'New Currency': '#e6194b',
  Redenomination: '#3cb44b',
  Decimalization: '#ffe119',
  Devaluation: '#4363d8',
  Revaluation: '#f58231',
  'Join Euro': '#911eb4',
  'Leave Euro': '#46f0f0',
  Dollarization: '#f032e6',
  'De-Dollarization': '#bcf60c',
  'Peg Change': '#fabebe',
  'Currency Board': '#008080',
  'Monetary Union': '#e6beff',
  'Exit Union': '#9a6324',
  'Gold Standard': '#fffac8',
  'Abandon Gold': '#800000',
  'Banknotes Redesign': '#aaffc3',
  'Exchange Regime Change': '#808000',
  Cryptocurrency: '#ffd8b1',
  'Institution Reform': '#000075',
  Other: '#808080'
};

// Only require mapbox-gl in the browser
const mapboxgl = typeof window !== 'undefined' ? require('mapbox-gl') : null;

function Home() {
  const { data: session } = useSession();
  const mapRef = useRef(null);
  const mapContainer = useRef(null);

  const [year, setYear] = useState(2025);
  const [countryCode, setCountryCode] = useState('');
  const [countryList, setCountryList] = useState([]);
  const [eventsMap, setEventsMap] = useState({});
  const [form, setForm] = useState({ type: '', title: '', desc: '', file: null });

  // 1. fetch country list
  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca3')
      .then(r => r.json())
      .then(data => {
        const list = data
          .map(c => ({ name: c.name.common, code: c.cca3 }))
          .sort((a,b) => a.name.localeCompare(b.name));
        setCountryList(list);
      });
  }, []);

  // 2. fetch events for this year
  useEffect(() => {
    fetch(`/api/get-events?year=${year}`)
      .then(r => r.json())
      .then(events => {
        const m = {};
        events.forEach(e => { m[e.countryCode] = e.type; });
        setEventsMap(m);
      })
      .catch(console.error);
  }, [year]);

  // build Mapbox data-driven fill-color
  const buildColorExpr = () => {
    const expr = ['match', ['get', 'iso_3166_1_alpha_3']];
    Object.entries(eventsMap).forEach(([code, type]) => {
      expr.push(code, colorPalette[type] || '#627BC1');
    });
    expr.push('#627BC1');
    return expr;
  };

  // 3. init map
  useEffect(() => {
    if (!mapboxgl) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [0,20], zoom:1.5
    });
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('countries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1'
      });
      map.addLayer({
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': buildColorExpr(),
          'fill-opacity': 0.7
        }
      });
      map.addLayer({
        id: 'countries-line',
        type: 'line',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: { 'line-color':'#fff','line-width':0.5 }
      });
      map.on('click','countries-fill',e=>{
        setCountryCode(e.features[0].properties.iso_3166_1_alpha_3);
      });
      map.on('mouseenter','countries-fill',()=>map.getCanvas().style.cursor='pointer');
      map.on('mouseleave','countries-fill',()=>map.getCanvas().style.cursor='');
    });
    return ()=>map.remove();
  }, []);

  // re-apply colors when eventsMap changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setPaintProperty('countries-fill','fill-color', buildColorExpr());
  }, [eventsMap]);

  // save event
  const handleSave = async () => {
    if (!form.type) return alert('请选择类型再保存');
    let fileUrl = '';
    if (form.file) {
      const r = await fetch(`/api/upload?filename=${encodeURIComponent(form.file.name)}`,{method:'POST',body:form.file});
      fileUrl = (await r.json()).url;
    }
    const resp = await fetch('/api/save-event',{method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({countryCode,year,...form,fileUrl})
    });
    if (!resp.ok){
      const err=await resp.json();
      return alert('保存失败：'+(err.error||resp.statusText));
    }
    alert('保存成功');
    setEventsMap(prev=>({ ...prev, [countryCode]:form.type }));
    setForm({type:'',title:'',desc:'',file:null});
    setCountryCode('');
  };

  const selectedCountry = countryList.find(c=>c.code===countryCode);

  return (
    <div>
      <div ref={mapContainer} id="map"/>
      <div className="selector">
        <label>
          国家列表：
          <select value={countryCode} onChange={e=>setCountryCode(e.target.value)}>
            <option value="">—— 请选择 ——</option>
            {countryList.map(c=>(
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="map-overlay">
        年份：{year}
        <input type="range" min={-2000} max={2025} step={10}
          value={year} onChange={e=>setYear(+e.target.value)} />
      </div>
      <div className="auth">
        {session?.user
          ? <>已登录：{session.user.email} <button onClick={()=>signOut()}>登出</button></>
          : <button onClick={()=>signIn()}>管理员登录</button>}
      </div>
      {countryCode && (
        <div className="panel">
          <h3>{selectedCountry?.name||countryCode} — {year}</h3>
          {session?.user ? (
            <>
              <label>
                类型：
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  <option value="">请选择</option>
                  {Object.keys(colorPalette).map(t=>(
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                标题：
                <input type="text" value={form.title}
                  onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
              </label>
              <label>
                描述：
                <textarea rows={3} value={form.desc}
                  onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/>
              </label>
              <label>
                文件：
                <input type="file" accept=".png,.doc,.docx"
                  onChange={e=>setForm(f=>({...f,file:e.target.files[0]}))}/>
              </label>
              <button onClick={handleSave}>保存</button>
            </>
          ) : <p>请管理员登录后再编辑。</p>}
          <button onClick={()=>setCountryCode('')}>关闭</button>
        </div>
      )}
    </div>
  );
}

// disable SSR for this page
export default dynamic(() => Promise.resolve(Home), { ssr: false });

// 禁用 SSR，只在客户端渲染
export default dynamic(() => Promise.resolve(Home), { ssr: false });

