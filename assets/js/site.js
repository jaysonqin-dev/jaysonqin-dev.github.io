(function () {
  "use strict";

  // Contact address is assembled here so it is not sitting in the HTML for scrapers.
  var user = "jayson.qin";
  var host = "hotmail.com";
  document.querySelectorAll("[data-mail]").forEach(function (link) {
    link.setAttribute("href", "mail" + "to:" + user + "@" + host + "?subject=" + encodeURIComponent("Hello from your site"));
    if (link.dataset.mail === "show") link.textContent = user + "@" + host;
  });

  // Theme toggle: remembers the choice, otherwise follows the system.
  var root = document.documentElement;
  var toggle = document.querySelector("[data-theme-toggle]");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var next = current === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  // Gentle reveal on scroll. Content is fully visible without JavaScript or with reduced motion.
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("in"); });
  } else {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("in"); seen.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { seen.observe(el); });
  }

  // Table of contents on case-study pages highlights the section being read.
  var toc = document.querySelectorAll(".toc a[href^='#']");
  if (toc.length && "IntersectionObserver" in window) {
    var map = {};
    toc.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          toc.forEach(function (a) { a.classList.remove("on"); });
          var link = map[entry.target.id];
          if (link) link.classList.add("on");
        }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }
})();
