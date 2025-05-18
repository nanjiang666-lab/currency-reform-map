// src/pages/index.js

import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  const [year, setYear] = useState(2025);
  const [countryCode, setCountryCode] = useState(''); // ISO3 code
  const [countryList, setCountryList] = useState([]); // [{name, code}]
  const [form, setForm] = useState({ type: '', title: '', desc: '', file: null });

  // ←—— 新增：存放当年所有国家的事件
  const [eventsMap, setEventsMap] = useState({}); 
  //   结构：{ [countryCode]: { type, title, desc, fileUrl } }

  // 类型与对应颜色映射
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

  // 1. 拉取国家列表 (Rest Countries)
  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all?fields=name,cca3')
      .then((r) => r.json())
      .then((data) => {
        const list = data
          .map((c) => ({ name: c.name.common, code: c.cca3 }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountryList(list);
      })
      .catch(console.error);
  }, []);

  // ←—— 新增：当年份变化时，拉取当年所有事件
  useEffect(() => {
    fetch(`/api/get-events?year=${year}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((events) => {
        const m = {};
        events.forEach((e) => {
          m[e.countryCode] = {
            type: e.type,
            title: e.title,
            desc: e.desc,
            fileUrl: e.fileUrl
          };
        });
        setEventsMap(m);
      })
      .catch(console.error);
  }, [year]);

  // 2. 初始化 Mapbox 矢量瓦片源
  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [0, 20],
      zoom: 1.5
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
          'fill-color': '#627BC1',
          'fill-opacity': 0.6
        }
      });

      map.addLayer({
        id: 'countries-line',
        type: 'line',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: { 'line-color': '#ffffff', 'line-width': 0.5 }
      });

      map.on('click', 'countries-fill', (e) => {
        setCountryCode(e.features[0].properties.iso_3166_1_alpha_3);
      });
      map.on('mouseenter', 'countries-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'countries-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => map.remove();
  }, []);

  // ←—— 新增：当 eventsMap 变化时，给 countries-fill 图层上色
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // 构建 match 表达式
    const expr = ['match', ['get', 'iso_3166_1_alpha_3']];
    Object.entries(eventsMap).forEach(([code, ev]) => {
      expr.push(code, colorPalette[ev.type] || '#627BC1');
    });
    expr.push('#627BC1');
    map.setPaintProperty('countries-fill', 'fill-color', expr);
  }, [eventsMap]);

  // ←—— 新增：当选中国家或年份变化时，将对应 event 填入表单
  useEffect(() => {
    if (!countryCode) return;
    const ev = eventsMap[countryCode];
    if (ev) {
      setForm({ type: ev.type, title: ev.title, desc: ev.desc, file: null });
    } else {
      setForm({ type: '', title: '', desc: '', file: null });
    }
  }, [countryCode, eventsMap]);

  // 3. 保存事件（仅影响当前国家+年份）
  const handleSave = async () => {
    if (!form.type) {
      alert('请选择类型后再保存');
      return;
    }
    let fileUrl = '';
    if (form.file) {
      const uploadRes = await fetch(
        `/api/upload?filename=${encodeURIComponent(form.file.name)}`,
        { method: 'POST', body: form.file }
      );
      const uploadJson = await uploadRes.json();
      fileUrl = uploadJson.url;
    }
    const resp = await fetch('/api/save-event', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode,
        year,
        type: form.type,
        title: form.title,
        desc: form.desc,
        fileUrl
      })
    });
    if (!resp.ok) {
      const err = await resp.json();
      alert('保存失败：' + (err.error || resp.statusText));
      return;
    }
    alert('保存成功');
    // ←—— 新增：保存后更新本地状态，保持面板和颜色
    setEventsMap((prev) => ({
      ...prev,
      [countryCode]: { type: form.type, title: form.title, desc: form.desc, fileUrl }
    }));
  };

  // 找到当前选中国家的名字
  const selectedCountryName =
    countryList.find((c) => c.code === countryCode)?.name || '';

  return (
    <div>
      {/* 地图容器 */}
      <div ref={mapContainer} id="map" />

      {/* 下拉国家列表 */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(255,255,255,0.9)',
          padding: '8px',
          borderRadius: 4,
          zIndex: 20,
          fontFamily: 'sans-serif'
        }}
      >
        <label>
          国家列表：
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            style={{ marginLeft: 8, minWidth: 160 }}
          >
            <option value="">—— 请选择 ——</option>
            {countryList.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 登录/登出 */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 20 }}>
        {session?.user ? (
          <>
            已登录：{session.user.email}
            <button onClick={() => signOut()} style={{ marginLeft: 8 }}>
              登出
            </button>
          </>
        ) : (
          <button onClick={() => signIn()}>管理员登录</button>
        )}
      </div>

      {/* 时间轴滑块 */}
      <div className="map-overlay">
        年份：{year < 0 ? `前${-year}` : year}
        <input
          type="range"
          min={-2000}
          max={2025}
          step={10}
          value={year}
          onChange={(e) => setYear(+e.target.value)}
        />
      </div>

      {/* 编辑面板 */}
      {countryCode && (
        <div className="panel">
          <h3>
            {selectedCountryName} — {year < 0 ? `前${-year}` : year}
          </h3>
          {session?.user ? (
            <>
              <label>
                类型：
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                >
                  <option value="">请选择</option>
                  <option>New Currency</option>
                  <option>Redenomination</option>
                  <option>Decimalization</option>
                  <option>Devaluation</option>
                  <option>Revaluation</option>
                  <option>Join Euro</option>
                  <option>Leave Euro</option>
                  <option>Dollarization</option>
                  <option>De-Dollarization</option>
                  <option>Peg Change</option>
                  <option>Currency Board</option>
                  <option>Monetary Union</option>
                  <option>Exit Union</option>
                  <option>Gold Standard</option>
                  <option>Abandon Gold</option>
                  <option>Banknotes Redesign</option>
                  <option>Exchange Regime Change</option>
                  <option>Cryptocurrency</option>
                  <option>Institution Reform</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                标题：
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </label>

              <label>
                描述：
                <textarea
                  rows={4}
                  value={form.desc}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, desc: e.target.value }))
                  }
                />
              </label>

              <label>
                上传图片/文档：
                <input
                  type="file"
                  accept=".png,.doc,.docx"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, file: e.target.files[0] }))
                  }
                />
              </label>

              <button onClick={handleSave}>保存</button>
            </>
          ) : (
            <p>只有管理员可编辑。</p>
          )}
          <button onClick={() => setCountryCode('')}>关闭</button>
        </div>
      )}
    </div>
  );
}
