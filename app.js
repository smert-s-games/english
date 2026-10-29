/* app.js loader v20 — joins gzip chunks */
(function () {
  "use strict";
  function b64ToU8(s) {
    var bin = atob(s);
    var u8 = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  async function inflateGzip(u8) {
    var ds = new DecompressionStream("gzip");
    var stream = new Blob([u8]).stream().pipeThrough(ds);
    var ab = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(ab);
  }
  var b64 = (window.__APP_GZ0 || "") + (window.__APP_GZ1 || "");
  if (!b64) {
    console.error("app chunks missing");
    return;
  }
  inflateGzip(b64ToU8(b64)).then(function (code) {
    var s = document.createElement("script");
    s.text = code;
    document.head.appendChild(s);
  }).catch(function (e) {
    console.error("app load failed", e);
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/gh/smert-s-games/english@9eaece21677c1d1115d3ab79567833fdfc30f8c0/app.js";
    document.head.appendChild(s);
  });
})();
