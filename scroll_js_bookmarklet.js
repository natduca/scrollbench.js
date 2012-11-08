// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
  var scroll_js_path = window.G_scroll_js_path ||
      ('https:/' + '/raw.github.com/natduca/scroll.js/master/scroll.js');
  var el = document.createElement('script');
  el.src = scroll_js_path;
  el.addEventListener('load', function() {
    new window.__ScrollTest(function(results) {
      alert("Done: " + JSON.stringify(results, null, "  "));
    });
  });
  document.head.appendChild(el);
})();