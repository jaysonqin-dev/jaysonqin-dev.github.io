/* Sets the theme before first paint so there is no flash. Kept as a file so the page needs no inline script. */
(function () {
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved);
  } catch (e) {}
  document.documentElement.className += " js";
})();
