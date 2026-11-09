(function(){
  "use strict";
  const SITES = window.SITES || [];
  const DAYS = window.ROUTE_DAYS || [];
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
  const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  const norm = s => (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const esc = s => String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;");

  const state = {
    country: "Todos",
    query: "",
    onlyFilm: false,
    activeId: null,
    tour: false,
    tourIndex: 0,
    tourTimer: null
  };

  const countries = [...new Set(SITES.map(s=>s.country))];
  const byId = new Map(SITES.map((s,i)=>[s.id,{...s,_index:i}]));
  const ordered = SITES.map((s,i)=>({...s,_index:i}));

  const listEl = $("#list");
  const filtersEl = $("#filters");
  const countEl = $("#count");

  function chip(label, country){
    const b=document.createElement("button");
    b.className="chip"+(state.country===country?" active":"");
    b.textContent=label;
    b.dataset.country=country;
    b.addEventListener("click",()=>{
      state.country=country;
      $$(".chip",filtersEl).forEach(c=>c.classList.toggle("active",c.dataset.country===country));
      renderList();
      renderMarkers();
    });
    return b;
  }
  filtersEl.appendChild(chip("Todos","Todos"));
  countries.forEach(c=>filtersEl.appendChild(chip(c,c)));

  function visibleSites(){
    const q=norm(state.query);
    return ordered.filter(s=>{
      if(state.country!=="Todos" && s.country!==state.country) return false;
      if(state.onlyFilm && !s.filmSpot) return false;
      if(!q) return true;
      return norm([s.name,s.region,s.country,s.hook,s.history,...(s.extra||[]),...(s.films||[]).map(f=>f.t)].join(" ")).includes(q);
    });
  }

  function renderList(){
    const items=visibleSites();
    countEl.textContent=items.length+(items.length===1?" parada":" paradas");
    listEl.innerHTML="";
    if(!items.length){
      listEl.innerHTML='<div class="empty">No hay paradas con ese filtro.<br>Prueba otra búsqueda o vuelve a «Todos».</div>';
      return;
    }
    items.forEach(s=>{
      const card=document.createElement("button");
      card.className="site-card"+(state.activeId===s.id?" active":"");
      card.dataset.id=s.id;
      card.innerHTML =
        '<span class="sc-thumb"><img src="'+s.image+'" alt="'+esc(s.name)+'" loading="lazy" onerror="this.onerror=null;this.src=\'img/placeholder.svg\'"><span class="n">'+String(s._index+1).padStart(2,"0")+'</span></span>' +
        '<span class="sc-main"><span class="sc-name">'+s.name+'</span><span class="sc-meta">'+s.flag+' '+s.country+' · '+s.date+'</span><span class="sc-hook">'+s.hook+'</span></span>' +
        '<span class="sc-film">'+(s.filmSpot?'🎬':'')+'</span>';
      card.addEventListener("click",()=>openSite(s.id,{fly:true}));
      listEl.appendChild(card);
    });
  }

  const map=L.map("map",{zoomControl:true,zoomSnap:0.5,minZoom:3,maxZoom:16,worldCopyJump:false}).setView([52.2,-3.2],5);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19,
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · ruta propia'
  }).addTo(map);

  const routeLayer=L.layerGroup().addTo(map);
  const markerLayer=L.layerGroup().addTo(map);
  const markerById=new Map();
  const dayLayers=new Map();
  const allBounds=L.latLngBounds([]);

  function styleFor(day){
    return day.reconstructed
      ? {color:"#7a6a58",weight:2.4,opacity:.85,dashArray:"6 8",lineCap:"round"}
      : {color:"#b4472c",weight:3,opacity:.8,lineCap:"round",lineJoin:"round"};
  }

  function fmtDay(date){
    const d=new Date(date.slice(0,10)+"T12:00:00");
    return d.getDate()+" "+MONTHS[d.getMonth()];
  }

  function makeIcon(s,i,small){
    if(small){
      return L.divIcon({className:"",html:'<div class="stop-dot'+(s.detour?" detour":"")+(state.activeId===s.id?" active":"")+'" data-id="'+s.id+'"></div>',iconSize:[12,12],iconAnchor:[6,6]});
    }
    return L.divIcon({
      className:"",
      html:'<div class="stop-pin'+(s.detour?" detour":"")+(state.activeId===s.id?" active":"")+'" data-id="'+s.id+'">'+String(i+1).padStart(2,"0")+'</div>',
      iconSize:[30,30],iconAnchor:[15,15]
    });
  }

  function updateMarkerIcons(){
    const small=map.getZoom()<6;
    markerById.forEach((m,id)=>{const s=byId.get(id); if(s) m.setIcon(makeIcon(s,s._index,small));});
  }

  function addRoute(){
    DAYS.forEach(day=>{
      if(!day.coords || day.coords.length<2) return;
      const casing=L.polyline(day.coords,{color:"#fffdf8",weight:day.reconstructed?5:6,opacity:.55,lineCap:"round"}).addTo(routeLayer);
      const line=L.polyline(day.coords,styleFor(day)).addTo(routeLayer);
      line.bindTooltip(day.label+(day.km?" · "+day.km+" km":""),{sticky:true,className:"route-tip",direction:"top"});
      line.on("mouseover",()=>{line.setStyle({weight:6,color:"#1f4d3a",opacity:1});line.bringToFront();});
      line.on("mouseout",()=>{line.setStyle(styleFor(day));});
      dayLayers.set(day.date,{line,casing,day});
      day.coords.forEach(c=>allBounds.extend(c));
    });
    ordered.forEach((s,i)=>{
      const m=L.marker(s.coords,{icon:makeIcon(s,i),title:s.name,riseOnHover:true}).addTo(markerLayer);
      m.bindTooltip(s.name,{direction:"top",offset:[0,-15],className:"stop-tip"});
      m.on("click",()=>openSite(s.id,{fly:true}));
      markerById.set(s.id,m);
      allBounds.extend(s.coords);
    });
  }

  function renderMarkers(){
    const ids=new Set(visibleSites().map(s=>s.id));
    markerById.forEach((m,id)=>{
      if(ids.has(id)){ if(!markerLayer.hasLayer(m)) markerLayer.addLayer(m); }
      else if(markerLayer.hasLayer(m)) markerLayer.removeLayer(m);
    });
    $$(".stop-pin,.stop-dot").forEach(el=>el.classList.toggle("active",el.dataset.id===state.activeId));
  }

  function fitAll(){
    if(allBounds.isValid()) map.fitBounds(allBounds,{padding:[40,40]});
  }

  const daysEl=$("#days");
  DAYS.forEach(day=>{
    if(day.date.endsWith("b")) return;
    const b=document.createElement("button");
    b.className="day";
    b.innerHTML="<b>"+fmtDay(day.date)+"</b>"+(day.km?day.km+" km":(day.reconstructed?"ferry":"etapa"));
    b.title=day.label;
    b.addEventListener("click",()=>{
      $$(".day",daysEl).forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      const entry=dayLayers.get(day.date);
      if(entry){
        const bounds=L.latLngBounds(entry.day.coords);
        map.fitBounds(bounds,{padding:[50,50],maxZoom:9});
        entry.line.setStyle({weight:6,color:"#1f4d3a",opacity:1});
        entry.line.bringToFront();
        setTimeout(()=>entry.line.setStyle(styleFor(entry.day)),2600);
      }
    });
    daysEl.appendChild(b);
  });

  const detail=$("#detail");
  const heroImg=$("#heroImg");

  function openSite(id,opts={}){
    const s=byId.get(id); if(!s) return;
    state.activeId=id;
    if(!opts.keepTour) stopTour(false);
    heroImg.src=s.image;
    heroImg.alt=s.name;
    heroImg.onerror=()=>{heroImg.onerror=null;heroImg.src="img/placeholder.svg";};
    $("#heroNum").textContent=String(s._index+1).padStart(2,"0");
    $("#heroCountry").textContent=s.flag+" "+s.country;
    $("#heroKicker").textContent=s.date+" · "+s.region;
    $("#heroTitle").textContent=s.name;
    $("#heroHook").textContent=s.hook;
    $("#meta").innerHTML=[
      s.category,
      s.detour?"Desvío":"Parada "+(s._index+1)+" de "+SITES.length,
      s.filmSpot?"Con rodajes":""
    ].filter(Boolean).map(x=>"<span>"+x+"</span>").join("");
    $("#history").textContent=s.history;
    $("#extra").innerHTML=(s.extra||[]).map(x=>"<li>"+x+"</li>").join("");
    const filmWrap=$("#films");
    if(s.films && s.films.length){
      filmWrap.innerHTML=s.films.map(f=>'<div class="film"><div class="yr">'+f.y+'</div><div><div class="t">'+f.t+'</div><div class="note">'+f.note+'</div></div></div>').join("");
    }else{
      filmWrap.innerHTML='<div class="filmnone">'+(s.filmNote||"Sin rodajes conocidos en este lugar.")+'</div>';
    }
    $("#mapsLink").href="https://www.google.com/maps/search/?api=1&query="+s.coords[0]+","+s.coords[1];
    $("#wikiLink").href=s.wiki||"#";
    detail.classList.add("open");
    detail.setAttribute("aria-hidden","false");
    document.body.classList.add("detail-open");
    $(".detail-scroll",detail).scrollTop=0;
    $$(".site-card").forEach(c=>c.classList.toggle("active",c.dataset.id===id));
    $$(".stop-pin,.stop-dot").forEach(el=>el.classList.toggle("active",el.dataset.id===id));
    if(opts.fly){
      const targetZoom=Math.max(map.getZoom(),7);
      map.flyTo(s.coords,targetZoom,{duration:1.1});
      if(window.innerWidth>900) setTimeout(()=>map.panBy([-150,0],{animate:true}),1150);
    }
    if(opts.updateHash!==false) history.replaceState(null,"","#"+id);
    $("#prevBtn").disabled=s._index===0;
    $("#nextBtn").disabled=s._index===SITES.length-1;
    if(opts.scrollList!==false){
      const card=$('.site-card[data-id="'+id+'"]');
      if(card) card.scrollIntoView({block:"nearest",behavior:"smooth"});
    }
  }

  function closeDetail(){
    detail.classList.remove("open");
    detail.setAttribute("aria-hidden","true");
    document.body.classList.remove("detail-open");
    state.activeId=null;
    $$(".stop-pin,.stop-dot").forEach(el=>el.classList.remove("active"));
    $$(".site-card").forEach(el=>el.classList.remove("active"));
    history.replaceState(null,"",location.pathname+location.search);
  }

  $("#closeBtn").addEventListener("click",closeDetail);
  $("#prevBtn").addEventListener("click",()=>{
    const s=byId.get(state.activeId); if(s&&s._index>0) openSite(SITES[s._index-1].id,{fly:true});
  });
  $("#nextBtn").addEventListener("click",()=>{
    const s=byId.get(state.activeId); if(s&&s._index<SITES.length-1) openSite(SITES[s._index+1].id,{fly:true});
  });

  $("#search").addEventListener("input",e=>{
    state.query=e.target.value;
    renderList(); renderMarkers();
  });
  $("#onlyFilm").addEventListener("change",e=>{
    state.onlyFilm=e.target.checked;
    renderList(); renderMarkers();
  });
  $("#fitBtn").addEventListener("click",fitAll);

  const playBtn=$("#playBtn");
  function stopTour(silent){
    state.tour=false;
    clearTimeout(state.tourTimer);
    playBtn.innerHTML='<span class="play-ico">▶</span> Recorrer la ruta';
    playBtn.classList.add("primary");
  }
  function tourStep(){
    if(!state.tour) return;
    if(state.tourIndex>=SITES.length){
      stopTour(true);
      fitAll();
      return;
    }
    const s=SITES[state.tourIndex++];
    openSite(s.id,{fly:true,scrollList:true,keepTour:true});
    state.tourTimer=setTimeout(tourStep,3600);
  }
  playBtn.addEventListener("click",()=>{
    if(state.tour){ stopTour(false); return; }
    state.tour=true; state.tourIndex=0;
    playBtn.innerHTML='<span class="play-ico">❚❚</span> Pausar recorrido';
    playBtn.classList.remove("primary");
    tourStep();
  });

  const about=$("#about");
  function openAbout(){about.classList.add("open");about.setAttribute("aria-hidden","false");}
  function closeAbout(){about.classList.remove("open");about.setAttribute("aria-hidden","true");}
  $("#aboutBtn").addEventListener("click",openAbout);
  $("#aboutClose").addEventListener("click",closeAbout);
  $("#aboutOk").addEventListener("click",closeAbout);
  about.addEventListener("click",e=>{if(e.target===about) closeAbout();});

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
      if(about.classList.contains("open")) closeAbout();
      else if(detail.classList.contains("open")) closeDetail();
      return;
    }
    if(!detail.classList.contains("open")) return;
    if(e.key==="ArrowRight"||e.key==="ArrowDown"){
      e.preventDefault();
      const s=byId.get(state.activeId); if(s&&s._index<SITES.length-1) openSite(SITES[s._index+1].id,{fly:true});
    }
    if(e.key==="ArrowLeft"||e.key==="ArrowUp"){
      e.preventDefault();
      const s=byId.get(state.activeId); if(s&&s._index>0) openSite(SITES[s._index-1].id,{fly:true});
    }
  });

  addRoute();
  map.on("zoomend",updateMarkerIcons);
  updateMarkerIcons();
  renderList();
  renderMarkers();
  fitAll();
  if(window.innerWidth<=820) map.setView([53.4,-3.4],5.5);
  setTimeout(()=>{const h=$("#hint"); if(h) h.classList.add("hide");},9000);
  const hash=location.hash.replace("#","");
  if(hash && byId.has(hash)) setTimeout(()=>openSite(hash,{fly:true,updateHash:false}),400);
})();
