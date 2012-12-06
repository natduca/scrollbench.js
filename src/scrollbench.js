// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function (window, document) {
	var
	now = (function () {
		var perfNow = window.performance &&
				(performance.now		||
				performance.webkitNow	||
				performance.mozNow		||
				performance.msNow		||
				performance.oNow);

		return perfNow ?						// browser may support performance but not performance.now
			perfNow.bind(window.performance) :
			Date.now ?							// Date.now should be noticeably faster than getTime
				Date.now :
				function getTime () { return new Date().getTime(); };
	})(),

	rAF = window.requestAnimationFrame		||
		window.awebkitRequestAnimationFrame	||
		window.mozRequestAnimationFrame		||
		window.oRequestAnimationFrame		||
		window.msRequestAnimationFrame		||
		function (callback) { window.setTimeout(callback, 1000 / 60); },

	gpuBenchmarking = window.chrome && window.chrome.gpuBenchmarking;


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
			var doc = document.documentElement,
				body = document.body;

			return {
				left: doc && doc.scrollLeft || body && body.scrollLeft || 0,
				top: doc && doc.scrollTop  || body && body.scrollTop  || 0
			};
		},

		_step: function (timestamp) {
			if ( this.element.clientHeight + this.scrollY >= this.element.scrollHeight ) {
				this.rolling = false;
				this.callback();
			}

			if ( !this.rolling ) return;

			rAF(this._step.bind(this));

			this.timeFrames.push(now());

			if ( this._getScrollPosition().top !== this.scrollY ) return;	// browser wasn't able to scroll within 16ms (TODO: double check this!)

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
			// TODO: how do you stop a smoothScrollBy? Should we scroll by steps?
			//chrome.gpuBenchmarking.smoothScrollBy(0);
		},

		_step: function () {
			var stats = chrome.gpuBenchmarking.renderingStats();
			stats.totalTimeInSeconds = now() / 1000;

			return stats;
		}
	};

///////////////////////////

	function ScrollBench (options) {
		this.options = {
			element: null,
			iterations: 2,
			scrollStep: 100,
			scrollDriver: '',
			onCompletion: null
		};

		for ( var i in options ) this.options[i] = options[i];

		this.element = this.options.element || document.documentElement;

		if ( !this.options.scrollDriver ) {
			this.options.scrollDriver = gpuBenchmarking && window.chrome.gpuBenchmarking.smoothScrollBy && this.element == document.documentElement ? 'smoothScroll' : '';
		}
	}

	ScrollBench.prototype = {
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

			alert(JSON.stringify(this.result, null, '  '));
		},

		start: function () {
			var that = this;
			
			this.pass = 0;
			this.result = {};

			setTimeout(this._startPass.bind(this), 0);
		},

		stop: function () {
			this.scroller.stop();
		},

		_updateResult: function () {
			var result = this.scroller.getResult(),
				i;

			for ( i in result ) {
				this.result[i] = (this.result[i] || 0) + result[i];
			}

			this.result.avgTimePerPass = this.result.totalTimeInSeconds / this.pass;
		}
	};

window.ScrollBench = ScrollBench;

})(window, document);
