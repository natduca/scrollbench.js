// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function (window, document) {
	var CONFIG_URL = 'https://sb.cubiq.org/src/config.js';
	var REPORT_URL = 'https://sb.cubiq.org/report.html';

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

/*		return perfNow ?
			perfNow.bind(window.performance) :
			Date.now ?							// Date.now should be noticeably faster than getTime
				Date.now :
				function getTime () { return new Date().getTime(); };
*/	})();

/*	var rAF = window.requestAnimationFrame	||
		window.webkitRequestAnimationFrame	||
		window.mozRequestAnimationFrame		||
		window.oRequestAnimationFrame		||
		window.msRequestAnimationFrame		||
		function (callback) { window.setTimeout(callback, 1000 / 60); };
*/

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

	var gpuBenchmarking = window.chrome && window.chrome.gpuBenchmarking;
	var asyncScroll = gpuBenchmarking && window.chrome.gpuBenchmarking.smoothScrollBy;

/*
	RAF Scroller
	RAF Stats
*/
	function RAFScroller () {
	}

	RAFScroller.prototype = {
		getResult: function () {
			var result = {};

			result.numAnimationFrames = this.timeFrames.length;
			result.droppedFrameCount = this._getDroppedFrameCount();
			result.totalTimeInSeconds = (this.timeFrames[this.timeFrames.length - 1] - this.timeFrames[0]) / 1000;

			return result;
		},

		start: function (element, callback, step) {
			this.element = element;
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
			this.scrollY = 0;
			this.clientHeight = this.isDocument ? window.innerHeight : this.element.clientHeight;

			rAF(this._step.bind(this));
		},

		stop: function () {
			this.rolling = false;
		},

		_getDroppedFrameCount: function () {
			var droppedFrameCount = 0,
				frameTime,
				i = 1,
				l = this.timeFrames.length;

			for ( i = 1; i < l; i++ ) {
				frameTime = this.timeFrames[i] - this.timeFrames[i-1];
				if (frameTime > 1000 / 55) droppedFrameCount++;
			}

			return droppedFrameCount;
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

		_step: function (timestamp) {
			if ( this.clientHeight + this.scrollY >= this.element.scrollHeight ) {
				this.rolling = false;
				this.callback();
			}

			if ( !this.rolling ) return;

			rAF(this._step.bind(this));

			this.timeFrames.push(now());

			if ( this._getScrollPosition().top !== this.scrollY ) {		// browser wasn't able to scroll within 16ms (TODO: double check this!)
				return;
			}

			this.scrollY += this.step;

			if ( this.isDocument ) {
				window.scrollTo(0, this.scrollY);
			} else {
				this.element.scrollTop = this.scrollY;
			}
		}
	};


/*
	smoothScrollBy Scroller
	gpuBenchmarking Stats
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

		start: function (element, callback) {
			var step = element.scrollHeight - element.clientHeight,
				that = this;

			if ( element == document.documentElement ) {
				window.scrollTo(0, 0);
			} else {
				element.scrollTop = 0;
			}

			this.initialStat = this._step();
			chrome.gpuBenchmarking.smoothScrollBy(step, function () {
				that.finalStat = that._step();
				callback();
			});
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

///////////////////////////

	function ScrollBench (options) {
		this.ready = false;

		this.options = {
			element: null,
			iterations: 2,
			scrollStep: 100,
			scrollDriver: '',
			onCompletion: null,
			loadConfig: false,
			scrollableElementFn: null
		};

		for ( var i in options ) {
			this.options[i] = options[i];
		}

		this._loadConfig();
	}

	ScrollBench.prototype = {
		_loadConfig: function () {
			if ( !this.options.loadConfig ) {
				this._findScrollableElement();
				return;
			}

			var that = this;

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

				that._findScrollableElement();
			};

			var script = document.createElement('script');
			script.src = typeof this.options.loadConfig == 'string' ? this.options.loadConfig : CONFIG_URL;
			script.addEventListener('load', parseConfig, false);
			document.getElementsByTagName('head')[0].appendChild(script);
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
			var smoothScroll = asyncScroll && this.element == document.documentElement;

			reliabilityReport.scroller = smoothScroll ? 'async' : 'sync';

			if ( reliabilityReport.scroller == 'async' ) {
				reliabilityReport.grade = 'excellent';
			} else if ( reliabilityReport.timer == 'performance.now' && reliabilityReport.animation == 'requestAnimationFrame' ) {
				reliabilityReport.grade = 'good';
			} else {
				reliabilityReport.grade = 'poor';
			}

			this.options.scrollDriver = this.options.scrollDriver || ( smoothScroll ? 'smoothScroll' : '' );

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
				this._endPass.bind(this),
				this.options.scrollStep
			);
		},

		_endPass: function () {
			this._updateResult();

			if ( this.pass < this.options.iterations ) {
				this._startPass();
				return;
			}

			this.result.reliabilityGrade = reliabilityReport.grade;

			if ( this.options.onCompletion ) {
				this.options.onCompletion(this.result);
				return;
			}

			this._generateReport();
		},

		start: function () {
			if ( !this.ready ) {
				setTimeout(this.start.bind(this), 500);
				return;
			}

			this.hideReport();

			this.pass = 0;
			this.result = {};

			setTimeout(this._startPass.bind(this), 100);
		},

		stop: function () {
			this.scroller.stop();
		},

		hideReport: function () {
			var frame = document.getElementById('scrollbench-report-iframe');

			if ( !frame ) return;

			document.documentElement.removeChild(frame);
		},

		_updateResult: function () {
			var result = this.scroller.getResult(),
				i;

			for ( i in result ) {
				this.result[i] = (this.result[i] || 0) + result[i];
			}

			this.result.avgTimePerPass = this.result.totalTimeInSeconds / this.pass;
		},

		_generateReport: function () {
			var iframe = document.createElement('iframe');
			iframe.style.cssText = 'position:fixed;z-index:2147483640;bottom:0;left:0;height:290px;width:100%;padding:0;margin:0;border:0';
			iframe.src = REPORT_URL + '#' + encodeURIComponent(JSON.stringify(this.result));
			iframe.id = 'scrollbench-report-iframe';
			document.documentElement.appendChild(iframe);

/*
			iframe = iframe.contentWindow || iframe.contentDocument || iframe.document;

			// open
			out  = '<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" type="text/css" href="http://lab.cubiq.org/scrollbench.js/css/report.css"></head><body><div id="report">';

			// header
			out += '<header><object id="logo" height="100%" data="http://lab.cubiq.org/scrollbench.js/images/scrollbenchjs-logo-anim.svg?stroke=f4f4f4" type="image/svg+xml"></object><h1>Report</h1><div id="moreinfo">? Info</div></header>';

			// main stats
			out += '<section id="stats"><table><tr><th>Total frames</th><td>' + this.result.numAnimationFrames + '</td></tr><tr><th>Dropped frames</th><td>' + this.result.droppedFrameCount + '</td></tr><tr><th>Total time</th><td>' + this.result.totalTimeInSeconds + '</td></tr><tr><th>Avg time</th><td>' + this.result.avgTimePerPass + '</td></tr><tr><th>Reliability grade</th><td class="reliability ' + reliabilityReport.grade + '">' + reliabilityReport.grade + '</td></tr>';
			out += '</table></section>';

			// close
			out += '</div></body></html>';

			iframe.document.open();
			iframe.document.write(out);
			iframe.document.close();
*/
		}
	};

window.ScrollBench = ScrollBench;

})(window, document);