// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
(function() {
  var scroll_js_path = window.G_scroll_js_path ||
      ('https:/' + '/raw.github.com/natduca/scroll.js/master/scroll.js');

  function run() {
    new window.__ScrollTest(report);
  }

  function report(results) {
    alert("Done: " + JSON.stringify(results, null, "  "));
  }

  if (!window.__ScrollTest) {
    var el = document.createElement('script');
    el.src = scroll_js_path;
    el.addEventListener('load', run);
    document.head.appendChild(el);
  } else {
    run();
  }
})();