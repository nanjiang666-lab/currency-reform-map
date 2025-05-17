// src/pages/index.js
import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSession, signIn, signOut } from 'next-auth/react';

const GEO_URL =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

// 20 种类型对应的颜色映射
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

export default function Home() {
  const { data: session } = useSession();
  const mapRef = useRef(null);
  const mapContainer = useRef(null);

  const [year, setYear] = useState(2025);
  const [geo, setGeo] = useState(null);
  const [countryList, setCountryList] = useState([]);
  const [countryCode, setCountryCode] = useState('');
  const [form, setForm] = useState({ type: '', title: '', desc: '', file: null });

  // 1. 拉取 GeoJSON 并提取国家列表
  useEffect(() => {
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((data) => {
        // 添加默认 color
        data.features.forEach((f) => {
          f.properties.color = '#ccc';
        });
        setGeo(data);
        const list = data.features
          .map((f) => ({
            name: f.properties.ADMIN,
            code: f.properties.ISO_A3
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountryList(list);
      })
      .catch(console.error);
  }, []);

  // 2. 初始化 Mapbox
  useEffect(() => {
    if (!geo) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [0, 20],
      zoom: 1.5
    });
    mapRef.current = map;

    map.on('load', () => {
      map.addSource('countries', { type: 'geojson', data: geo });
      map.addLayer({
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.7
        }
      });
      map.addLayer({
        id: 'countries-line',
        type: 'line',
        source: 'countries',
        paint: { 'line-color': '#fff', 'line-width': 0.5 }
      });

      map.on('click', 'countries-fill', (e) => {
        setCountryCode(e.features[0].properties.ISO_A3);
      });
      map.on('mouseenter', 'countries-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'countries-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => map.remove();
  }, [geo]);

  // 3. 保存事件，并更新地图颜色
  const handleSave = async () => {
    if (!countryCode || !form.type) {
      alert('请选择类型再保存');
      return;
    }
    let fileUrl = '';
    if (form.file) {
      const res = await fetch(
        `/api/upload?filename=${encodeURIComponent(form.file.name)}`,
        { method: 'POST', body: form.file }
      );
      fileUrl = (await res.json()).url;
    }
    // 发送到后端
    await fetch('/api/save-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode,
        year,
        ...form,
        fileUrl
      })
    });
    alert('保存成功');

    // 立即在地图上更新颜色
    const map = mapRef.current;
    const source = map.getSource('countries');
    const data = source._data; // GeoJSON object
    data.features.forEach((f) => {
      if (f.properties.ISO_A3 === countryCode) {
        f.properties.color = colorPalette[form.type];
      }
    });
    source.setData(data);

    // 关闭面板
    setCountryCode('');
    setForm({ type: '', title: '', desc: '', file: null });
  };

  const selectedCountry = countryList.find((c) => c.code === countryCode);

  return (
    <div>
      {/* 地图容器 */}
      <div ref={mapContainer} id="map" />

      {/* 国家下拉菜单 */}
      <div className="selector">
        <label>
          国家列表：
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
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

      {/* 时间轴滑块 */}
      <div className="map-overlay">
        年份：{year}
        <input
          type="range"
          min={-2000}
          max={2025}
          step={10}
          value={year}
          onChange={(e) => setYear(+e.target.value)}
        />
      </div>

      {/* 登录/登出 */}
      <div className="auth">
        {session?.user ? (
          <>
            已登录：{session.user.email}{' '}
            <button onClick={() => signOut()}>登出</button>
          </>
        ) : (
          <button onClick={() => signIn()}>管理员登录</button>
        )}
      </div>

      {/* 编辑面板 */}
      {countryCode && (
        <div className="panel">
          <h3>
            {selectedCountry?.name} — {year}
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
                  {Object.keys(colorPalette).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
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
                  rows={3}
                  value={form.desc}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, desc: e.target.value }))
                  }
                />
              </label>
              <label>
                文件：
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
