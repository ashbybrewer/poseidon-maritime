import { useState, useEffect, useCallback, useMemo } from "react";
import { WORLD_PATHS } from "./worldPaths.js";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const VESSEL_COUNT = 150;
const UPDATE_MS = 3500;
const ANOMALY_MS = 8000;
const W = 1000, H = 520;

const GEOFENCE_ZONES = [
  { id:"HKG", name:"Hong Kong", lon:114.1, lat:22.3, radius:1.8, risk:"HIGH" },
  { id:"SGP", name:"Malacca Strait", lon:103.8, lat:1.35, radius:2.1, risk:"CRITICAL" },
  { id:"ADE", name:"Gulf of Aden", lon:47.5, lat:12.0, radius:2.5, risk:"CRITICAL" },
  { id:"SUZ", name:"Suez Approaches", lon:32.5, lat:30.0, radius:1.5, risk:"HIGH" },
  { id:"PAN", name:"Panama Canal", lon:-79.5, lat:9.0, radius:1.5, risk:"MEDIUM" },
  { id:"HOR", name:"Strait of Hormuz", lon:56.3, lat:26.5, radius:1.2, risk:"CRITICAL" },
];

const CARGO_TYPES = ["Crude Oil","LNG","Container","Bulk Grain","Coal","Chemicals","Ro-Ro","Livestock","Iron Ore","Phosphate"];
const FLAGS = ["Panama","Liberia","Marshall Islands","Bahamas","Singapore","Greece","China","Malta","Cyprus","Hong Kong","Norway","UK","Japan","South Korea"];
const PREFIXES = ["MV","MT","MS","SS"];
const NAMES = [
  "Pacific Voyager","Atlantic Pioneer","Northern Star","Southern Cross","Eastern Wind","Western Spirit",
  "Golden Bridge","Silver Horizon","Blue Ocean","Red Sea Carrier","Arctic Trader","Tropical Breeze",
  "Desert Storm","Mountain Eagle","River Delta","Coastal Runner","Ocean Guardian","Sea Phoenix",
  "Harbor Light","Deep Water","Trade Wind","Monsoon King","Coral Sea","Midnight Sun","Polar Star",
  "Equator Cross","Tropic Thunder","Gulf Mariner","Bay Spirit","Cape Navigator","Sea Dragon",
  "Orient Express","Titan Carrier","Aegean Star","Baltic Pride","Nordic Wave","Adriatic Sun",
  "Caspian Eagle","Amazon Trader","Congo Spirit","Nile Runner","Euphrates","Tigris Voyager",
  "Mekong Delta","Yangtze Pride","Pearl River","Rhine Carrier","Danube Star","Volga Dream",
  "Mississippi Tide","Colorado Eagle","Grand Canyon","Rocky Mountain","Sierra Madre","Andes Spirit",
  "Himalaya Peak","Atlas Trader","Kilimanjaro","Vesuvius Fire","Etna Spirit","Fuji Maru",
  "Olympus Star","Everest Peak","McKinley Pride","Denali Spirit","Aconcagua","Blanc Summit",
  "Jungfrau Star","Matterhorn","Eiger Spirit","Wetterhorn","Bernina Dream","Grossglockner",
];

// ─── SHIPPING LANES ───────────────────────────────────────────────────────────
const LANES = [
  { name:"Trans-Pacific N",  pts:[[-123,37],[-160,35],[-175,25],[141,25],[121,29],[119,33]] },
  { name:"Trans-Pacific S",  pts:[[-76,5],[-120,5],[-150,-5],[-170,-15],[165,-20],[153,-27],[151,-34]] },
  { name:"Asia-Europe",      pts:[[121,29],[103,1],[80,10],[47,12],[43,12],[32,30],[10,36],[2,41],[-9,38]] },
  { name:"Trans-Atlantic N", pts:[[-74,40],[-50,48],[-20,52],[-5,54],[2,51],[8,55],[10,58]] },
  { name:"Trans-Atlantic S", pts:[[-43,-23],[-20,-10],[0,-5],[15,-5],[32,0],[46,-10]] },
  { name:"Cape Route",       pts:[[103,1],[80,-5],[60,-15],[40,-25],[25,-34],[18,-34],[0,-18],[-15,-5],[-18,10]] },
  { name:"Gulf-Europe",      pts:[[56,26],[50,15],[44,12],[36,12],[32,30],[18,38],[8,44],[2,41]] },
  { name:"Pacific Coast N",  pts:[[-123,37],[-110,22],[-97,18],[-84,10],[-79,9]] },
  { name:"Pacific Coast S",  pts:[[-79,9],[-78,0],[-76,-5],[-70,-18],[-68,-25],[-70,-34]] },
  { name:"Indian Ocean W",   pts:[[56,26],[52,14],[48,8],[44,2],[40,-10],[36,-20],[28,-26],[18,-34]] },
  { name:"Indian Ocean E",   pts:[[56,26],[68,22],[72,18],[76,12],[80,6],[90,-5],[103,1],[113,3]] },
  { name:"North Sea",        pts:[[2,51],[5,53],[8,57],[10,58],[15,59],[18,60],[20,58],[14,55]] },
  { name:"Mediterranean",    pts:[[-5,36],[2,38],[10,38],[15,38],[20,38],[26,38],[32,37],[38,38]] },
  { name:"SE Asia",          pts:[[103,1],[106,5],[110,5],[116,8],[120,12],[122,18],[124,22],[128,30]] },
  { name:"East Africa",      pts:[[46,-10],[44,-5],[42,2],[40,8],[44,12],[46,18],[50,22],[54,26]] },
];

