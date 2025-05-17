import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSession, signIn, signOut } from 'next-auth/react';

const GEO_URL =
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

export default function Home() {
  const { data: session } = useSession();
  const mapContainer = useRef(null);

  // 全局状态
  const [year, setYear] = useState(2025);
  const [country, setCountry] = useState(null);
  const [countriesGeo, setCountriesGeo] = useState(null);
  const [countryList, setCountryList] = useState([]);
  const [form, setForm] = useState({ type: '', title: '', desc: '', file: null });

  // 1) 预先 fetch 整个 GeoJSON，一次完成，存到 state
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(GEO_URL);
        const data = await res.json();
        setCountriesGeo(data);
        // 提取所有国家名并排序
        const names = data.features
          .map((f) => f.properties.ADMIN)
          .sort((a, b) => a.localeCompare(b));
        setCountryList(names);
      } catch (e) {
        console.error('加载国家 GeoJSON 失败', e);
      }
    })();
  }, []);

  // 2) 当 GeoJSON 加载完后，初始化地图并添加源/图层
  useEffect(() => {
    if (!countriesGeo) return;
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [0, 20],
      zoom: 1.5
    });

    map.on('load', () => {
      // 使用内存中的 GeoJSON 对象作为 source
      map.addSource('countries', { type: 'geojson', data: countriesGeo });

      map.addLayer({
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        paint: {
          'fill-color': '#627BC1',
          'fill-opacity': 0.7
        }
      });

      map.addLayer({
        id: 'countries-line',
        type: 'line',
        source: 'countries',
        paint: {
          'line-color': '#fff',
          'line-width': 0.5
        }
      });

      // 点击某个国家面时，打开编辑面板
      map.on('click', 'countries-fill', (e) => {
        setCountry(e.features[0].properties.ADMIN);
      });
      map.on('mouseenter', 'countries-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'countries-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => map.remove();
  }, [countriesGeo]);

  // 3) 保存编辑
  const handleSave = async () => {
    let fileUrl = '';
    if (form.file) {
      const res = await fetch(
        `/api/upload?filename=${encodeURIComponent(form.file.name)}`,
        { method: 'POST', body: form.file }
      );
      const blob = await res.json();
      fileUrl = blob.url;
    }
    await fetch('/api/save-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, year, ...form, fileUrl })
    });
    alert('保存成功');
    setCountry(null);
  };

  return (
    <div>
      {/* 侧边栏：国家列表 */}
      <div className="sidebar">
        <h3>国家列表</h3>
        <ul>
          {countryList.map((name) => (
            <li key={name}>
              <button onClick={() => setCountry(name)}>{name}</button>
            </li>
          ))}
        </ul>
      </div>

      {/* 登录/登出按钮 */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 30 }}>
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

      {/* 地图容器 */}
      <div ref={mapContainer} id="map" />

      {/* 编辑面板 */}
      {country && (
        <div className="panel">
          <h3>
            {country} — {year < 0 ? `前${-year}` : year}
          </h3>
          {session?.user?.email === process.env.ADMIN_EMAIL ? (
            <>
              <label>
                类型：
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="">请选择</option>
                  {/* 20 种类型 */}
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
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label>
                报告描述：
                <textarea
                  rows={4}
                  value={form.desc}
                  onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                />
              </label>
              <label>
                上传图片/文档：
                <input
                  type="file"
                  accept=".png,.doc,.docx"
                  onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] }))}
                />
              </label>
              <button onClick={handleSave}>保存</button>
            </>
          ) : (
            <p>只有管理员可编辑。</p>
          )}
          <button onClick={() => setCountry(null)}>关闭</button>
        </div>
      )}
    </div>
  );
}
