/* cards.js
   JSON-driven card generator, carousel, category pages, and search index builder.
*/

var SITE_CONFIG = {
  dataIndexPath: "/data/index.json",
  fallbackDataFiles: [
    "/data/books.json",
    "/data/electronics.json",
    "/data/groceries.json",
    "/data/academic.json",
    "/data/home.json",
    "/data/fashion.json",
    "/data/kids.json"
  ],
  initialCardsPerSection: 4,
  maxCardsPerSection: 8,   // then one আরও দেখুন card as 9th
  moreCardsOnDemand: 1,
  categoryPageBatch: 10
};

function getBase(){
  return window.SITE_BASEURL || "";
}

function withBase(path){
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  var base = getBase();
  if (base){
    if (path[0] === "/") return base + path;
    return base + "/" + path;
  }else{
    return path.replace(/^\/+/, "");
  }
}

function escapeHtml(s){
  return String(s || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

/* --- Fetch helpers --- */
function tryFetchJson(paths){
  if (!Array.isArray(paths)) paths = [paths];
  var p = Promise.reject();
  paths.forEach(function (path) {
    p = p.catch(function () {
      return fetch(withBase(path)).then(function (r) {
        if (!r.ok) throw new Error("bad");
        return r.json();
      });
    });
  });
  return p;
}

/* --- Card DOM --- */
function createCardNode(item){
  var el = document.createElement("article");
  el.className = "card product-card";
  el.setAttribute("data-title", item.title || "");
  el.setAttribute("data-img", item.img || "");
  el.setAttribute("data-href", item.link || "#");
  el.innerHTML =
    '<div class="img-wrap"><img loading="lazy" src="' + (item.img || "https://via.placeholder.com/400x300?text=No+Image") + '" alt="' + escapeHtml(item.title || "") + '"></div>' +
    '<div class="body">' +
    '<h3 class="title">' + escapeHtml(item.title || "Untitled") + "</h3>" +
    '<div class="desc">' + escapeHtml(item.desc || "") + "</div>" +
    '<div class="cta">' +
    '<a class="buy-btn" href="' + (item.link || "#") + '" target="_blank" rel="noopener">ডিসকাউন্ট পেতে ক্লিক করুন [Buy Now]</a>' +
    '<small class="meta-note">' + escapeHtml(item.seller || item.author || "") + "</small>" +
    "</div></div>";
  return el;
}

/* --- Carousel --- */
function capitalizeFirst(s){
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function slugify(s){
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeCarousel(container, items){
  container.innerHTML = "";
  var header = document.createElement("div");
  header.className = "section-header";

  var sectionTitle = container.dataset.sectionTitle || "Category";
  var firstWord = sectionTitle.split(" ")[0] || "Category";
  var heading = document.createElement("h2");
  heading.textContent = "Rokomari Promo Code For " + capitalizeFirst(firstWord);
  header.appendChild(heading);

  var sectionKey = container.dataset.sectionKey || slugify(sectionTitle);
  var moreLink = document.createElement("a");
  moreLink.className = "more-btn";
  moreLink.textContent = "আরও দেখুন";
  moreLink.href = withBase("/categories/" + sectionKey + ".html");
  header.appendChild(moreLink);

  container.appendChild(header);

  var wrap = document.createElement("div");
  wrap.className = "carousel-wrap";

  var track = document.createElement("div");
  track.className = "carousel-track";

  var index = 0;
  var maxCards = SITE_CONFIG.maxCardsPerSection;
  var moreCardAdded = false;

  function appendNext(count){
    if (moreCardAdded) return;
    for (var i=0;i<count;i++){
      if (index >= items.length || index >= maxCards) break;
      var node = createCardNode(items[index++]);
      track.appendChild(node);
    }
    if (!moreCardAdded && (index >= items.length || index >= maxCards)){
      var moreCard = document.createElement("div");
      moreCard.className = "card";
      moreCard.innerHTML =
        '<div style="display:flex;height:100%;align-items:center;justify-content:center;padding:0 12px;text-align:center;">' +
        '<a href="' + withBase("/categories/" + sectionKey + ".html") + '" style="text-decoration:none;color:var(--accent);font-weight:700;font-size:15px;">আরও দেখুন</a>' +
        "</div>";
      track.appendChild(moreCard);
      moreCardAdded = true;
    }
  }

  appendNext(SITE_CONFIG.initialCardsPerSection);

  wrap.appendChild(track);

  var left = document.createElement("button");
  left.className = "carousel-arrow left";
  left.innerHTML = '<i class="fas fa-chevron-left"></i>';
  var right = document.createElement("button");
  right.className = "carousel-arrow right";
  right.innerHTML = '<i class="fas fa-chevron-right"></i>';
  wrap.appendChild(left);
  wrap.appendChild(right);
  container.appendChild(wrap);

  var pos = 0;

  function step(){
    var card = track.querySelector(".card");
    if (!card) return 300;
    var style = window.getComputedStyle(track);
    var gap = parseFloat(style.columnGap || style.gap || "0");
    var w = card.getBoundingClientRect().width + gap;
    return Math.round(w);
  }

  left.addEventListener("click", function(){
    var s = step();
    pos = Math.min(pos + s, 0);
    track.style.transform = "translateX(" + pos + "px)";
  });

  right.addEventListener("click", function(){
    var s = step();
    pos = pos - s;
    track.style.transform = "translateX(" + pos + "px)";
    if (Math.abs(pos) + wrap.clientWidth >= track.scrollWidth - 50){
      appendNext(SITE_CONFIG.moreCardsOnDemand);
    }
  });

  var pressed = false, startX = 0, curX = 0;
  track.addEventListener("pointerdown", function(e){
    pressed = true;
    startX = e.clientX;
    track.style.transition = "none";
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", function(e){
    if (!pressed) return;
    curX = e.clientX;
    var dx = curX - startX;
    track.style.transform = "translateX(" + (pos + dx) + "px)";
  });
  track.addEventListener("pointerup", function(e){
    if (!pressed) return;
    pressed = false;
    var dx = (curX || startX) - startX;
    pos = pos + dx;
    track.style.transition = "transform .45s cubic-bezier(.2,.9,.3,1)";
    track.style.transform = "translateX(" + pos + "px)";
    if (Math.abs(pos) + wrap.clientWidth >= track.scrollWidth - 50){
      appendNext(SITE_CONFIG.moreCardsOnDemand);
    }
  });
}

/* --- Home sections init --- */
function initSections(){
  var sections = document.querySelectorAll(".book-section");
  if (!sections.length) return;

  sections.forEach(function (s) {
    var srcAttr = s.getAttribute("data-src") || s.getAttribute("src") || "";
    var candidates = [];
    if (srcAttr) candidates.push(srcAttr);
    if (srcAttr && srcAttr[0] !== "/") candidates.push("/" + srcAttr);
    var basename = srcAttr.split("/").pop() || "";
    if (basename){
      candidates.push("/data/" + basename);
      candidates.push("/_data/" + basename);
    }
    SITE_CONFIG.fallbackDataFiles.forEach(function (p) {
      if (candidates.indexOf(p) === -1) candidates.push(p);
    });

    tryFetchJson(candidates).then(function (items) {
      if (Array.isArray(items) && items.length){
        makeCarousel(s, items);
      }else{
        s.innerHTML = '<p style="padding:16px;color:var(--muted)">No data found for this section.</p>';
      }
    }).catch(function () {
      s.innerHTML = '<p style="padding:16px;color:var(--muted)">Unable to load section data. Check data paths.</p>';
    });
  });
}

/* --- Category page --- */
function initCategoryPage(rootSelector){
  var root = document.querySelector(rootSelector || "#category-root");
  if (!root) return;

  var src = root.dataset.src || root.getAttribute("data-src") || "data/books.json";
  var basename = src.split("/").pop();
  var candidates = [src];
  if (src[0] !== "/") candidates.push("/" + src);
  if (basename){
    candidates.push("/data/" + basename);
    candidates.push("/_data/" + basename);
  }

  tryFetchJson(candidates).then(function (items) {
    if (!Array.isArray(items)) items = [];
    var idx = 0;
    var container = document.createElement("div");
    container.className = "category-list";
    root.appendChild(container);

    function appendNextBatch(){
      var end = idx + SITE_CONFIG.categoryPageBatch;
      var batch = items.slice(idx, end);
      batch.forEach(function (it) {
        var li = document.createElement("div");
        li.className = "list-item";
        li.innerHTML =
          '<img src="' + (it.img || "https://via.placeholder.com/160x120") + '" alt="' + escapeHtml(it.title || "") + '">' +
          '<div class="meta">' +
          "<h3>" + escapeHtml(it.title || "") + "</h3>" +
          "<p>" + escapeHtml(it.desc || "") + "</p>" +
          '<a class="buy-btn" href="' + (it.link || "#") + '" target="_blank" rel="noopener">ডিসকাউন্ট পেতে ক্লিক করুন [Buy Now]</a>' +
          "</div>";
        container.appendChild(li);
      });
      idx = end;
      var existingMore = root.querySelector(".load-more");
      if (existingMore) existingMore.remove();
      if (idx < items.length){
        var more = document.createElement("button");
        more.className = "load-more";
        more.textContent = "আরও দেখুন";
        more.addEventListener("click", function () {
          appendNextBatch();
        });
        root.appendChild(more);
      }
    }

    appendNextBatch();
  }).catch(function () {
    root.innerHTML = "<p>ডাটা লোড করা যায়নি।</p>";
  });
}

/* --- Search index --- */
function categoryFromFile(path){
  var name = (path.split("/").pop() || "").replace(/\.json$/,"");
  return name || "category";
}

function buildSearchIndex(){
  var files = [];
  return fetch(withBase(SITE_CONFIG.dataIndexPath)).then(function (r) {
    if (r.ok) return r.json();
    return null;
  }).catch(function () {
    return null;
  }).then(function (data) {
    if (Array.isArray(data) && data.length){
      files = data;
    }else{
      files = SITE_CONFIG.fallbackDataFiles.slice();
    }

    var index = [];
    var categories = {};

    var promises = files.map(function (f) {
      return fetch(withBase(f)).then(function (r) {
        if (!r.ok) return;
        return r.json();
      }).then(function (arr) {
        if (!Array.isArray(arr)) return;
        arr.forEach(function (item) {
          index.push({
            title: (item.title || "").toLowerCase(),
            desc: (item.desc || "").toLowerCase(),
            file: f,
            href: item.link || withBase("/categories/" + slugify(categoryFromFile(f)) + ".html"),
            raw: item
          });
        });
      }).catch(function () {});
    });

    return Promise.all(promises).then(function () {
      files.forEach(function (f) {
        var cat = categoryFromFile(f);
        var slug = slugify(cat);
        categories[cat.toLowerCase()] = {
          name: capitalizeFirst(cat),
          href: withBase("/categories/" + slug + ".html")
        };
      });
      window.SEARCH_CATEGORIES = categories;
      return index;
    });
  });
}

/* --- Boot --- */
document.addEventListener("DOMContentLoaded", function () {
  initSections();
  initCategoryPage("#category-root");
  window.buildSearchIndex = buildSearchIndex;
});
