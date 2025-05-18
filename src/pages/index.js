// src/pages/index.js

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useSession, signIn, signOut } from 'next-auth/react';

// 20 种类型与颜色映射
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

// 仅客户端加载 mapbox-gl
const mapboxgl = typeof window !== 'undefined' ? require('mapbox-gl') : null;

function Home() {
  const { data: session } = useSession();
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  const [year, setYear] = useState(2025);
  const [countryCode, setCountryCode] = useState('');
  const [countryList, setCountryList] = useState([]);
  const [eventsMap, setEventsMap] = useState({});
  const [form, setForm] = useState({
    type: '',
    title: '',
    desc: '',
    file: null
  });

  // 1. 拉取国家列表
  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca3')
      .then(r => r.json())
      .then(data => {
        const list = data
          .map(c => ({ name: c.name.common, code: c.cca3 }))
          .sort((a,b) => a.name.localeCompare(b.name));
        setCountryList(list);
      })
      .catch(console.error);
  }, []);

  // 2. 每次年份变更，重新拉所有事件不上前端
  useEffect(() => {
    fetch(`/api/get-events?year=${year}`, { credentials: 'include' })
      .then(r => r.json())
      .then(events => {
        const m = {};
        events.forEach(e => { m[e.countryCode] = { type: e.type, title: e.title, desc: e.desc, fileUrl: e.fileUrl }});
        setEventsMap(m);
      })
      .catch(console.error);
  }, [year]);

  // 3. 地图初始化
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
      map.addSource('countries',{type:'vector',url:'mapbox://mapbox.country-boundaries-v1'});
      map.addLayer({
        id:'countries-fill', type:'fill', source:'countries','source-layer':'country_boundaries',
        paint:{'fill-color': ['match', ['get','iso_3166_1_alpha_3'], ...Object.entries(eventsMap).flat(), '#627BC1'], 'fill-opacity':0.7}
      });
      map.addLayer({
        id:'countries-line', type:'line', source:'countries','source-layer':'country_boundaries',
        paint:{'line-color':'#fff','line-width':0.5}
      });
      map.on('click','countries-fill', e => {
        setCountryCode(e.features[0].properties.iso_3166_1_alpha_3);
      });
      map.on('mouseenter','countries-fill',()=>map.getCanvas().style.cursor='pointer');
      map.on('mouseleave','countries-fill',()=>map.getCanvas().style.cursor='');
    });
    return ()=>map.remove();
  }, []);

  // 4. 每次 eventsMap 变更，更新着色表达式
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const expr = ['match', ['get','iso_3166_1_alpha_3']];
    Object.entries(eventsMap).forEach(([code, ev]) => expr.push(code, colorPalette[ev.type]));
    expr.push('#627BC1');
    map.setPaintProperty('countries-fill','fill-color',expr);
  }, [eventsMap]);

  // 5. 当打开面板(countryCode, year)时，填充已有记录
  useEffect(() => {
    if (!countryCode) return;
    const ev = eventsMap[countryCode];
    if (ev) {
      setForm({ type: ev.type, title: ev.title, desc: ev.desc, file: null });
    } else {
      setForm({ type:'', title:'', desc:'', file:null });
    }
  }, [countryCode, eventsMap]);

  // 保存事件
  const handleSave = async () => {
    if (!form.type) { alert('请选择类型'); return; }
    let fileUrl = eventsMap[countryCode]?.fileUrl||'';
    if (form.file) {
      const r = await fetch(
        `/api/upload?filename=${encodeURIComponent(form.file.name)}`,{method:'POST',body:form.file}
      );
      fileUrl = (await r.json()).url;
    }
    const resp = await fetch('/api/save-event',{
      method:'POST',credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        countryCode,year,
        type: form.type,
        title: form.title,
        desc: form.desc,
        fileUrl
      })
    });
    if (!resp.ok) { alert('保存失败'); return; }
    alert('保存成功');
    // 本地更新
    setEventsMap(prev=>({
      ...prev,
      [countryCode]:{type:form.type,title:form.title,desc:form.desc,fileUrl}
    }));
  };

  const selectedName = countryList.find(c=>c.code===countryCode)?.name||countryCode;

  return (
    <div>
      <div ref={mapContainer} id="map" />
      <div className="selector">
        <label>国家列表：
          <select value={countryCode} onChange={e=>setCountryCode(e.target.value)}>
            <option value="">—— 请选择 ——</option>
            {countryList.map(c=>(
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="map-overlay">
        年份：{year<0?`前${-year}`:year}
        <input type="range" min={-2000} max={2025} step={10}
          value={year} onChange={e=>setYear(+e.target.value)} />
      </div>
      <div className="auth">
        {session?.user
          ? <>已登录：{session.user.email}<button onClick={()=>signOut()}>登出</button></>
          : <button onClick={()=>signIn()}>管理员登录</button>}
      </div>
      {countryCode && (
        <div className="panel">
          <h3>{selectedName} — {year<0?`前${-year}`:year}</h3>
          {session?.user ? (
            <>
              <label>类型：
                <select value={form.type}
                  onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  <option value="">请选择</option>
                  {Object.keys(colorPalette).map(t=>(
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>标题：
                <input value={form.title}
                  onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
              </label>
              <label>描述：
                <textarea rows={4} value={form.desc}
                  onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/>
              </label>
              <label>文件：
                <input type="file" accept=".png,.doc,.docx"
                  onChange={e=>setForm(f=>({...f,file:e.target.files[0]}))}/>
              </label>
              <button onClick={handleSave}>保存</button>
            </>
          ) : <p>请登录后再编辑。</p>}
          <button onClick={()=>setCountryCode('')}>关闭</button>
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(Home), { ssr: false });