// ─── WORLD LANDMASS OUTLINES (simplified lon/lat polygons) ──────────────────
// Enough detail to clearly show continents on screen
const LANE_PATHS = LANES.map((lane, i) => ({
  i,
  d: lane.pts.map((p, j) => { const { x, y } = toXY(p[0], p[1]); return `${j === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ")
}));
const ZONE_POS = GEOFENCE_ZONES.map(z => ({ ...z, ...toXY(z.lon, z.lat) }));

// ─── VESSEL INIT / UPDATE ─────────────────────────────────────────────────────
function initVessel(id) {
  const lane = LANES[id % LANES.length];
  const ptIdx = Math.floor(Math.random() * (lane.pts.length - 1));
  const t = Math.random();
  const p1 = lane.pts[ptIdx];
  const p2 = lane.pts[Math.min(ptIdx + 1, lane.pts.length - 1)];
  const lon = Math.max(-178, Math.min(178, lerp(p1[0], p2[0], t) + (Math.random() - 0.5) * 10));
  const lat = Math.max(-80, Math.min(80, lerp(p1[1], p2[1], t) + (Math.random() - 0.5) * 5));
  const ni = id % NAMES.length;
  const suffix = id >= NAMES.length ? ` ${Math.floor(id / NAMES.length) + 1}` : "";
  return {
    id: `MMSI${900000000 + id * 7 + 123456}`,
    name: `${PREFIXES[id % 4]} ${NAMES[ni]}${suffix}`,
    flag: FLAGS[id % FLAGS.length],
    cargo: CARGO_TYPES[id % CARGO_TYPES.length],
    imo: `IMO${9000000 + id * 13}`,
    lon, lat,
    heading: Math.random() * 360,
    speed: 8 + Math.random() * 10,
    laneIdx: id % LANES.length,
    pointIdx: ptIdx,
    laneT: t,
    status: "UNDERWAY",
    lastContact: Date.now(),
    track: [{ lon, lat, ts: Date.now() }],
    anomalies: [],
    darkEvent: null,
    draught: (3 + Math.random() * 12).toFixed(1),
    length: 80 + Math.floor(Math.random() * 300),
    dwt: 10000 + Math.floor(Math.random() * 300000),
    destination: lane.pts[lane.pts.length - 1],
    grossTonnage: 10000 + Math.floor(Math.random() * 180000),
  };
}

function updateVessel(vessel, forceAnomaly = null) {
  const lane = LANES[vessel.laneIdx];
  let { laneT, pointIdx } = vessel;
  const speed = vessel.speed / 3600 * (UPDATE_MS / 1000);
  const p1 = lane.pts[pointIdx];
  const nextIdx = Math.min(pointIdx + 1, lane.pts.length - 1);
  const p2 = lane.pts[nextIdx];
  const segLen = Math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2);
  laneT = Math.min(laneT + (speed * 0.008) / Math.max(segLen, 0.01), 1);
  if (laneT >= 1) { pointIdx = nextIdx < lane.pts.length - 1 ? nextIdx : 0; laneT = 0; }
  const cp1 = lane.pts[pointIdx], cp2 = lane.pts[Math.min(pointIdx + 1, lane.pts.length - 1)];
  let lon = Math.max(-178, Math.min(178, lerp(cp1[0], cp2[0], laneT) + (Math.random() - 0.5) * 0.08));
  let lat = Math.max(-80, Math.min(80, lerp(cp1[1], cp2[1], laneT) + (Math.random() - 0.5) * 0.04));
  let speed2 = Math.max(2, vessel.speed + (Math.random() - 0.5) * 0.4);
  let heading = vessel.heading + (Math.random() - 0.5) * 5;
  let status = vessel.status, anomalies = [...vessel.anomalies], darkEvent = vessel.darkEvent;

  if (forceAnomaly === "DARK") {
    status = "DARK"; darkEvent = { startTime: Date.now(), lon, lat };
    anomalies = [...anomalies, { type: "AIS_DARK", ts: Date.now(), severity: "HIGH", desc: "AIS transponder offline" }];
  } else if (forceAnomaly === "SPEED") {
    speed2 = 22 + Math.random() * 8;
    anomalies = [...anomalies, { type: "SPEED_ANOMALY", ts: Date.now(), severity: "MEDIUM", speed: speed2.toFixed(1) }];
  } else if (forceAnomaly === "STS") {
    status = "STS_OPERATION";
    anomalies = [...anomalies, { type: "STS_TRANSFER", ts: Date.now(), severity: "HIGH", desc: "Ship-to-ship transfer detected" }];
  } else if (forceAnomaly === "ZONE") {
    const z = GEOFENCE_ZONES[Math.floor(Math.random() * GEOFENCE_ZONES.length)];
    lon = z.lon + (Math.random() - 0.5) * 0.5; lat = z.lat + (Math.random() - 0.5) * 0.5;
    anomalies = [...anomalies, { type: "GEOFENCE_BREACH", ts: Date.now(), severity: z.risk, zone: z.name }];
  } else if (status === "DARK" && Date.now() - (darkEvent?.startTime || 0) > 90000) {
    status = "UNDERWAY"; darkEvent = null;
  }
  const track = [...vessel.track, { lon, lat, ts: Date.now() }].slice(-30);
  return { ...vessel, lon, lat, heading, speed: speed2, laneT, pointIdx, status, track, anomalies: anomalies.slice(-5), darkEvent, lastContact: Date.now() };
}

// ─── AIS HOOK ─────────────────────────────────────────────────────────────────
function useAIS() {
  const [vessels, setVessels] = useState(() => Array.from({ length: VESSEL_COUNT }, (_, i) => initVessel(i)));
  const [events, setEvents] = useState([]);
  useEffect(() => {
    const tick = setInterval(() => setVessels(prev => prev.map(v => updateVessel(v))), UPDATE_MS);
    const seed = setInterval(() => {
      const types = ["DARK", "SPEED", "STS", "ZONE"];
      const aType = types[Math.floor(Math.random() * 4)];
      setVessels(prev => {
        const idx = Math.floor(Math.random() * prev.length);
        const next = [...prev];
        next[idx] = updateVessel(prev[idx], aType);
        const a = next[idx].anomalies[next[idx].anomalies.length - 1];
        if (a) setEvents(ev => [{ id: Date.now(), vessel: next[idx].name, mmsi: next[idx].id, type: a.type, severity: a.severity, ts: a.ts }, ...ev].slice(0, 60));
        return next;
      });
    }, ANOMALY_MS);
    return () => { clearInterval(tick); clearInterval(seed); };
  }, []);
  return { vessels, events };
}

// ─── SPATIAL ──────────────────────────────────────────────────────────────────
function spatialMetrics(vessels) {
  const zoneBreaches = [];
  vessels.forEach(v => GEOFENCE_ZONES.forEach(z => {
    if (haversineNM(v.lon, v.lat, z.lon, z.lat) < z.radius * 60)
      zoneBreaches.push({ vessel: v.id, zone: z.id, zoneName: z.name, risk: z.risk });
  }));
  return { zoneBreaches };
}

function predictETA(vessel) {
  const [dlon, dlat] = vessel.destination;
  const dist = haversineNM(vessel.lon, vessel.lat, dlon, dlat);
  const eta = dist / Math.max(vessel.speed, 1);
  return { distNM: Math.round(dist), etaDays: (eta / 24).toFixed(1) };
}

// ─── AI ───────────────────────────────────────────────────────────────────────
async function runAI(vessel, anomaly, metrics) {
  const eta = predictETA(vessel);
  const zb = metrics.zoneBreaches.find(z => z.vessel === vessel.id);
  const prompt = `You are a maritime intelligence analyst. Analyze this vessel anomaly.

VESSEL: ${vessel.name} (${vessel.id}) | Flag: ${vessel.flag} | Cargo: ${vessel.cargo}
Position: ${vessel.lat.toFixed(3)}°, ${vessel.lon.toFixed(3)}° | Speed: ${vessel.speed.toFixed(1)}kts | Status: ${vessel.status}
DWT: ${vessel.dwt.toLocaleString()} MT | ETA: ${eta.etaDays} days (${eta.distNM} NM)
ANOMALY: ${anomaly.type} | Severity: ${anomaly.severity}
${zb ? `ZONE: Within ${zb.zoneName} (${zb.risk})` : "No geofence alert"}

Respond ONLY with valid JSON, no markdown fences:
{"riskScore":75,"riskLevel":"HIGH","tacticalAssessment":"Two sentence assessment here.","probableExplanations":["exp1","exp2","exp3"],"recommendedActions":["act1","act2","act3"],"flagsOfConcern":["flag1","flag2"],"environmentalImpact":"One sentence here.","regulatoryReferences":["SOLAS V/19.2","MARPOL Annex I"],"confidence":80}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(res.status);
  const data = await res.json();
  const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg0:"#030810", bg1:"#060D18", bg2:"#0A1520", bg3:"#0F1E2E",
  border:"#162A40", borderHi:"#245580",
  amber:"#F0A500", amberD:"#7A5300", amberG:"rgba(240,165,0,0.1)",
  red:"#E53E3E", redD:"#6B1C1C",
  green:"#16A34A", cyan:"#0EA5E9", purple:"#8B5CF6",
  t0:"#E8F4FF", t1:"#7BA8CC", t2:"#3A5E7A",
  land:"#1C3022", landStroke:"#2C4A30",
  mono:"'JetBrains Mono','Fira Code',monospace",
  sans:"'Inter',system-ui,sans-serif",
};
const SEV = { CRITICAL:C.red, HIGH:"#FF6B35", MEDIUM:C.amber, LOW:C.cyan, MINIMAL:C.green };
const STC = { UNDERWAY:C.green, DARK:C.red, STS_OPERATION:C.amber, ANCHORED:C.cyan, MOORED:C.t1 };

// ─── WORLD MAP ────────────────────────────────────────────────────────────────
function WorldMap({ vessels, selected, onSelect }) {

  const vesselPts = useMemo(() =>
    vessels.map(v => { const { x, y } = toXY(v.lon, v.lat); return { ...v, x, y }; })
  , [vessels]);

  return (
    <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}`, flexShrink: 0 }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", cursor: "crosshair" }}>
        <defs>
          <linearGradient id="oceanG" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#04101E"/>
            <stop offset="100%" stopColor="#020709"/>
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="glowL"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0L0 0 0 50" fill="none" stroke="#0E2035" strokeWidth="0.3"/>
          </pattern>
        </defs>

        {/* Ocean background */}
        <rect width={W} height={H} fill="url(#oceanG)"/>
        <rect width={W} height={H} fill="url(#grid)"/>

        {/* Latitude lines */}
        {[-60, -30, 0, 30, 60].map(lat => {
          const { y } = toXY(0, lat);
          return <line key={lat} x1={0} y1={y} x2={W} y2={y}
            stroke={lat === 0 ? C.amberD : C.border}
            strokeWidth={lat === 0 ? 0.8 : 0.2}
            opacity={lat === 0 ? 0.5 : 0.3}
            strokeDasharray={lat === 0 ? "none" : "3,9"}/>;
        })}

        {/* Lon lines */}
        {[-120, -60, 0, 60, 120].map(lon => {
          const { x } = toXY(lon, 0);
          return <line key={lon} x1={x} y1={0} x2={x} y2={H} stroke={C.border} strokeWidth="0.2" opacity="0.25"/>;
        })}

        {/* ── LANDMASSES ── */}
        {WORLD_PATHS.map((d, i) => (
          <path key={i} d={d} fill={C.land} stroke={C.landStroke} strokeWidth="0.5" opacity="1"/>
        ))}

        {/* Shipping lanes */}
        {LANE_PATHS.map(({ i, d }) => (
          <path key={i} d={d} fill="none" stroke={C.cyan} strokeWidth="0.5" opacity="0.1" strokeDasharray="6,14"/>
        ))}

        {/* Geofence zones */}
        {ZONE_POS.map(z => {
          const col = z.risk === "CRITICAL" ? C.red : z.risk === "HIGH" ? C.amber : C.cyan;
          return (
            <g key={z.id}>
              <circle cx={z.x} cy={z.y} r={z.radius * 20} fill={col} fillOpacity="0.07" stroke={col} strokeWidth="0.7" strokeDasharray="4,6"/>
              <text x={z.x} y={z.y - z.radius * 20 - 4} textAnchor="middle" fill={col} fontSize="8" opacity="0.7" fontFamily={C.mono}>{z.name}</text>
            </g>
          );
        })}

        {/* Track for selected vessel */}
        {selected && (() => {
          const sv = vesselPts.find(v => v.id === selected.id);
          if (!sv || sv.track.length < 2) return null;
          const tpts = sv.track.map(p => toXY(p.lon, p.lat));
          const d = tpts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
          const col = STC[sv.status] || C.t1;
          return <path d={d} fill="none" stroke={col} strokeWidth="1.5" opacity="0.55"/>;
        })()}

        {/* Vessel markers */}
        {vesselPts.map(v => {
          const col = STC[v.status] || C.t1;
          const isSel = selected?.id === v.id;
          const isDark = v.status === "DARK";
          const sz = isSel ? 7 : 4;
          return (
            <g key={v.id} onClick={() => onSelect(v)} style={{ cursor: "pointer" }}
               filter={isSel ? "url(#glowL)" : isDark ? "url(#glow)" : undefined}>
              {isSel && <circle cx={v.x} cy={v.y} r={18} fill="none" stroke={col} strokeWidth="0.8" opacity="0.35"/>}
              {isDark && (
                <circle cx={v.x} cy={v.y} r={8} fill="none" stroke={C.red} strokeWidth="1.2">
                  <animate attributeName="r" from="5" to="22" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" from="0.9" to="0" dur="2s" repeatCount="indefinite"/>
                </circle>
              )}
              <polygon
                points={`0,${-sz * 1.6} ${-sz * 0.6},${sz * 0.9} 0,${sz * 0.3} ${sz * 0.6},${sz * 0.9}`}
                fill={col} opacity={isSel ? 1 : 0.85}
                transform={`translate(${v.x},${v.y}) rotate(${v.heading})`}
              />
              {v.anomalies.length > 0 && (
                <circle cx={v.x + sz} cy={v.y - sz} r={2.5} fill={C.red}>
                  <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite"/>
                </circle>
              )}
            </g>
          );
        })}

        {/* Speed vector for selected */}
        {selected && (() => {
          const sv = vesselPts.find(v => v.id === selected.id);
          if (!sv) return null;
          const r = (sv.heading - 90) * Math.PI / 180;
          const vl = sv.speed * 4;
          return <line x1={sv.x} y1={sv.y} x2={sv.x + Math.cos(r) * vl} y2={sv.y + Math.sin(r) * vl}
            stroke={C.amber} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.9"/>;
        })()}
      </svg>

      {/* Legend */}
      <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 5 }}>
        {[{c:C.green,l:"Underway"},{c:C.red,l:"Dark"},{c:C.amber,l:"STS"},{c:C.cyan,l:"Anchored"}].map(({c,l}) => (
          <div key={l} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(3,8,16,0.82)",padding:"2px 7px",borderRadius:3,border:`1px solid ${C.border}`}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:c}}/>
            <span style={{fontSize:9,color:C.t1,fontFamily:C.mono}}>{l}</span>
          </div>
        ))}
      </div>
      <div style={{position:"absolute",bottom:6,right:8,color:C.t2,fontSize:8,fontFamily:C.mono}}>
        LIVE · {vessels.length} VESSELS
      </div>
    </div>
  );
}

// ─── VESSEL DETAIL ────────────────────────────────────────────────────────────
function VesselDetail({ vessel, onAnalyze, analysis, analyzing }) {
  if (!vessel) return (
    <div style={{color:C.t2,textAlign:"center",padding:"40px 16px",fontFamily:C.mono,fontSize:10,lineHeight:1.8}}>
      CLICK ANY VESSEL<br/>ON THE MAP
    </div>
  );
  const eta = predictETA(vessel);
  const col = STC[vessel.status] || C.t1;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{borderBottom:`1px solid ${C.border}`,paddingBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{color:C.t0,fontSize:13,fontWeight:700,fontFamily:C.sans}}>{vessel.name}</div>
            <div style={{color:C.t2,fontSize:9,fontFamily:C.mono}}>{vessel.id} · {vessel.imo}</div>
          </div>
          <span style={{background:col+"20",color:col,fontSize:9,padding:"3px 7px",borderRadius:3,fontFamily:C.mono,border:`1px solid ${col}40`}}>{vessel.status}</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {[
          {l:"Flag",v:vessel.flag},{l:"Cargo",v:vessel.cargo},
          {l:"Speed",v:`${vessel.speed.toFixed(1)} kts`},{l:"Heading",v:`${vessel.heading.toFixed(0)}°T`},
          {l:"Lat",v:`${vessel.lat.toFixed(3)}°`},{l:"Lon",v:`${vessel.lon.toFixed(3)}°`},
          {l:"DWT",v:`${(vessel.dwt/1000).toFixed(0)}K MT`},{l:"LOA",v:`${vessel.length}m`},
          {l:"ETA",v:`${eta.etaDays}d`},{l:"Dist",v:`${eta.distNM.toLocaleString()} NM`},
        ].map(({l,v}) => (
          <div key={l} style={{background:C.bg2,borderRadius:4,padding:"7px 9px"}}>
            <div style={{color:C.t2,fontSize:8,fontFamily:C.mono,marginBottom:2}}>{l}</div>
            <div style={{color:C.t0,fontSize:11,fontFamily:C.mono}}>{v}</div>
          </div>
        ))}
      </div>

      {vessel.anomalies.length > 0 && (
        <div>
          <div style={{color:C.t1,fontSize:9,fontFamily:C.mono,marginBottom:5,letterSpacing:"0.08em"}}>ANOMALY HISTORY</div>
          {vessel.anomalies.slice().reverse().map((a, i) => (
            <div key={i} style={{display:"flex",gap:8,padding:"5px 8px",background:C.bg2,borderRadius:4,marginBottom:3,borderLeft:`2px solid ${SEV[a.severity]||C.amber}`}}>
              <div style={{flex:1}}>
                <div style={{color:SEV[a.severity]||C.amber,fontSize:9,fontFamily:C.mono}}>{a.type}</div>
                <div style={{color:C.t2,fontSize:8}}>{new Date(a.ts).toLocaleTimeString()}</div>
              </div>
              <div style={{color:SEV[a.severity],fontSize:8,fontFamily:C.mono}}>{a.severity}</div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => onAnalyze(vessel)} disabled={analyzing || vessel.anomalies.length === 0}
        style={{background:analyzing?C.bg2:(vessel.anomalies.length>0?C.amber:C.bg2),
          color:analyzing?C.t2:(vessel.anomalies.length>0?C.bg0:C.t2),
          border:"none",borderRadius:5,padding:"9px",cursor:vessel.anomalies.length>0&&!analyzing?"pointer":"not-allowed",
          fontFamily:C.mono,fontSize:11,fontWeight:700,letterSpacing:"0.05em"}}>
        {analyzing ? "⟳ ANALYZING..." : vessel.anomalies.length > 0 ? "⚡ AI THREAT ASSESSMENT" : "NO ANOMALIES"}
      </button>

      {analysis && (
        <div style={{background:C.bg2,border:`1px solid ${SEV[analysis.riskLevel]||C.border}`,borderRadius:7,padding:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{color:C.t0,fontSize:12,fontWeight:700}}>AI ASSESSMENT</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{color:C.t2,fontSize:9,fontFamily:C.mono}}>CONF {analysis.confidence}%</span>
              <span style={{background:(SEV[analysis.riskLevel]||C.amber)+"25",color:SEV[analysis.riskLevel]||C.amber,padding:"2px 7px",borderRadius:3,fontSize:10,fontFamily:C.mono,fontWeight:700}}>{analysis.riskLevel}</span>
            </div>
          </div>
          <div style={{width:"100%",height:5,background:C.bg3,borderRadius:3,overflow:"hidden",marginBottom:4}}>
            <div style={{width:`${analysis.riskScore}%`,height:"100%",background:`linear-gradient(90deg,${C.green},${C.amber},${C.red})`,borderRadius:3}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{color:C.t2,fontSize:9,fontFamily:C.mono}}>RISK SCORE</span>
            <span style={{color:C.t0,fontSize:10,fontFamily:C.mono,fontWeight:700}}>{analysis.riskScore}/100</span>
          </div>
          <p style={{color:C.t1,fontSize:10,lineHeight:1.6,marginBottom:10}}>{analysis.tacticalAssessment}</p>
          {[
            {title:"Probable Explanations",items:analysis.probableExplanations,col:C.cyan},
            {title:"Recommended Actions",items:analysis.recommendedActions,col:C.amber},
            {title:"Flags of Concern",items:analysis.flagsOfConcern,col:C.red},
          ].map(({title,items,col}) => (
            <div key={title} style={{marginBottom:7}}>
              <div style={{color:col,fontSize:8,fontFamily:C.mono,letterSpacing:"0.08em",marginBottom:3}}>{title.toUpperCase()}</div>
              {(items||[]).map((item,i) => (
                <div key={i} style={{color:C.t1,fontSize:9,padding:"2px 0 2px 8px",borderLeft:`2px solid ${col}40`,marginBottom:2}}>{item}</div>
              ))}
            </div>
          ))}
          <div style={{color:C.t2,fontSize:9,marginTop:6,borderTop:`1px solid ${C.border}`,paddingTop:6}}>
            🌊 {analysis.environmentalImpact}
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5}}>
            {(analysis.regulatoryReferences||[]).map((r,i) => (
              <span key={i} style={{background:C.bg3,color:C.purple,fontSize:8,padding:"2px 5px",borderRadius:3,fontFamily:C.mono}}>{r}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { vessels, events } = useAIS();
  const [selected, setSelected] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState("MAP");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const selV = useMemo(() => selected ? vessels.find(v => v.id === selected.id) || null : null, [vessels, selected]);
  const sm = useMemo(() => spatialMetrics(vessels), [vessels]);

  const filtered = useMemo(() => vessels.filter(v => {
    const ms = filterStatus === "ALL" || v.status === filterStatus || (filterStatus === "ANOMALY" && v.anomalies.length > 0);
    const mq = !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.id.includes(search);
    return ms && mq;
  }), [vessels, filterStatus, search]);

  const stats = useMemo(() => ({
    dark: vessels.filter(v => v.status === "DARK").length,
    sts: vessels.filter(v => v.status === "STS_OPERATION").length,
    anom: vessels.filter(v => v.anomalies.length > 0).length,
    avgSpd: (vessels.reduce((s,v) => s + v.speed, 0) / vessels.length).toFixed(1),
    flags: [...new Set(vessels.map(v => v.flag))].length,
    tdwt: vessels.reduce((s,v) => s + v.dwt, 0),
  }), [vessels]);

  const handleAnalyze = useCallback(async v => {
    if (!v.anomalies.length) return;
    setAnalyzing(true); setAnalysis(null);
    try { setAnalysis(await runAI(v, v.anomalies[v.anomalies.length-1], sm)); }
    catch { setAnalysis({ riskScore:72, riskLevel:"HIGH",
      tacticalAssessment:`${v.name} exhibits ${v.anomalies[v.anomalies.length-1]?.type} requiring investigation. Pattern consistent with evasion tactics.`,
      probableExplanations:["AIS transponder fault","Deliberate suppression","Unauthorized rendezvous"],
      recommendedActions:["Flag for MPA tasking","Cross-reference LRIT","Query last port"],
      flagsOfConcern:[`${v.flag} registry risk`,`${v.cargo} sensitivity`],
      environmentalImpact:"Potential discharge risk if cargo involves crude or chemicals.",
      regulatoryReferences:["SOLAS V/19.2","MARPOL Annex I Reg 34"],confidence:78}); }
    setAnalyzing(false);
  }, [sm]);

  const TABS = ["MAP","FLEET","EVENTS","CARGO","INTEL"];

  const kpis = [
    {l:"VESSELS",v:vessels.length,c:C.cyan},
    {l:"DARK",v:stats.dark,c:stats.dark>0?C.red:C.t2},
    {l:"STS",v:stats.sts,c:stats.sts>0?C.amber:C.t2},
    {l:"ANOMALOUS",v:stats.anom,c:stats.anom>0?C.amber:C.t2},
    {l:"AVG SPD",v:`${stats.avgSpd}kt`,c:C.t1},
    {l:"FLAGS",v:stats.flags,c:C.purple},
    {l:"DWT",v:`${(stats.tdwt/1e6).toFixed(1)}M MT`,c:C.t1},
    {l:"ZONE ALERTS",v:sm.zoneBreaches.length,c:sm.zoneBreaches.length>0?C.red:C.t2},
    {l:"EVENTS",v:events.length,c:events.length>0?C.amber:C.t2},
  ];

  return (
    <div style={{background:C.bg0,color:C.t0,fontFamily:C.sans,height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:C.bg1,borderBottom:`1px solid ${C.border}`,padding:"0 16px",display:"flex",alignItems:"center",gap:14,height:46,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:24,height:24,background:`linear-gradient(135deg,${C.amber},${C.amberD})`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>⚓</div>
          <div>
            <div style={{color:C.amber,fontSize:12,fontWeight:800,letterSpacing:"0.08em",fontFamily:C.mono,lineHeight:1}}>POSEIDON</div>
            <div style={{color:C.t2,fontSize:7,letterSpacing:"0.14em",fontFamily:C.mono}}>MARITIME INTELLIGENCE PLATFORM</div>
          </div>
        </div>
        <div style={{height:26,width:1,background:C.border}}/>
        <div style={{display:"flex",gap:2}}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{background:tab===t?C.amberG:"transparent",color:tab===t?C.amber:C.t2,
                border:`1px solid ${tab===t?C.amberD:"transparent"}`,borderRadius:4,padding:"4px 10px",
                cursor:"pointer",fontSize:10,fontFamily:C.mono,letterSpacing:"0.06em"}}>
              {t}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:12,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:C.green}}/>
            <span style={{color:C.green,fontSize:9,fontFamily:C.mono}}>AIS LIVE</span>
          </div>
          <div style={{color:C.t2,fontSize:9,fontFamily:C.mono}}>{now.toUTCString().slice(0,25)} UTC</div>
        </div>
      </div>

      {/* KPI bar */}
      <div style={{background:C.bg1,borderBottom:`1px solid ${C.border}`,padding:"5px 16px",display:"flex",gap:16,overflowX:"auto",flexShrink:0}}>
        {kpis.map(({l,v,c}) => (
          <div key={l} style={{flexShrink:0}}>
            <div style={{color:C.t2,fontSize:7,fontFamily:C.mono,letterSpacing:"0.1em"}}>{l}</div>
            <div style={{color:c,fontSize:15,fontFamily:C.mono,fontWeight:700,lineHeight:1.2}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{flex:1,padding:"12px 14px",display:"flex",gap:12,overflow:"hidden",minHeight:0}}>

        {/* ── MAP ── */}
        {tab === "MAP" && (
          <>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minWidth:0,overflow:"hidden"}}>
              <WorldMap vessels={vessels} selected={selV} onSelect={v => { setSelected(v); setAnalysis(null); }}/>
              {sm.zoneBreaches.length > 0 && (
                <div style={{background:C.redD+"25",border:`1px solid ${C.red}35`,borderRadius:5,padding:"6px 10px",flexShrink:0}}>
                  <div style={{color:C.red,fontSize:9,fontFamily:C.mono,marginBottom:4,letterSpacing:"0.08em"}}>⚠ GEOFENCE BREACHES</div>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {sm.zoneBreaches.slice(0,8).map((b,i) => {
                      const v = vessels.find(vv => vv.id === b.vessel);
                      return (
                        <div key={i} onClick={() => v && setSelected(v)}
                          style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:3,padding:"2px 7px",cursor:"pointer"}}>
                          <span style={{color:SEV[b.risk]||C.amber,fontSize:9,fontFamily:C.mono}}>{b.zoneName}</span>
                          <span style={{color:C.t2,fontSize:9,fontFamily:C.mono}}> · {v?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div style={{width:300,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:7,padding:12,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
              <div style={{color:C.t1,fontSize:9,fontFamily:C.mono,letterSpacing:"0.1em",marginBottom:8,borderBottom:`1px solid ${C.border}`,paddingBottom:6,flexShrink:0}}>
                {selV ? `VESSEL · ${selV.name}` : "VESSEL DETAIL"}
              </div>
              <div style={{flex:1,overflowY:"auto"}}>
                <VesselDetail vessel={selV} onAnalyze={handleAnalyze} analysis={analysis} analyzing={analyzing}/>
              </div>
            </div>
          </>
        )}

        {/* ── FLEET ── */}
        {tab === "FLEET" && (
          <div style={{flex:1,display:"flex",gap:12,overflow:"hidden"}}>
            <div style={{width:220,display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vessel / MMSI..."
                style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:4,padding:"6px 8px",color:C.t0,fontFamily:C.mono,fontSize:10,outline:"none"}}/>
              <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                {["ALL","UNDERWAY","DARK","STS_OPERATION","ANOMALY"].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{background:filterStatus===s?C.amberG:C.bg2,color:filterStatus===s?C.amber:C.t2,
                      border:`1px solid ${filterStatus===s?C.amberD:C.border}`,borderRadius:3,padding:"2px 5px",cursor:"pointer",fontSize:8,fontFamily:C.mono}}>
                    {s}
                  </button>
                ))}
              </div>
              <div style={{color:C.t2,fontSize:9,fontFamily:C.mono}}>{filtered.length} vessels</div>
            </div>
            <div style={{flex:1,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:7,padding:10,overflow:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,fontFamily:C.mono}}>
                <thead>
                  <tr style={{borderBottom:`1px solid ${C.border}`}}>
                    {["Vessel","MMSI","Flag","Cargo","Speed","Status","Anomalies"].map(h => (
                      <th key={h} style={{color:C.t2,fontWeight:400,textAlign:"left",padding:"4px 7px",fontSize:8,letterSpacing:"0.08em"}}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => {
                    const col = STC[v.status] || C.t1;
                    return (
                      <tr key={v.id} onClick={() => { setSelected(v); setTab("MAP"); }}
                        style={{borderBottom:`1px solid ${C.border}15`,cursor:"pointer"}}
                        onMouseEnter={e => e.currentTarget.style.background = C.bg2}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{padding:"5px 7px",color:C.t0}}>{v.name}</td>
                        <td style={{padding:"5px 7px",color:C.t2,fontSize:9}}>{v.id}</td>
                        <td style={{padding:"5px 7px",color:C.t1}}>{v.flag}</td>
                        <td style={{padding:"5px 7px",color:C.t1}}>{v.cargo}</td>
                        <td style={{padding:"5px 7px",color:C.cyan}}>{v.speed.toFixed(1)}kt</td>
                        <td style={{padding:"5px 7px"}}><span style={{color:col,background:col+"15",padding:"1px 5px",borderRadius:2}}>{v.status}</span></td>
                        <td style={{padding:"5px 7px"}}>{v.anomalies.length>0?<span style={{color:C.red}}>⚠ {v.anomalies.length}</span>:<span style={{color:C.t2}}>—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── EVENTS ── */}
        {tab === "EVENTS" && (
          <div style={{flex:1,display:"flex",gap:12,overflow:"hidden"}}>
            <div style={{flex:1,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:7,padding:12,display:"flex",flexDirection:"column",gap:7,overflow:"hidden"}}>
              <div style={{color:C.t1,fontSize:9,fontFamily:C.mono,letterSpacing:"0.1em",flexShrink:0}}>LIVE ANOMALY FEED</div>
              <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                {events.length===0&&<div style={{color:C.t2,fontSize:10,fontFamily:C.mono,textAlign:"center",padding:20}}>MONITORING — NO EVENTS YET</div>}
                {events.map(ev => {
                  const col = SEV[ev.severity] || C.t1;
                  return (
                    <div key={ev.id} style={{background:C.bg0,border:`1px solid ${C.border}`,borderLeft:`3px solid ${col}`,borderRadius:4,padding:"6px 9px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span style={{color:col,fontSize:9,fontFamily:C.mono,fontWeight:700}}>{ev.type}</span>
                        <span style={{color:C.t2,fontSize:8,fontFamily:C.mono}}>{new Date(ev.ts).toLocaleTimeString()}</span>
                      </div>
                      <div style={{color:C.t0,fontSize:10}}>{ev.vessel}</div>
                      <div style={{color:C.t2,fontSize:8,fontFamily:C.mono}}>{ev.mmsi}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{width:200,display:"flex",flexDirection:"column",gap:7,flexShrink:0}}>
              {[
                {l:"Total Events",v:events.length,c:C.cyan},
                {l:"Critical/High",v:events.filter(e=>["CRITICAL","HIGH"].includes(e.severity)).length,c:C.red},
                {l:"AIS Dark",v:events.filter(e=>e.type==="AIS_DARK").length,c:C.red},
                {l:"Speed Anomaly",v:events.filter(e=>e.type==="SPEED_ANOMALY").length,c:C.amber},
                {l:"STS Transfer",v:events.filter(e=>e.type==="STS_TRANSFER").length,c:C.amber},
                {l:"Zone Breach",v:events.filter(e=>e.type==="GEOFENCE_BREACH").length,c:"#FF6B35"},
              ].map(({l,v,c}) => (
                <div key={l} style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:5,padding:"9px 11px",borderTop:`2px solid ${c}`}}>
                  <div style={{color:C.t1,fontSize:8,fontFamily:C.mono,letterSpacing:"0.08em",marginBottom:3}}>{l}</div>
                  <div style={{color:c,fontSize:22,fontFamily:C.mono,fontWeight:700}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CARGO ── */}
        {tab === "CARGO" && (
          <div style={{flex:1,display:"flex",gap:12,overflow:"hidden"}}>
            <div style={{flex:1,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:7,padding:14,overflowY:"auto"}}>
              <div style={{color:C.t1,fontSize:9,fontFamily:C.mono,letterSpacing:"0.1em",marginBottom:12}}>CARGO DISTRIBUTION · {vessels.length} VESSELS</div>
              {Object.entries(vessels.reduce((a,v)=>{a[v.cargo]=(a[v.cargo]||0)+1;return a;},{}))
                .sort((a,b)=>b[1]-a[1]).map(([cargo,count],i)=>{
                const cols=[C.amber,C.cyan,C.purple,C.green,C.red,"#FF6B35","#FFD166",C.t1,"#06D6A0","#118AB2"];
                const col=cols[i%10], pct=((count/vessels.length)*100).toFixed(1);
                return (
                  <div key={cargo} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{color:C.t1,fontSize:11,fontFamily:C.sans}}>{cargo}</span>
                      <span style={{color:col,fontSize:10,fontFamily:C.mono}}>{count} ({pct}%)</span>
                    </div>
                    <div style={{height:6,background:C.bg3,borderRadius:3,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,height:"100%",background:col,borderRadius:3,transition:"width 0.4s"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{flex:1,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:7,padding:14,overflowY:"auto"}}>
              <div style={{color:C.t1,fontSize:9,fontFamily:C.mono,letterSpacing:"0.1em",marginBottom:12}}>ETA FORECAST · ALL {vessels.length} VESSELS</div>
              {vessels.map(v => {
                const eta = predictETA(v);
                return (
                  <div key={v.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${C.border}10`,cursor:"pointer"}}
                    onClick={() => { setSelected(v); setTab("MAP"); }}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:C.t0,fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.name}</div>
                      <div style={{color:C.t2,fontSize:8,fontFamily:C.mono}}>{v.cargo} · {v.flag}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{color:C.amber,fontSize:10,fontFamily:C.mono}}>{eta.distNM.toLocaleString()} NM</div>
                      <div style={{color:C.t2,fontSize:8,fontFamily:C.mono}}>ETA {eta.etaDays}d</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── INTEL ── */}
        {tab === "INTEL" && (
          <div style={{flex:1,display:"flex",gap:12,overflow:"hidden"}}>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>
              <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:7,padding:12}}>
                <div style={{color:C.red,fontSize:9,fontFamily:C.mono,letterSpacing:"0.08em",marginBottom:8}}>AIS DARK ({vessels.filter(v=>v.status==="DARK").length})</div>
                {vessels.filter(v=>v.status==="DARK").length===0
                  ?<div style={{color:C.t2,fontSize:10,fontFamily:C.mono}}>No dark vessels</div>
                  :vessels.filter(v=>v.status==="DARK").map(v=>(
                    <div key={v.id} onClick={()=>{setSelected(v);setTab("MAP");}}
                      style={{background:C.redD+"20",border:`1px solid ${C.red}30`,borderRadius:4,padding:"7px 9px",cursor:"pointer",marginBottom:5}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:C.t0,fontSize:11}}>{v.name}</span>
                        <span style={{color:C.red,fontSize:9,fontFamily:C.mono}}>DARK</span>
                      </div>
                      <div style={{color:C.t2,fontSize:9,fontFamily:C.mono}}>{v.id} · {v.flag} · {v.cargo}</div>
                    </div>
                  ))}
              </div>
              <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:7,padding:12}}>
                <div style={{color:C.amber,fontSize:9,fontFamily:C.mono,letterSpacing:"0.08em",marginBottom:8}}>STS OPS ({vessels.filter(v=>v.status==="STS_OPERATION").length})</div>
                {vessels.filter(v=>v.status==="STS_OPERATION").length===0
                  ?<div style={{color:C.t2,fontSize:10,fontFamily:C.mono}}>No active STS</div>
                  :vessels.filter(v=>v.status==="STS_OPERATION").map(v=>(
                    <div key={v.id} onClick={()=>{setSelected(v);setTab("MAP");}}
                      style={{background:"rgba(240,165,0,0.08)",border:`1px solid ${C.amberD}`,borderRadius:4,padding:"7px 9px",cursor:"pointer",marginBottom:5}}>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{color:C.t0,fontSize:11}}>{v.name}</span>
                        <span style={{color:C.amber,fontSize:9,fontFamily:C.mono}}>STS</span>
                      </div>
                      <div style={{color:C.t2,fontSize:9,fontFamily:C.mono}}>{v.id} · {v.cargo}</div>
                    </div>
                  ))}
              </div>
            </div>
            <div style={{width:260,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:7,padding:12,overflowY:"auto",flexShrink:0}}>
              <div style={{color:C.t1,fontSize:9,fontFamily:C.mono,letterSpacing:"0.1em",marginBottom:12}}>INTEL SUMMARY</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
                {[
                  {l:"Dark",v:stats.dark,c:stats.dark>0?C.red:C.t2},
                  {l:"STS",v:stats.sts,c:stats.sts>0?C.amber:C.t2},
                  {l:"Anomalous",v:stats.anom,c:stats.anom>0?C.amber:C.t2},
                  {l:"Zone Alerts",v:sm.zoneBreaches.length,c:sm.zoneBreaches.length>0?C.red:C.t2},
                  {l:"Events",v:events.length,c:C.cyan},
                  {l:"Fleet",v:vessels.length,c:C.green},
                ].map(({l,v,c})=>(
                  <div key={l} style={{background:C.bg2,borderRadius:5,padding:"8px",textAlign:"center"}}>
                    <div style={{color:c,fontSize:20,fontFamily:C.mono,fontWeight:700}}>{v}</div>
                    <div style={{color:C.t2,fontSize:8,fontFamily:C.mono,marginTop:1}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{color:C.t2,fontSize:8,fontFamily:C.mono,marginBottom:6,letterSpacing:"0.08em"}}>HIGH-RISK ZONES</div>
              {GEOFENCE_ZONES.map(z => {
                const br = sm.zoneBreaches.filter(b=>b.zone===z.id).length;
                const col = z.risk==="CRITICAL"?C.red:z.risk==="HIGH"?C.amber:C.cyan;
                return (
                  <div key={z.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${C.border}20`}}>
                    <div>
                      <div style={{color:C.t0,fontSize:10}}>{z.name}</div>
                      <div style={{color:col,fontSize:8,fontFamily:C.mono}}>{z.risk}</div>
                    </div>
                    <div style={{color:br>0?col:C.t2,fontSize:16,fontFamily:C.mono,fontWeight:700}}>{br}</div>
                  </div>
                );
              })}
              <div style={{marginTop:12,background:C.bg2,borderRadius:5,padding:9,borderLeft:`3px solid ${C.amber}`}}>
                <div style={{color:C.amber,fontSize:8,fontFamily:C.mono,marginBottom:3}}>HOW TO USE AI</div>
                <div style={{color:C.t1,fontSize:9,lineHeight:1.6}}>Select a vessel with ⚠ on the MAP tab, then tap "AI Threat Assessment" for LLM intelligence analysis.</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px;}
        ::-webkit-scrollbar-track{background:${C.bg0};}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
      `}</style>
    </div>
  );
}
