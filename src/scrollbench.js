/**
 * ScrollBench.js - Browser Scroll Benchmark
 * @author Matteo Spinelli <matteo@cubiq.org>
 *
 * Copyright (c) 2013 The Chromium Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

(function (window, document) {
	var CONFIG_URL = 'https://raw.githubusercontent.com/natduca/scrollbench.js/master/src/config.js';
	var REPORT_URL = '//raw.githubusercontent.com/natduca/scrollbench.js/master/report.html';

	var reliabilityReport = {};

	var now = (function () {
		var perfNow = window.performance &&		// browser may support performance but not performance.now
			(performance.now		||
			performance.webkitNow	||
			performance.mozNow		||
			performance.msNow		||
			performance.oNow);

		if ( perfNow ) {
			reliabilityReport.timer = 'performance.now';
			return perfNow.bind(window.performance);
		}

		if ( Date.now ) {
			reliabilityReport.timer = 'Date.now';
			return Date.now;
		}

		reliabilityReport.timer = 'Date getTime';
		return new Date().getTime();
	})();

	var rAF = (function () {
		var raf = window.requestAnimationFrame	||
			window.webkitRequestAnimationFrame	||
			window.mozRequestAnimationFrame		||
			window.oRequestAnimationFrame		||
			window.msRequestAnimationFrame;

		if ( raf ) {
			reliabilityReport.animation = 'requestAnimationFrame';
			return raf;
		}

		reliabilityReport.animation = 'setTimeout';

		return function (callback) { window.setTimeout(callback, 1000 / 60); };
	})();

	// Normalize viewport size for mobile
	function initViewport (scale) {
		var vp = document.querySelector('meta[name=viewport]');
		scale = scale || 1; //(1 / (window.devicePixelRatio || 1));

		if ( !vp ) {
			vp = document.createElement('meta');
			vp.setAttribute('name', 'viewport');
			document.head.appendChild(vp);
		}
		vp.setAttribute('content', 'width=device-width,initial-scale=' + scale + ',maximum-scale=' + scale + ',user-scalable=0');
	}

	// Get the scale factor of the current page
	function getScale () {
		var screenWidth = screen.width;

		// probably not a mobile devide
		if ( screen.width > document.documentElement.clientWidth ) {
			return 1;
		}

		if ( window.orientation%180 ) {		// landscape
			if ( screen.width < screen.height ) screenWidth = screen.height;
		} else {							// portrait
			if ( screen.width > screen.height ) screenWidth = screen.height;
		}

		return screenWidth / window.innerWidth;
	}

	function getBoundingVisibleRect (el) {
		var rect = el.getBoundingClientRect();

		var outsideHeight = rect.top + rect.height - window.innerHeight;
		var outsideWidth = rect.left + rect.width - window.innerWidth;

		if ( outsideHeight > 0 ) {
			rect.height -= outsideHeight;
		}

		if ( outsideWidth > 0 ) {
			rect.width -= outsideWidth;
		}

		return rect;
	}

	var gpuBenchmarking = window.chrome && window.chrome.gpuBenchmarking;
	var asyncScroll = gpuBenchmarking && window.chrome.gpuBenchmarking.smoothScrollBy;

	var pageLoaded = true;

	function loaded () {
		window.removeEventListener('load', loaded, false);
		pageLoaded = true;
	}

	if ( document.readyState != 'complete' ) {
		pageLoaded = false;
		window.addEventListener('load', loaded, false);
	}


/**
 * RAFScroller, requestAnimationFrame driver
 * @constructor
 */
	function RAFScroller () {
	}

	RAFScroller.prototype = {
		getResult: function () {
			var result = {};
			var frameStats = this._getFrameStats();

			result.numAnimationFrames = this.timeFrames.length;
			result.droppedFrameCount = frameStats.droppedFrameCount;
			result.worstTime = frameStats.worstTime;
			result.framesPerSecond = frameStats.fps;
			result.totalTimeInSeconds = (this.timeFrames[this.timeFrames.length - 1] - this.timeFrames[0]) / 1000;

			return result;
		},

		start: function (element, travel, step, callback) {
			this.element = element;
			this.travel = travel;
			this.callback = callback;
			this.step = step; 

			this.timeFrames = [];
			this.isDocument = this.element == document.documentElement;

			if ( this.isDocument ) {
				window.scrollTo(0, 0);
			} else {
				this.element.scrollTop = 0;
			}

			this.rolling = true;

			rAF(this._step.bind(this));
		},

		stop: function () {
			this.rolling = false;
		},

		_getFrameStats: function () {
			var droppedFrameCount = 0,
				frameTime,
				fps = 0,
				worstTime = 0,
				threshold,
				i = 1,
				l = this.timeFrames.length;

			for ( i = 1; i < l; i++ ) {
				frameTime = this.timeFrames[i] - this.timeFrames[i-1];
				worstTime = Math.max(worstTime, frameTime);
				fps += frameTime;
			}

			fps = fps / (l-1);
			threshold = fps * 0.1;

			for ( i = 1; i < l; i++ ) {
				frameTime = this.timeFrames[i] - this.timeFrames[i-1];
				if ( Math.abs(frameTime - fps) > threshold ) {
					droppedFrameCount++;
				}
			}

			return {
				droppedFrameCount: droppedFrameCount,
				worstTime: worstTime,
				fps: 1000 / fps
			};
		},

		_getScrollPosition: function () {
			if ( this.isDocument ) {
				return {
					left: Math.max(document.documentElement.scrollLeft, document.body.scrollLeft),
					top: Math.max(document.documentElement.scrollTop, document.body.scrollTop)
				};	// TODO: check this for cross browser compatibility
			}

			return {
				left: this.element.scrollLeft,
				top: this.element.scrollTop
			};
		},

		_step: function () {
			var scrollTop = this._getScrollPosition().top;
			// check travel at every iteration, this covers possible DOM changes while scrolling
			this.travel = Math.min(this.travel, this.element.scrollHeight - (this.isDocument ? window.innerHeight : this.element.clientHeight) - 1);

			if ( this.travel - scrollTop <= 0 ) {
				this.rolling = false;
				this.callback();
			}

			if ( !this.rolling ) return;

			rAF(this._step.bind(this));

			this.timeFrames.push(now());

			scrollTop += this.step;

			if ( this.isDocument ) {
				window.scrollTo(0, scrollTop);
			} else {
				this.element.scrollTop = scrollTop;
			}
		}
	};


