import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const mapContainer = useRef(null);

  const [year, setYear] = useState(2025);
  const [countryCode, setCountryCode] = useState(''); // ISO3 code
  const [countryList, setCountryList] = useState([]); // [{name, cca3}]
  const [form, setForm] = useState({ type: '', title: '', desc: '', file: null });

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

  // 2. 初始化 Mapbox 矢量瓦片源
  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [0, 20],
      zoom: 1.5
    });

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

      // 点击某国：取 iso_3166_1_alpha_3 属性
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

  // 3. 保存事件
  const handleSave = async () => {
    let fileUrl = '';
    if (form.file) {
      const res = await fetch(
        `/api/upload?filename=${encodeURIComponent(form.file.name)}`,
        { method: 'POST', body: form.file }
      );
      fileUrl = (await res.json()).url;
    }
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
    setCountryCode('');
    setForm({ type: '', title: '', desc: '', file: null });
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
          {session?.user?.email === process.env.ADMIN_EMAIL ? (
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
