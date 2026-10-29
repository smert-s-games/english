/* app.js v20 join patches */
(function(){
  var code = (window.__APP_PATCH_A||"") + (window.__APP_PATCH_B||"");
  if (!code) { console.error("patch parts missing"); return; }
  var s = document.createElement("script");
  s.text = code;
  document.head.appendChild(s);
})();
