// site.js - header search suggestions and enter-to-search
document.addEventListener("DOMContentLoaded", function () {
  var searchInput = document.getElementById("header-search-input");
  var resultsBox = document.getElementById("header-search-results");
  if (!searchInput || !resultsBox || !window.buildSearchIndex) return;

  var index = [];
  window.buildSearchIndex().then(function (idx) {
    index = idx || [];
  });

  function clearResults(){
    resultsBox.innerHTML = "";
    resultsBox.style.display = "none";
  }

  function showSuggestions(q){
    if (!q){
      clearResults();
      return;
    }
    q = q.toLowerCase();
    var matches = [];
    var seen = new Set();

    index.forEach(function (it) {
      if (matches.length >= 8) return;
      if ((it.title && it.title.indexOf(q) !== -1) || (it.desc && it.desc.indexOf(q) !== -1)) {
        var key = (it.raw.title || "") + "|" + (it.raw.link || "");
        if (seen.has(key)) return;
        seen.add(key);
        matches.push(it);
      }
    });

    resultsBox.innerHTML = "";

    if (matches.length){
      matches.forEach(function (m) {
        var a = document.createElement("a");
        a.className = "result-item";
        a.href = m.href || "#";
        a.innerHTML =
          '<img src="' + (m.raw.img || "https://via.placeholder.com/50x50") + '" alt="">' +
          '<div class="result-info">' +
          '<h4 style="margin:0;font-size:14px">' + (m.raw.title || "") + "</h4>" +
          '<small style="color:#777">' + m.file + "</small>" +
          "</div>";
        resultsBox.appendChild(a);
      });
    }

    // category suggestions
    if (window.SEARCH_CATEGORIES){
      Object.keys(window.SEARCH_CATEGORIES).forEach(function (ckey) {
        if (ckey.indexOf(q) !== -1) {
          var cat = window.SEARCH_CATEGORIES[ckey];
          var a = document.createElement("a");
          a.className = "result-item";
          a.href = cat.href;
          a.innerHTML =
            '<div class="result-info">' +
            '<h4 style="margin:0;font-size:14px">' + cat.name + ' ক্যাটাগরি</h4>' +
            '<small style="color:#777">ক্যাটাগরি পেজ</small>' +
            "</div>";
          resultsBox.appendChild(a);
        }
      });
    }

    if (!resultsBox.innerHTML.trim()){
      resultsBox.innerHTML = '<div class="no-result-box"><p>কিছুই মিলেনি</p></div>';
    }

    resultsBox.style.display = "block";
  }

  var debounce;
  searchInput.addEventListener("input", function (e) {
    clearTimeout(debounce);
    var value = e.target.value.trim();
    debounce = setTimeout(function () {
      showSuggestions(value);
    }, 120);
  });

  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var q = encodeURIComponent(searchInput.value.trim());
      if (q){
        var base = window.SITE_BASEURL || "";
        var url = base ? base + "/search.html?q=" + q : "search.html?q=" + q;
        window.location.href = url;
      }
    }
  });

  document.addEventListener("click", function (e) {
    if (!resultsBox.contains(e.target) && e.target !== searchInput){
      clearResults();
    }
  });
});
