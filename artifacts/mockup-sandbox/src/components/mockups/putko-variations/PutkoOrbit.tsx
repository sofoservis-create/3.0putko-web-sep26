import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, Heart, MapPin, Search, Star, Users, X } from "lucide-react";

const destinations = ["Tatry", "Liptov", "Bratislava", "Slovenský raj"];
const stays = [
  { name: "Drevenica pod lesom", place: "Ždiar, Vysoké Tatry", rating: "4,9" },
  { name: "Domček medzi stromami", place: "Banská Štiavnica", rating: "4,8" },
];

export default function PutkoOrbit() {
  const [destination, setDestination] = useState("");
  const [guests, setGuests] = useState("2 hostia");
  const [activeStay, setActiveStay] = useState(0);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");
  const [openGuests, setOpenGuests] = useState(false);
  const suggestions = useMemo(() => destinations.filter((item) => item.toLowerCase().includes(destination.toLowerCase())), [destination]);

  const submit = () => {
    setNotice(destination ? `Hľadáme pobyty v destinácii ${destination}.` : "Vyberte si miesto, kam chcete utiecť.");
    window.setTimeout(() => setNotice(""), 3200);
  };

  return (
    <div className="putko-orbit">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap');
        .putko-orbit{min-height:100dvh;background:#f7f5ef;color:#16332b;font-family:'DM Sans',sans-serif;overflow:hidden}
        .putko-orbit *{box-sizing:border-box}.orbit-shell{min-height:100dvh;display:grid;grid-template-columns:90px minmax(0,1fr);max-width:1540px;margin:0 auto}
        .orbit-rail{background:#e2eee7;border-right:1px solid #cbded3;display:flex;flex-direction:column;align-items:center;padding:28px 0 24px;justify-content:space-between}
        .orbit-mark{width:42px;height:42px;border-radius:14px;background:#1e725d;color:#f7f5ef;display:grid;place-items:center;font:700 22px 'Fraunces';letter-spacing:-.08em}
        .rail-stack{display:flex;flex-direction:column;gap:23px;align-items:center}.rail-line{height:1px;width:24px;background:#abcabd}
        .rail-link{writing-mode:vertical-rl;transform:rotate(180deg);color:#5f8478;font-size:10px;letter-spacing:.14em;text-transform:uppercase}.rail-link.active{color:#16332b;font-weight:700}
        .rail-dot{width:8px;height:8px;border-radius:50%;background:#d48761}.rail-year{font-size:10px;color:#72988c;writing-mode:vertical-rl;letter-spacing:.18em}
        .orbit-content{display:grid;grid-template-rows:auto 1fr;min-width:0}.orbit-top{height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(24px,5vw,78px);border-bottom:1px solid #e1e3da}
        .wordmark{display:flex;align-items:center;gap:9px;font:600 21px 'Fraunces';letter-spacing:-.03em}.wordmark i{width:9px;height:9px;border-radius:50%;background:#d48761;display:inline-block}
        .top-nav{display:flex;align-items:center;gap:28px;font-size:12px;color:#668078}.top-nav button{border:0;background:none;font:inherit;color:inherit;cursor:pointer}.top-nav button:hover{color:#1e725d}.lang{display:flex;align-items:center;gap:6px;color:#16332b!important;font-weight:700}
        .hero-grid{display:grid;grid-template-columns:minmax(480px,.9fr) minmax(440px,1.1fr);padding:clamp(32px,6vw,90px) clamp(24px,5vw,78px) 46px;gap:clamp(36px,7vw,120px);align-items:center}
        .eyebrow{display:flex;align-items:center;gap:12px;color:#bb6847;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin-bottom:25px}.eyebrow span{width:40px;height:1px;background:#d48761}
        h1{font:600 clamp(54px,6.7vw,104px)/.92 'Fraunces';letter-spacing:-.065em;margin:0;max-width:720px}h1 em{font-style:italic;color:#277e67;font-weight:500}
        .intro{font-size:16px;line-height:1.65;color:#688077;max-width:430px;margin:27px 0 30px}
        .search-card{position:relative;background:#fffdf8;border:1px solid #d8e1d9;border-radius:18px;box-shadow:0 18px 44px #315e4d12;padding:9px;max-width:650px;display:grid;grid-template-columns:1.24fr .84fr .65fr auto;align-items:stretch}
        .search-field{position:relative;min-width:0;padding:12px 14px;border-right:1px solid #e1e7e0;cursor:text}.search-field:last-of-type{border:0}.field-label{display:block;color:#91a49b;font-size:10px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;font-weight:700}.field-value{border:0;outline:0;background:transparent;width:100%;font:500 13px 'DM Sans';color:#244a3e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.field-icon{color:#d48761;vertical-align:-3px;margin-right:5px}
        .search-submit{border:0;border-radius:13px;background:#de8b64;color:#fffdf8;padding:0 18px;font-weight:700;cursor:pointer;transition:transform .2s,background .2s}.search-submit:hover{transform:translateY(-2px);background:#c97451}.suggestions{position:absolute;z-index:5;left:8px;right:8px;top:80px;background:#fffdf8;border:1px solid #d8e1d9;border-radius:12px;padding:7px;box-shadow:0 15px 30px #315e4d20}.suggestions button{width:100%;padding:10px;text-align:left;border:0;background:none;color:#486d60;border-radius:7px;cursor:pointer}.suggestions button:hover{background:#edf5f0}
        .mini-proof{display:flex;align-items:center;gap:12px;margin-top:30px;color:#769087;font-size:12px}.faces{display:flex}.face{width:25px;height:25px;border-radius:50%;border:2px solid #f7f5ef;display:grid;place-items:center;font-size:9px;font-weight:700;color:#fff;margin-left:-6px}.face:first-child{margin:0;background:#d58f6f}.face:nth-child(2){background:#749b8b}.face:nth-child(3){background:#9c7a61}
        .visual-wrap{position:relative;min-height:540px}.visual-card{height:clamp(470px,60vh,665px);border-radius:38% 38% 18px 18px;overflow:hidden;position:relative;background:#d6e5da}.visual-card:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#17352b00 55%,#16332b7a 100%)}.cabin-img{width:100%;height:100%;object-fit:cover;display:block;mix-blend-mode:multiply;opacity:.92}
        .visual-copy{position:absolute;bottom:27px;left:30px;right:30px;z-index:2;color:#fffdf8;display:flex;justify-content:space-between;align-items:flex-end}.visual-copy h2{font:500 29px/1.05 'Fraunces';margin:5px 0}.visual-copy p{font-size:12px;margin:0;color:#e8f0e9}.heart{width:42px;height:42px;border-radius:50%;border:1px solid #ffffff55;background:#ffffff1b;color:#fffdf8;display:grid;place-items:center;cursor:pointer}.heart.saved{background:#de8b64;border-color:#de8b64}
        .orbit-tag{position:absolute;top:34px;left:-30px;background:#f6c675;padding:13px 17px;border-radius:13px;z-index:3;font-size:11px;font-weight:700;color:#554631;box-shadow:0 9px 20px #6c533522;transform:rotate(-4deg)}.orbit-tag strong{display:block;font:600 23px 'Fraunces';margin-top:2px}
        .stay-dock{position:absolute;bottom:-26px;right:-27px;background:#fffdf8;border:1px solid #dde5dc;border-radius:17px;padding:14px;width:215px;z-index:3;box-shadow:0 15px 35px #315e4d1c}.dock-top{display:flex;justify-content:space-between;font-size:10px;color:#8aa096;text-transform:uppercase;letter-spacing:.08em}.dock-name{font:600 16px 'Fraunces';margin:11px 0 6px}.dock-meta{font-size:11px;color:#759087;display:flex;justify-content:space-between}.dock-dots{display:flex;gap:4px;margin-top:13px}.dock-dots button{border:0;width:19px;height:3px;background:#d6e2d9;cursor:pointer}.dock-dots button.active{background:#d48761}
        .lower-strip{padding:0 clamp(24px,5vw,78px) 28px;display:flex;justify-content:space-between;gap:24px;align-items:center}.lower-strip p{font-size:11px;color:#85a095;margin:0}.lower-stats{display:flex;gap:32px;color:#58796e}.lower-stats strong{font:600 22px 'Fraunces';color:#1e725d;margin-right:4px}.toast{position:fixed;bottom:25px;left:50%;transform:translateX(-50%);background:#16332b;color:#fffdf8;padding:12px 18px;border-radius:10px;font-size:12px;z-index:10}
        @media(max-width:900px){.orbit-shell{grid-template-columns:1fr}.orbit-rail{display:none}.orbit-top{height:66px;padding:0 20px}.top-nav{gap:13px}.top-nav button:nth-child(-n+2){display:none}.hero-grid{grid-template-columns:1fr;padding:38px 20px 60px;gap:42px}.visual-wrap{min-height:410px}.visual-card{height:470px}.orbit-tag{left:-6px}.stay-dock{right:-4px}.lower-strip{padding:0 20px 25px}.lower-stats{gap:15px}.lower-stats strong{font-size:18px}}
        @media(max-width:560px){h1{font-size:55px}.intro{font-size:14px}.search-card{grid-template-columns:1fr 1fr}.search-field:nth-child(2){border-right:0}.search-field:nth-child(3){border-top:1px solid #e1e7e0;border-right:0}.search-submit{min-height:49px;margin:5px}.wordmark{font-size:19px}.visual-card{height:420px}.visual-wrap{min-height:365px}.lower-strip{display:block}.lower-stats{margin-top:15px}.orbit-top{padding:0 18px}}
      `}</style>
      <div className="orbit-shell">
        <aside className="orbit-rail"><div className="orbit-mark">P.</div><div className="rail-stack"><span className="rail-dot"/><span className="rail-link active">Objavovať</span><span className="rail-line"/><span className="rail-link">Hostitelia</span><span className="rail-line"/><span className="rail-link">O Putku</span></div><span className="rail-year">SK · 2024</span></aside>
        <div className="orbit-content">
          <header className="orbit-top"><div className="wordmark"><i/>putko</div><nav className="top-nav"><button onClick={() => setNotice("Tip: skúste Tatry alebo Liptov.")}>Inšpirácie</button><button onClick={() => setNotice("Naši hostitelia tvoria miesta s príbehom.")}>Pre hostiteľov</button><button className="lang" onClick={() => setNotice("Jazyk: slovenčina")}><span>SK</span><ChevronDown size={13}/></button><button aria-label="Profil" onClick={() => setNotice("Prihlásenie bude čoskoro pripravené.")}><Users size={18}/></button></nav></header>
          <main>
            <div className="hero-grid">
              <section>
                <div className="eyebrow"><span/> pobyty s príbehom</div>
                <h1>Miesta, kde sa<br/><em>dobre strácať.</em></h1>
                <p className="intro">Od tichých chát pod Tatrami po domy medzi stromami. Nájdite pobyt, ktorý vás na chvíľu vytrhne z bežného dňa.</p>
                <div className="search-card">
                  <label className="search-field"><span className="field-label"><MapPin size={12} className="field-icon"/>Kam idete?</span><input className="field-value" value={destination} onChange={(e) => setDestination(e.target.value)} onFocus={() => setDestination(destination)} placeholder="Mesto, región alebo názov"/></label>
                  <label className="search-field"><span className="field-label"><CalendarDays size={12} className="field-icon"/>Kedy?</span><span className="field-value">Vyberte termín</span></label>
                  <button className="search-field" onClick={() => setOpenGuests(!openGuests)}><span className="field-label"><Users size={12} className="field-icon"/>Hostia</span><span className="field-value">{guests}</span></button>
                  <button className="search-submit" onClick={submit} aria-label="Hľadať"><Search size={19}/></button>
                  {destination && <div className="suggestions">{suggestions.length ? suggestions.map((item) => <button key={item} onClick={() => setDestination(item)}><MapPin size={13} style={{verticalAlign:"-2px",marginRight:7}}/>{item}</button>) : <button onClick={() => setDestination("")}><X size={13} style={{verticalAlign:"-2px",marginRight:7}}/>Skúste iné miesto</button>}</div>}
                  {openGuests && <div className="suggestions" style={{left:"43%",right:"20%"}}><button onClick={() => {setGuests("1 hosť");setOpenGuests(false)}}>1 hosť</button><button onClick={() => {setGuests("2 hostia");setOpenGuests(false)}}>2 hostia</button><button onClick={() => {setGuests("4 hostia");setOpenGuests(false)}}>4 hostia</button></div>}
                </div>
                <div className="mini-proof"><div className="faces"><span className="face">M</span><span className="face">J</span><span className="face">K</span></div><span><strong style={{color:"#1e725d"}}>4,8</strong> z viac než 1 200 hodnotení</span><Star size={14} fill="#e2a552" color="#e2a552"/></div>
              </section>
              <section className="visual-wrap">
                <div className="orbit-tag">ušetríte priemerne<strong>€23</strong></div>
                <div className="visual-card"><img className="cabin-img" src="/__mockup/images/putko-orbit-cabin.png" alt="Drevenica v lese"/><div className="visual-copy"><div><p>TIP PUTKO · VYSOKÉ TATRY</p><h2>Ráno s výhľadom,<br/>večer pri ohni.</h2></div><button className={`heart ${saved ? "saved":""}`} onClick={() => setSaved(!saved)} aria-label="Uložiť"><Heart size={18} fill={saved ? "currentColor":"none"}/></button></div></div>
                <div className="stay-dock"><div className="dock-top"><span>Práve objavujete</span><ArrowRight size={14}/></div><div className="dock-name">{stays[activeStay].name}</div><div className="dock-meta"><span>{stays[activeStay].place}</span><span><Star size={11} fill="#d48761" color="#d48761" style={{verticalAlign:"-1px"}}/> {stays[activeStay].rating}</span></div><div className="dock-dots">{stays.map((stay, i) => <button key={stay.name} className={i === activeStay ? "active":""} onClick={() => setActiveStay(i)} aria-label={`Pobyt ${i+1}`}/>)}</div></div>
              </section>
            </div>
            <div className="lower-strip"><p>Nie je to len ubytovanie. Je to dôvod vyraziť.</p><div className="lower-stats"><span><strong>441+</strong> overených pobytov</span><span><strong>0 €</strong> servisný poplatok</span></div></div>
          </main>
        </div>
      </div>
      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}