/**
 * SmoothScroller, scroll driver using smoothScrollBy for scrolling
 * and gpuBenchmarking Stats
 * @constructor
 */
	function SmoothScroller () {

	}

	SmoothScroller.prototype = {
		getResult: function () {
			var result = this.finalStat;

			for (var i in result) {
				result[i] -= this.initialStat[i];
			}

			return result;
		},

		start: function (element, travel, step, callback) {
			var rect = getBoundingVisibleRect(element);
			var that = this;

			step = travel;

			// this wouldn't be strictly needed as Chrome scrolls the document with scrollTop
			if ( element == document.documentElement ) {
				window.scrollTo(0, 0);
			} else {
				element.scrollTop = 0;
			}

			this.initialStat = this._step();
			chrome.gpuBenchmarking.smoothScrollBy(step, function () {
				that.finalStat = that._step();
				callback();
			}, rect.left + Math.round(rect.width / 2), rect.top + Math.round(rect.height / 2));
		},

		stop: function () {
			// TODO: how do you stop a smoothScrollBy?
		},

		_step: function () {
			var stats = chrome.gpuBenchmarking.renderingStats();
			stats.totalTimeInSeconds = now() / 1000;

			return stats;
		}
	};


/**
 * ScrollBench
 * @param {Object} options Configure the benchmark
 * @constructor
 */
	function ScrollBench (options) {
		this.ready = false;

		this.options = {
			element: null,
			iterations: 2,
			scrollStep: 100,
			scrollDriver: '',
			onCompletion: null,
			loadConfig: false,
			scrollableElementFn: null,
			waitForFn: null,
			initViewport: false
		};

		for ( var i in options ) {
			this.options[i] = options[i];
		}

		if ( this.options.initViewport ) {
			initViewport();
		}

		if ( this.options.loadConfig ) {
			this._loadConfig();
			return;
		}
		
		this._waitForContent();
	}

	ScrollBench.prototype = {
		handleEvent: function (e) {
			if ( e.type == 'scroll' ) {
				this._scrollCheck(e);
			}
		},

		_loadConfig: function () {
			var that = this;
			var script;

			function parseConfig () {
				var i, l, m;
				var regex;

				for ( i = 0, l = window.scrollbench_config.pages.length; i < l; i++ ) {
					regex = new RegExp(window.scrollbench_config.pages[i].url);

					if ( regex.test(window.location.href) ) {
						for ( m in window.scrollbench_config.pages[i] ) {
							that.options[m] = window.scrollbench_config.pages[i][m];
						}

						break;
					}
				}

				if ( script ) {
					script.removeEventListener('load', parseConfig, false);		// be kind, rewind
				}

				that._waitForContent();
			}

			if ( window.scrollbench_config ) {
				parseConfig();
				return;
			}

			function scriptLoaded() {
				script = document.createElement('script');
				script.innerHTML = this.responseText;
				script.addEventListener('load', parseConfig, false);
				document.getElementsByTagName('head')[0].appendChild(script);
			}

			var scriptRequest = new XMLHttpRequest ();
			scriptRequest.addEventListener ( 'load', scriptLoaded );
			scriptRequest.open ( 'GET', typeof this.options.loadConfig == 'string' ? this.options.loadConfig : CONFIG_URL );
			scriptRequest.send ();
		},

		_waitForContent: function () {
			var that = this;

			function waitingGame () {
				if ( that.options.waitForFn() ) {
					that._findScrollableElement();
					return;
				}

				setTimeout(waitingGame, 50);
			}

			if ( typeof this.options.waitForFn == 'function' ) {
				waitingGame();
				return;
			}

			this._findScrollableElement();
		},

		_findScrollableElement: function () {
			var that = this;

			function setElement (el) {
				that.element = el || that.options.element || document.documentElement;
				that._getReady();
			}

			if ( this.options.scrollableElementFn ) {
				this.options.scrollableElementFn(setElement);
				return;
			}

			setElement();
		},

		_getReady: function (el) {
			var smoothScroll = !!asyncScroll;

			this.options.scrollDriver = this.options.scrollDriver || ( smoothScroll ? 'smoothScroll' : '' );

			// one might want to disable smoothScroll even if the browser supports it (for testing mainly)
			if ( smoothScroll && this.options.scrollDriver == 'smoothScroll' ) {
				reliabilityReport.animation = 'async scroll';
			}

			if ( reliabilityReport.animation == 'async scroll' ) {
				reliabilityReport.resolution = 'high+';
			} else if ( reliabilityReport.timer == 'performance.now' && reliabilityReport.animation == 'requestAnimationFrame' ) {
				reliabilityReport.resolution = 'medium-';
			} else {
				reliabilityReport.resolution = 'low!';
			}

			this.ready = true;
		},

		_startPass: function () {
			this.pass++;

			if ( this.options.scrollDriver == 'smoothScroll' ) {
				this.scroller = new SmoothScroller();
			} else {
				this.scroller = new RAFScroller();
			}

			this.scroller.start(
				this.element,
				this.travel,
				this.options.scrollStep,
				this._endPass.bind(this)
			);
		},

		_endPass: function () {
			this._updateResult();

			if ( this.pass < this.options.iterations ) {
				var delay = this.pass == 1 ? 2000 : 100;
				setTimeout(this._startPass.bind(this), delay);
				return;
			}

			this.result.resolution = reliabilityReport.resolution;
			this.result.timer = reliabilityReport.timer;
			this.result.animation = reliabilityReport.animation;
			this.result.avgTimePerPass = this.result.totalTimeInSeconds / this.pass;

			this.result.framesPerSecond = this.result.framesPerSecond ?
				this.result.framesPerSecond / this.pass :
				1000 / (this.result.totalTimeInSeconds / this.result.numAnimationFrames * 1000);

			this.result.worstTime = this.result.worstTime || 0;

			this.result.travel = this.travel;

			// add warnings
			if ( this.result.droppedFrameCount > this.result.numAnimationFrames / 10 ) {
				this.result.steadiness = 'poor!';
			} else if ( this.result.droppedFrameCount > this.result.numAnimationFrames / 20 ) {
				this.result.steadiness = 'mediocre-';
			} else {
				this.result.steadiness = 'good+';
			}

			if ( this.result.framesPerSecond < 50 ) {
				this.result.framesPerSecond += '!';
			} else if ( this.result.framesPerSecond < 56 ) {
				this.result.framesPerSecond += '-';
			} else {
				this.result.framesPerSecond += '+';
			}

			// compute overall benchmark result
			if ( /\+/.test(this.result.steadiness) && /\+/.test(this.result.framesPerSecond) ) {
				this.result.overall = '★★★★★+';
			} else if ( /\-/.test(this.result.steadiness) && /\+/.test(this.result.framesPerSecond) ) {
				this.result.overall = '★★★★+';
			} else if ( /[+-]/.test(this.result.framesPerSecond) ) {
				this.result.overall = '★★★-';
			} else if ( /[+-]/.test(this.result.steadiness) && /!/.test(this.result.framesPerSecond) ) {
				this.result.overall = '★★!';
			} else {
				this.result.overall = '★!';
			}

			if ( this.options.onCompletion ) {
				this.options.onCompletion(this.result);
				return;
			}

			this._generateReport();
		},

		start: function () {
			if ( !pageLoaded || !this.ready ) {
				setTimeout(this.start.bind(this), 100);
				return;
			}

			this.closeReport();

			this.pass = 0;
			this.result = {};

			// check if we should benchmark <html> or <body>
			if ( this.element == document.documentElement && document.documentElement.scrollHeight < document.body.scrollHeight ) {
				this.element = document.body;
			}

			this.travel = this.element.scrollHeight - (this.element == document.documentElement ? window.innerHeight : this.element.clientHeight);

			if ( this.travel <= this.options.scrollStep ) {
				alert('Scroll travel too short. No benchmark performed.');
				return;
			}

			this.controlTimer = setTimeout(this._scrollFailed.bind(this), 2100);
			(this.element == document.documentElement || this.element == document.body ? window : this.element).addEventListener('scroll', this, false);
			setTimeout(this._startPass.bind(this), 100);
		},

		stop: function () {
			this.scroller.stop();
		},

		closeReport: function () {
			var frame = document.getElementById('scrollbench-report-frame');

			if ( !frame ) return;

			document.documentElement.removeChild(frame);

			document.documentElement.removeChild(document.getElementById('scrollbench-close'));
		},

		_scrollCheck: function () {
			clearTimeout(this.controlTimer);
			(this.element == document.documentElement ? window : this.element).removeEventListener('scroll', this, false);
		},

		_scrollFailed: function () {
			this.stop();
			(this.element == document.documentElement ? window : this.element).removeEventListener('scroll', this, false);
			alert('Sorry, we weren\'t able to perform the test. Please report the culprit site to the ScrollBench team.');
		},

		_updateResult: function () {
			var result = this.scroller.getResult(),
				i;

			for ( i in result ) {
				if ( i == 'worstTime' ) {
					this.result[i] = this.result[i] ? Math.max(this.result[i], result[i]) : result[i];
				} else {
					this.result[i] = (this.result[i] || 0) + result[i];
				}
			}
		},

		_generateReport: function () {
			var frame = document.createElement('iframe');
			var close = document.createElement('i');	// using an element less prone to aggressive styling
			var parms = [];

			for ( var r in this.result ) {
				parms.push(r + '=' + this.result[r]);
			}

			if ( getScale() < 0.8 ) {
				initViewport();
			}

			// bugfix with overlaying iframe not getting events focus on Android
			if ( (/android/gi).test(navigator.appVersion) && this.element == document.documentElement ) {
				window.scrollTo(0, 0);
			}


			function frameLoaded() {
				frame.style.cssText = 'position:fixed;z-index:2147483640;bottom:0;left:0;width:100%;height:270px;padding:0;margin:0;border:0';
				frame.id = 'scrollbench-report-frame';
				document.documentElement.appendChild(frame);
				document.getElementById(frame.id).contentWindow.document.open();
				document.getElementById(frame.id).contentWindow.document.write(this.responseText);
				document.getElementById(frame.id).contentWindow.document.close();
				document.getElementById(frame.id).contentWindow.document.body.dataset.resultHash = encodeURIComponent(parms.join(','));
			}

			var frameRequest = new XMLHttpRequest ();
			frameRequest.addEventListener ( 'load', frameLoaded );
			frameRequest.open ( 'GET', REPORT_URL );
			frameRequest.send ();

			// Close button is on the same parent page to avoid cross-domain errors
			close.style.cssText = 'position:fixed;z-index:2147483641;bottom:238px;right:0;width:88px;height:32px;padding:0;margin:0;border:0;background:transparent;cursor:pointer';
			close.id = 'scrollbench-close';
			close.onclick = this.closeReport.bind(this);
			document.documentElement.appendChild(close);
		}
	};

	window.ScrollBench = ScrollBench;

})(window, document);
