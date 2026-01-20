/* assets/app.js - fixed */
(function(){
  'use strict';

  // prefer runtime SITE_BASE if set by layout, otherwise fallback to literal (keeps previous behavior)
  const SITE_BASE = (typeof window !== 'undefined' && window.SITE_BASE) ? window.SITE_BASE : '/';

  const qs = (s,p=document)=>p.querySelector(s);
  const qsa = (s,p=document)=>Array.from((p||document).querySelectorAll(s));

  function resolveUrl(u){
    if(!u) return u;
    u = String(u).trim();
    if(/^https?:\/\//i.test(u)) return u;
    if(!u.startsWith('/')) u = '/' + u;
    if(!SITE_BASE) return u;
    return (SITE_BASE + u).replace(/\/{2,}/g,'/');
  }

  async function fetchJson(path){
    try {
      const url = resolveUrl(path);
      const res = await fetch(url, {cache:'no-store'});
      if(!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch(err){
      console.warn('fetchJson', err, path);
      return [];
    }
  }

  // simple spinner renderer (for cards / category pages)
  function showSpinner(container){
    if(!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
  }
  

  function escapeHtml(str){ return String(str||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'" :'&#39;'}[c])); }
  function safe(x){ return x==null ? '' : x; }
  function cleanDesc(s){
    if(!s) return '';
    let t = String(s).replace(/<\s*br\s*\/?>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    if(t.length <= 140) return t;
    const cut = t.lastIndexOf(' ', 120) || 120;
    return t.slice(0,cut) + '...';
  }

  function normalize(arr){
    if(!Array.isArray(arr)) return [];
    return arr.map(it=>({
      title: String(it.title || '').trim(),
      author: String(it.author || it.writer || '').trim(),
      seller: String(it.seller || '').trim(),
      img: String(it.img || it.image || '').trim(),
      desc: cleanDesc(it.desc || it.description || ''),
      link: String(it.link || it.url || '#').trim()
    }));
  }

  // Deterministic shuffle that changes order once per hour (per key)
  function hourlyShuffle(list, key){
    if(!Array.isArray(list) || !list.length) return list || [];
    const stamp = new Date();
    const hourStamp = stamp.getUTCFullYear() + '-' +
      String(stamp.getUTCMonth()+1).padStart(2,'0') + '-' +
      String(stamp.getUTCDate()).padStart(2,'0') + '-' +
      String(stamp.getUTCHours()).padStart(2,'0');
    const seedStr = String(key || 'default') + '|' + hourStamp;

    let h = 0;
    for(let i=0;i<seedStr.length;i++){
      h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
    }
    let seed = h >>> 0;
    function rand(){
      // simple LCG
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    const arr = list.slice();
    for(let i=arr.length-1;i>0;i--){
      const j = Math.floor(rand() * (i+1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function createCard(item){
    const title = safe(item.title);
    const author = safe(item.author || '');
    const seller = safe(item.seller || '');
    const desc = cleanDesc(item.desc || '');
    const img = safe(item.img);
    const link = safe(item.link || '#');

    const article = document.createElement('article');
    article.className = 'card';
    article.innerHTML = `
      <div class="card-content">
        <div class="media">${ img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" width="260" height="260">` : '<div class="no-image">No image</div>' }</div>
        <div class="body">
          <h4 class="title">${escapeHtml(title)}</h4>
          <div class="meta">${author ? 'লেখক: '+escapeHtml(author) : ''} ${seller ? ' • বিক্রেতা: '+escapeHtml(seller) : ''}</div>
          <p class="desc">${escapeHtml(desc)}</p>
          <div class="card-bottom">
            <div class="discount-text">ডিসকাউন্ট পেতে এখানে কিনুন</div>
            <a class="btn" href="${escapeHtml(link)}" target="_blank" rel="noopener">Buy Now</a>
          </div>
        </div>
      </div>
    `;
    return article;
  }

  function setupHeader(){
    const searchInput = qs('#header-search-input');
    const resultsContainer = qs('#header-search-results');
    const clearBtn = qs('#search-clear');
    const lens = qs('#search-lens');
    const hamburger = qs('.hamburger');
    const menuLinks = qs('.menu-links');

    const categories = [
      {key:'best-seller',label:'Best Seller',href:'/rokomari-best-seller/'},
      {key:'books',label:'Books',href:'/rokomari-books/'},
      {key:'electronics',label:'Electronics',href:'/rokomari-electronics/'},
      {key:'gorer-bazar',label:'Gorer Bazar',href:'/gorer-bazar/'},
      {key:'foods',label:'Foods',href:'/rokomari-foods/'},
      {key:'kids-toys',label:'Kids Toys',href:'/rokomari-kids-toys/'},
      {key:'baby-products',label:'Baby Products',href:'/rokomari-baby-products/'},
      {key:'beauty',label:'Beauty',href:'/rokomari-beauty/'},
      {key:'others',label:'Others',href:'/rokomari-others/'},
    ];

    // Only build menu from JS if HTML is empty (keeps SEO-friendly server HTML)
    if (menuLinks && !menuLinks.children.length) {
      menuLinks.innerHTML = '';
      const homeLi = document.createElement('li');
      homeLi.innerHTML = `<a href="${resolveUrl('/')}">Home</a>`;
      menuLinks.appendChild(homeLi);
      categories.forEach(c => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${resolveUrl(c.href)}">${escapeHtml(c.label)}</a>`;
        menuLinks.appendChild(li);
      });
    }

    if (hamburger && menuLinks) {
      const CLOSED_ICON = '☰';
      const OPEN_ICON = '✕';

      function openMenu() {
        menuLinks.classList.add('active');
        hamburger.classList.add('is-open');
        hamburger.setAttribute('aria-expanded', 'true');
        hamburger.textContent = OPEN_ICON;
      }

      function closeMenu() {
        menuLinks.classList.remove('active');
        hamburger.classList.remove('is-open');
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.textContent = CLOSED_ICON;
      }

      // initial state
      closeMenu();

      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menuLinks.classList.contains('active')) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      // close when clicking outside
      document.addEventListener('click', (e) => {
        if (
          menuLinks.classList.contains('active') &&
          !e.target.closest('.menu-links') &&
          !e.target.closest('.hamburger')
        ) {
          closeMenu();
        }
      });

      // if user rotates or resizes to desktop, just close menu
      window.addEventListener('resize', () => {
        if (window.innerWidth > 900 && menuLinks.classList.contains('active')) {
          closeMenu();
        }
      });
    }

    // --- SEARCH: auto-index all /data/*.json using data/index.json ---
    let localIndex = [];
    (async ()=>{
      try{
        const indexList = await fetchJson('/data/index.json');
        const paths = Array.isArray(indexList)
          ? indexList
              .filter(it => it && it.name !== 'index.json')
              .map(it => it.path || it)
          : [];

        const fetched = await Promise.all(paths.map(p => fetchJson(p)));
        const merged = fetched.flat();
        const normalized = normalize(merged);

        const map = new Map();
        normalized.forEach(item=>{
          const key = (item.link || item.title).toString();
          if(!map.has(key)) map.set(key, item);
        });
        localIndex = Array.from(map.values());
      } catch(err){
        console.warn('search index load failed', err);
        localIndex = [];
      }
    })();

    let timer;
    if(searchInput){
      searchInput.addEventListener('input', function(){
        clearTimeout(timer);
        const q = this.value.trim();
        if(!q){
          if(resultsContainer) resultsContainer.style.display='none';
          if(clearBtn) clearBtn.style.display='none';
          if(lens) lens.style.display='block';
          return;
        }
        if(clearBtn) clearBtn.style.display='block';
        if(lens) lens.style.display='none';
        timer = setTimeout(()=>{
          const matches = localIndex.length ? localIndex.filter(it => (it.title + ' ' + (it.author||'') + ' ' + (it.seller||'')).toLowerCase().includes(q.toLowerCase())) : [];
          const seen = new Set();
          const unique = [];
          matches.forEach(m=>{
            const id = m.link || m.title;
            if(!seen.has(id)){ seen.add(id); unique.push(m); }
          });
          resultsContainer.innerHTML = '';
          if(!unique.length){
            resultsContainer.innerHTML = `<div class="no-result-box" style="padding:16px;text-align:center;color:#6b7280"><p>কোনো প্রোডাক্ট পাওয়া যায়নি!</p><button class="request-btn-small" onclick="triggerRequest('${escapeHtml(q)}')">ডিসকাউন্ট রিকুয়েস্ট পাঠান</button></div>`;
          } else {
            unique.slice(0,10).forEach(m=>{
              const a = document.createElement('a'); a.className='result-item'; a.href = m.link || '#';
              const thumb = m.img ? `<img src="${escapeHtml(m.img)}" alt="">` : `<div style="width:64px;height:64px;background:#f4f6f7;border-radius:6px"></div>`;
              const meta = (m.author || m.seller) ? `<p>${escapeHtml(m.author || '')} ${m.author && m.seller ? ' • ' : ''}${escapeHtml(m.seller||'')}</p>` : '';
              a.innerHTML = `${thumb}<div class="result-info"><h4>${escapeHtml(m.title)}</h4>${meta}</div>`;
              a.target = '_blank'; a.rel = 'noopener';
              resultsContainer.appendChild(a);
            });
          }
          resultsContainer.style.display = 'block';
        }, 160);
      });

      if(clearBtn) clearBtn.addEventListener('click', ()=>{
        searchInput.value='';
        resultsContainer.style.display='none';
        clearBtn.style.display='none';
        if(lens) lens.style.display='block';
        searchInput.focus();
      });
      document.addEventListener('click', (e)=>{
        if(!e.target.closest('.search-box') && resultsContainer) resultsContainer.style.display='none';
      });
    }
  }

  function injectPageTitle(){
    // Disabled: Home title is now controlled via index.md H1
  }

  const MAX_HOME_ITEMS = 8;

  async function renderHome(){
    const root = document.createElement('div'); root.className = 'home-cats container';
    const cats = [
      { key:'best-seller', name:'Best Seller', file:'/data/best_seller.json', href:'/rokomari-best-seller/' },
      { key:'books', name:'Books', file:'/data/books.json', href:'/rokomari-books/' },
      { key:'electronics', name:'Electronics', file:'/data/electronics.json', href:'/rokomari-electronics/' },
      { key:'gorer-bazar', name:'Gorer Bazar', file:'/data/gorer-bazar.json', href:'/gorer-bazar/' },
      { key:'foods', name:'Foods', file:'/data/foods.json', href:'/rokomari-foods/' },
      { key:'kids-toys', name:'Kids Toys', file:'/data/kids-toys.json', href:'/rokomari-kids-toys/' },
      { key:'baby-products', name:'Baby Products', file:'/data/baby-products.json', href:'/rokomari-baby-products/' },
      { key:'beauty', name:'Beauty', file:'/data/beauty.json', href:'/rokomari-beauty/' },
      { key:'others', name:'Others', file:'/data/others.json', href:'/rokomari-others/' }
    ];

    for(const c of cats){
      const section = document.createElement('section');
      section.className='cat-row';
      section.dataset.key=c.key;
      section.dataset.name=c.name;

      const header = document.createElement('div'); header.className='cat-header';
      const nameText = `Rokomari Promocode For ${c.name}`;
      const titleEl = document.createElement('h3'); titleEl.innerHTML = `<span class="cat-name">${escapeHtml(nameText)}</span>`;
      header.appendChild(titleEl);

      const actions = document.createElement('div'); actions.className='cat-actions';
      const prev = document.createElement('button'); prev.className='cat-btn prev'; prev.innerHTML='&#x25C0;';
      const next = document.createElement('button'); next.className='cat-btn next'; next.innerHTML='&#x25B6;';
      actions.appendChild(prev); actions.appendChild(next);
      header.appendChild(actions);
      section.appendChild(header);

      const wrapper = document.createElement('div'); wrapper.className='cat-track-wrapper';
      const track = document.createElement('div'); track.className='cat-track';
      wrapper.appendChild(track);
      section.appendChild(wrapper);
      root.appendChild(section);

      (async function load(catDef, sec){
        const raw = await fetchJson(catDef.file);
        let items = normalize(raw);
        // Shuffle deterministically once per hour based on category key
        items = hourlyShuffle(items, catDef.key || catDef.name || 'home');
        sec._items = items;
        sec._track = track;
        sec._tx = 0;
        sec._loadedCount = 0;

        const batch = Math.max(1, 4);
        let idx = 0;
        const total = items.length;
        const first = Math.min(batch, total - idx);
        appendItemsToTrack(sec, idx, first);
        idx += first;
        sec._loadedCount = idx;

        next.addEventListener('click', ()=> onNextClick(sec, catDef));
        prev.addEventListener('click', ()=> slideCategory(sec, -1));

        // Save info for swipe as well
        sec._nextIndex = idx;
        sec._batchSize = batch;
        sec._catDef = catDef;

        enableSwipe(wrapper, sec);

        setTimeout(()=>updateButtonsVisibility(sec), 160);
      })(c, section);
    }

    // Prefer explicit anchor if present (so content in index.md can stay on top)
    const anchor = qs('#home-cards-anchor');

    if (anchor && anchor.parentNode) {
      // Insert the home sections right AFTER the anchor
      anchor.parentNode.insertBefore(root, anchor.nextSibling);
    } else {
      // Fallback to old behavior if no anchor exists
      const headerNode = qs('.modern-header');
      if (headerNode && headerNode.parentNode) {
        headerNode.parentNode.insertBefore(
          root,
          headerNode.nextSibling?.nextSibling || headerNode.nextSibling
        );
      } else {
        document.body.insertBefore(root, document.body.firstChild);
      }
    }
  }

  function appendItemsToTrack(section, startIndex, count){
    const track = section._track;
    const items = section._items || [];
    const slice = items.slice(startIndex, startIndex + count);
    slice.forEach((it, idx)=>{
      const wrap = document.createElement('div'); wrap.className='cat-item';
      const card = createCard(it);
      card.style.animationDelay = String((startIndex + idx) * 40) + 'ms';
      wrap.appendChild(card); track.appendChild(wrap);
    });
    section._loadedCount = (section._loadedCount || 0) + slice.length;
    if(section._loadedCount >= (section._items || []).length){
      addSeeMoreCard(section);
    }
    setTimeout(()=>updateButtonsVisibility(section), 120);
  }

  function addSeeMoreCard(section){
  if(!section || !section._track) return;
  if(section._track.querySelector('.cat-item.see-more')) return;

  const wrap = document.createElement('div'); 
  wrap.className = 'cat-item see-more';

  const key = section.dataset.key || '';
  const readable = section.dataset.name || key || 'আরও দেখুন';
  const map = {
    'best-seller': '/rokomari-best-seller/',
    'books': '/rokomari-books/',
    'electronics': '/rokomari-electronics/',
    'gorer-bazar': '/gorer-bazar/',
    'foods': '/rokomari-foods/',
    'kids-toys': '/rokomari-kids-toys/',
    'baby-products': '/rokomari-baby-products/',
    'beauty': '/rokomari-beauty/',
    'others': '/rokomari-others/'
  };
  const link = map[key] || ('/' + key + '/');

  const inner = document.createElement('div');
  inner.className = 'see-more-card';
  inner.innerHTML = `
    <div class="see-more-icon">➜</div>
    <h4 class="see-more-title">আরও দেখুন</h4>
    <p class="see-more-subtitle">
      ${escapeHtml(readable)} ক্যাটাগরির সব অফার একসাথে দেখতে ক্লিক করুন।
    </p>
    <a class="btn see-more-btn" href="${resolveUrl(link)}">
      See all ${escapeHtml(readable)}
    </a>
  `;

  wrap.appendChild(inner);
  section._track.appendChild(wrap);
}

  function onNextClick(section, catDef){
    const items = section._items || [];
    if(!items.length) return;

    const loaded = section._loadedCount || 0;
    const nextIdx = section._nextIndex || loaded || 0;

    // Only ever load up to MAX_HOME_ITEMS cards on home sections.
    if(nextIdx < items.length && loaded < MAX_HOME_ITEMS){
      const remainingAllowed = Math.max(0, MAX_HOME_ITEMS - loaded);
      const toAdd = Math.min(section._batchSize || 4, items.length - nextIdx, remainingAllowed);
      if(toAdd > 0){
        appendItemsToTrack(section, nextIdx, toAdd);
        section._nextIndex = nextIdx + toAdd;

        // If we've reached limit or the end of items, ensure the "See more" card exists
        if((section._loadedCount || 0) >= MAX_HOME_ITEMS || (section._loadedCount || 0) >= items.length){
          addSeeMoreCard(section);
        }

        setTimeout(()=> slideCategory(section, +1), 80);
        return;
      }
    }

    // Otherwise just slide among existing cards
    slideCategory(section, +1);
  }

  function getItemFullWidth(track){
    const gap = parseFloat(getComputedStyle(track).gap || 16);
    const first = track.children[0];
    if(!first) return 300 + gap;
    const w = first.getBoundingClientRect().width;
    return w + gap;
  }

  function getVisibleWidth(track){
    const wrapper = track.parentElement;
    return wrapper.getBoundingClientRect().width;
  }

  function computeVisibleCount(){
    const w = Math.max(window.innerWidth || 1024, 320);
    if (w < 600) return 1;
    if (w < 880) return 2;
    if (w < 1100) return 3;
    return 4;
  }

  function updateButtonsVisibility(section){
    if(!section || !section._track) return;
    const track = section._track;
    const items = Array.from(track.children);
    if(!items.length) return;
    const itemW = getItemFullWidth(track);
    const totalWidth = items.length * itemW;
    const visWidth = getVisibleWidth(track);
    const prevBtn = section.querySelector('.cat-btn.prev');
    const nextBtn = section.querySelector('.cat-btn.next');
    const curTx = track._tx || 0;
    const maxLeft = Math.max(0, totalWidth - visWidth);
    if(prevBtn) prevBtn.style.display = (Math.abs(curTx) > 0) ? 'flex' : 'none';
    if(nextBtn) nextBtn.style.display = (totalWidth > visWidth && Math.abs(curTx) < maxLeft) ? 'flex' : 'none';
  }

  function slideCategory(section, direction){
    const track = section._track;
    if(!track) return;
    const items = Array.from(track.children);
    if(!items.length) return;
    const itemW = getItemFullWidth(track);
    const visible = computeVisibleCount();
    const totalWidth = items.length * itemW;
    const visibleWidth = visible * itemW;
    const maxLeft = Math.max(0, totalWidth - visibleWidth);
    const curTx = track._tx || 0;
    const moveBy = itemW * Math.max(1, visible);
    let newTx = curTx - direction * moveBy;
    if(Math.abs(newTx) > maxLeft) newTx = -maxLeft;
    if(newTx > 0) newTx = 0;
    track.style.transform = `translateX(${newTx}px)`;
    track._tx = newTx;
    updateButtonsVisibility(section);
  }

  function enableSwipe(wrapper, section){
    let startX = 0;
    let curX = 0;
    let isDown = false;

    wrapper.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      curX = startX;
      isDown = true;
    });

    wrapper.addEventListener('touchmove', e => {
      if (!isDown) return;
      curX = e.touches[0].clientX;
      const dx = curX - startX;
      const baseTx = section._track._tx || 0;
      section._track.style.transform = `translateX(${baseTx + dx}px)`;
    });

    wrapper.addEventListener('touchend', e => {
      if (!isDown) return;
      isDown = false;

      const dx = curX - startX;
      const threshold = 40;

      if (Math.abs(dx) > threshold) {
        if (dx < 0) {
          // swipe left → same as clicking Next button
          if (typeof onNextClick === 'function' && section._catDef) {
            onNextClick(section, section._catDef);
          } else {
            slideCategory(section, +1);
          }
        } else {
          // swipe right → go back
          slideCategory(section, -1);
        }
      } else {
        // small drag → snap back
        section._track.style.transform = `translateX(${section._track._tx || 0}px)`;
      }

      startX = 0;
      curX = 0;
    });

    wrapper.addEventListener('mouseleave', () => {
      if (isDown) {
        isDown = false;
        section._track.style.transform = `translateX(${section._track._tx || 0}px)`;
      }
    });
  }

  async function renderStandard(mainEl){
    // prefer page-specific data-src, otherwise check explicit global JSON_DATA_PATH if allowed
    const dataSrc = mainEl?.dataset?.src || null;

    // If no source provided and no in-memory data, do not render anything.
    if(
      !dataSrc &&
      !(Array.isArray(window.rokomariData) && window.rokomariData.length) &&
      !(window.FORCE_LOAD_CARDS && typeof window.JSON_DATA_PATH === 'string' && window.JSON_DATA_PATH)
    ){
      return;
    }

    // ensure cards container exists and show a loading spinner
    let cards = qs('#cardsArea', mainEl);
    if(!cards){
      cards = document.createElement('div');
      cards.id = 'cardsArea';
      cards.className = 'cards-area container';
      mainEl.appendChild(cards);
    } else {
      cards.className = 'cards-area container';
    }
    showSpinner(cards);

    let raw = [];
    if(Array.isArray(window.rokomariData) && window.rokomariData.length){
      raw = window.rokomariData;
    } else if(dataSrc){
      raw = await fetchJson(dataSrc);
    } else if(window.FORCE_LOAD_CARDS && typeof window.JSON_DATA_PATH === 'string' && window.JSON_DATA_PATH){
      raw = await fetchJson(window.JSON_DATA_PATH);
    } else {
      raw = [];
    }

    // Derive a category key from the dataSrc path, e.g. "/data/books.json" -> "books"
    let catKey = '';
    if(typeof dataSrc === 'string'){
      const m = dataSrc.match(/\/data\/([^./]+)\.json/i);
      if(m) catKey = m[1];
    }

    let all = normalize(raw);
    // Shuffle deterministically once per hour per category
    all = hourlyShuffle(all, catKey || 'category');

    // Priority sort: items appearing in best_seller.json come first
    try {
      const bs = await fetchJson('/data/best_seller.json');
      const titles = new Set(bs.map(it=> (it.title||'').trim().toLowerCase()));
      all.sort((a,b)=>{
        const at = titles.has((a.title||'').toLowerCase());
        const bt = titles.has((b.title||'').toLowerCase());
        return at===bt?0:(at?-1:1);
      });
    } catch(e) { console.warn('priority sort failed',e);}
    window._all_index = all;

    const PAGE_SIZE = 10;
    let idx = 0;
    let loadMoreBtn = null;

    function appendBatch(){
      if(idx >= all.length) return;

      // first batch: clear the spinner
      if(idx === 0){
        cards.innerHTML = '';
      }

      const slice = all.slice(idx, idx + PAGE_SIZE);
      slice.forEach(it => cards.appendChild(createCard(it)));
      idx += slice.length;
      if(loadMoreBtn && idx >= all.length){
        loadMoreBtn.style.display = 'none';
      }
    }

    // initial load
    appendBatch();

    // create / reuse "আরও দেখুন" button
    loadMoreBtn = qs('.cards-load-more', mainEl);
    if(!loadMoreBtn){
      loadMoreBtn = document.createElement('button');
      loadMoreBtn.type = 'button';
      loadMoreBtn.className = 'btn cards-load-more';
      loadMoreBtn.textContent = 'আরও দেখুন';
      loadMoreBtn.style.margin = '18px auto 4px';
      loadMoreBtn.style.display = (all.length > PAGE_SIZE) ? 'block' : 'none';
      mainEl.appendChild(loadMoreBtn);
    } else {
      loadMoreBtn.style.display = (all.length > PAGE_SIZE && idx < all.length) ? 'block' : 'none';
    }

    if(loadMoreBtn){
      loadMoreBtn.onclick = appendBatch;
    }
  }

  function attachImageSkeletons(){
    document.querySelectorAll('.card .media img').forEach(img=>{
      if(img.dataset._attached) return;
      img.dataset._attached = 1;
      const wrapper = img.parentNode;
      const sk = document.createElement('div'); sk.className = 'img-skel';
      wrapper.insertBefore(sk, img);
      img.style.opacity = 0;
      img.addEventListener('load', ()=>{
        img.style.transition='opacity .35s';
        img.style.opacity = 1;
        if(sk && sk.parentNode) sk.parentNode.removeChild(sk);
        updateAllButtons();
      });
      img.addEventListener('error', ()=>{
        if(sk && sk.parentNode) sk.parentNode.removeChild(sk);
        updateAllButtons();
      });
    });
  }
  setTimeout(()=>attachImageSkeletons(), 250);
  const mut = new MutationObserver(()=>attachImageSkeletons());
  mut.observe(document.body, { childList:true, subtree:true });

  function updateAllButtons(){
    qsa('.cat-row').forEach(section=>{
      if(section._track) updateButtonsVisibility(section);
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    setupHeader();

    // normalize and compare path against SITE_BASE aware roots
    const path = (location.pathname || '/').replace(/\/$/, '') || '/';
    const base = SITE_BASE || '';
    const isHome = (path === '' || path === base || path === base + '/' || path === '/' || path === '');
    if(isHome) {
      renderHome();
      return;
    }

    // Prefer element with explicit data-src (for category pages we put <main data-src="..."> inside the page content)
    // If no such element exists, fall back to the first <main> in the layout, then document.body.
    const pageDataSrcEl = document.querySelector('[data-src]');
    const mainElCandidate = pageDataSrcEl || qs('main') || document.body;

    // Determine whether to render cards:
    // - element has data-src OR
    // - in-memory window.rokomariData exists OR
    // - FORCE_LOAD_CARDS is true AND JSON_DATA_PATH is set
    const hasSrc = !!(mainElCandidate && mainElCandidate.dataset && mainElCandidate.dataset.src);
    const hasInMemory = Array.isArray(window.rokomariData) && window.rokomariData.length;
    const hasGlobalJson = (typeof window.JSON_DATA_PATH === 'string' && window.JSON_DATA_PATH);
    const force = !!window.FORCE_LOAD_CARDS;

    if(hasSrc || hasInMemory || (force && hasGlobalJson)){
      renderStandard(mainElCandidate);
    } else {
      // intentionally do nothing — no cards for this page
    }
  });

  window.triggerRequest = function(searchTerm){
    const searchInput = qs('#header-search-input');
    const resultsContainer = qs('#header-search-results');
    if(resultsContainer) resultsContainer.style.display='none';
    if(searchInput){
      searchInput.value='';
      searchInput.blur();
    }
    const requestArea = qs('#request-area') || qs('#footer') || null;
    const productInput = qs('#product-name');
    if(requestArea){
      requestArea.scrollIntoView({behavior:'smooth'});
      if(productInput){
        productInput.value = searchTerm;
        setTimeout(()=>productInput.focus(), 600);
      }
    } else {
      alert('রিকোয়েস্ট ফর্মের জন্য পেজের নিচে যান।');
    }
  };

})();

  // --- Scroll to top / bottom buttons ---
  const scrollUpBtn = document.querySelector('.scroll-btn-up');
  const scrollDownBtn = document.querySelector('.scroll-btn-down');

  function smoothScrollTo(y) {
    window.scrollTo({
      top: y,
      behavior: 'smooth'
    });
  }

  if (scrollUpBtn) {
    scrollUpBtn.addEventListener('click', () => {
      smoothScrollTo(0);
    });
  }

  if (scrollDownBtn) {
    scrollDownBtn.addEventListener('click', () => {
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      smoothScrollTo(maxY);
    });
  }

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;

    if (scrollUpBtn) {
      scrollUpBtn.classList.toggle('visible', scrollY > 300);
    }
    if (scrollDownBtn) {
      scrollDownBtn.classList.toggle('visible', scrollY < maxY - 300);
    }
  });

