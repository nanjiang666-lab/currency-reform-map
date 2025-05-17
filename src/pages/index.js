import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();
  const mapContainer = useRef(null);
  const [year, setYear] = useState(2025);
  const [country, setCountry] = useState(null);
  const [form, setForm] = useState({ type:'', title:'', desc:'', file:null });

  useEffect(() => {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [0,20],
      zoom:1.5
    });
    map.on('load', ()=>{
      map.addSource('countries',{type:'geojson',data:countriesData});
      map.addLayer({ id:'fill', type:'fill', source:'countries', paint:{'fill-color':'#627BC1','fill-opacity':0.5} });
      map.addLayer({ id:'border', type:'line', source:'countries', paint:{'line-color':'#fff','line-width':0.5} });
    });
    map.on('click','fill',e=> setCountry(e.features[0].properties.ADMIN));
    return ()=>map.remove();
  },[]);

  const handleSave = async ()=>{
    let fileUrl='';
    if(form.file){
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(form.file.name)}`,{method:'POST',body:form.file});
      const blob = await res.json();
      fileUrl = blob.url;
    }
    await fetch('/api/save-event',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({country,year,...form,fileUrl})
    });
    alert('保存成功');
    setCountry(null);
  };

  return (
    <div>
      <div style={{position:'absolute',top:10,right:10,zIndex:1}}>
        {session?.user
          ? <>已登录：{session.user.email}<button onClick={()=>signOut()}>登出</button></>
          : <button onClick={()=>signIn()}>管理员登录</button>}
      </div>

      <div className="map-overlay">
        年份：{year}
        <input type="range" min={-2000} max={2025} step={10}
          value={year} onChange={e=>setYear(+e.target.value)} />
      </div>

      <div ref={mapContainer} id="map"/>

      {country && (
        <div className="panel">
          <h3>{country} — {year}</h3>
          {session?.user?.email===process.env.ADMIN_EMAIL
            ? <>
                <label>类型：
                  <select onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                    <option value="">请选择</option>
                    {/* 在此加入20种option */}
                    <option>New Currency</option>
                    <option>Redenomination</option>
                    <option>Decimalization</option>
                    {/* …等 */}
                  </select>
                </label>
                <label>标题：
                  <input onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
                </label>
                <label>描述：
                  <textarea onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/>
                </label>
                <label>文件：
                  <input type="file" accept=".doc,.docx,.png"
                    onChange={e=>setForm(f=>({...f,file:e.target.files[0]}))}/>
                </label>
                <button onClick={handleSave}>保存</button>
              </>
            : <p>只有管理员可编辑。</p>}
          <button onClick={()=>setCountry(null)}>关闭</button>
        </div>
      )}
    </div>
  );
}
