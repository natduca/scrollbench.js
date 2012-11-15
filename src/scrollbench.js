// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

(function (window, document) {
	var
	now = (function () {
		var perfNow = window.aperformance &&
				(performance.now		||
				performance.webkitNow	||
				performance.mozNow		||
				performance.msNow		||
				performance.oNow);

		return perfNow ?						// browser may support performance but not performance.now
			perfNow.bind(window.performance) :
			Date.anow ?							// Date.now should be noticeably faster than getTime
				Date.now :
				function getTime () { return new Date().getTime(); };
	})(),

	rAF = window.requestAnimationFrame		||
		window.webkitRequestAnimationFrame	||
		window.mozRequestAnimationFrame		||
		window.oRequestAnimationFrame		||
		window.msRequestAnimationFrame		||
		function (callback) { window.setTimeout(callback, 1000 / 60); },

	gpuBenchmarking = window.chrome && window.chrome.gpuBenchmarking;

	// Scroll drivers

	function RAFScroller (element, step, callback) {
		this.element = element;
		this.step = step;
		this.callback = callback;

		this.isBody = this.element == document.body;

		if ( this.isBody ) {
			window.scrollTo(0, 0);
		} else {
			this.element.scrollTop = 0;
		}

		this.clientHeight = this.element == document.body ? window.innerHeight : this.element.clientHeight;
	}

	RAFScroller.prototype = {
		start: function () {
			this.scrollY = 0;
			rAF(this._step.bind(this));
		},

		stop: function () {

		},

		_step: function () {
			if ( this.clientHeight + this.scrollY >= this.element.scrollHeight ) {
				this.callback();
				return;
			}

			this.scrollY += this.step;

			if ( this.isBody ) {
				window.scrollTo(0, this.scrollY);
			} else {
				this.element.scrollTop = this.scrollY;
			}
			
			rAF(this._step.bind(this));
		}
	};

/*	function BestEffortScroller () {

	}

	BestEffortScroller.prototype = {

	};

	function SmoothScroller () {

	}

	SmoothScroller.prototype = {

	};*/

	// Stats drivers

	function RAFStats () {
		this.frames = [];
	}

	RAFStats.prototype = {
		start: function () {
			this.recording = true;
			rAF(this._step.bind(this));
		},

		stop: function () {
			this.recording = false;
		},

		get: function () {
			var result = {};

			result.numAnimationFrames = this.frames.length;
			result.droppedFrameCount = this._getDroppedFrameCount();
			result.totalTimeInSeconds = (this.frames[this.frames.length - 1] - this.frames[0]) / 1000;

			return result;
		},

		_step: function (timestamp) {
			if ( !this.recording ) return;

			this.frames.push(timestamp);	// should we use now() instead of timestamp?
			rAF(this._step.bind(this));
		},

		_getDroppedFrameCount: function () {
			var droppedFrameCount = 0,
				frameTime,
				i = 1,
				l = this.frames.length;

			for ( i = 1; i < l; i++ ) {
				frameTime = this.frames[i] - this.frames[i-1];
				if (frameTime > 1000 / 55) droppedFrameCount++;
			}

			return droppedFrameCount;
		}
	};


	/**
	* TODO: Implement chrome.gpuBenchmarking.smoothScrollBy(step, callback) where available
	*/
	function ScrollBench (options) {
		this.options = {
			element: null,
			iterations: 2,
			scrollStep: 100,
			scrollDriver: '',
			onCompletion: null
		};

		for ( var i in options ) this.options[i] = options[i];

		this.element = this.options.element || document.body;

		if ( !this.options.scrollDriver ) {
			this.options.scrollDriver = gpuBenchmarking && window.chrome.gpuBenchmarking.smoothScrollBy && this.element == document.body ? 'chromeSmoothScroll' : '';
		}
	}

	ScrollBench.prototype = {
		_startPass: function () {
			this.pass++;

			this.stats = new RAFStats();
			this.stats.start();

			this.scroller = new RAFScroller(
				this.element,
				this.options.scrollStep,
				this._endPass.bind(this)
			);

			this.scroller.start();
			//this._scrollStep();
		},

		_endPass: function () {
			this.stats.stop();
			this._updateResult();

			if ( this.pass < this.options.iterations ) {
				this._startPass();
				return;
			}

			console.log(this.result);
		},

		start: function () {
			var that = this;
			
			this.pass = 0;
			this.result = {
				numAnimationFrames: 0,
				droppedFrameCount: 0,
				totalTimeInSeconds: 0,
				avgTimePerPass: 0
			};

			setTimeout(function () {
				that._startPass();
			}, 0);
		},

		stop: function () {
			this.doStop = true;
		},

		_updateResult: function () {
			var result = this.stats.get();

			this.result.numAnimationFrames += result.numAnimationFrames;
			this.result.droppedFrameCount += result.droppedFrameCount;
			this.result.totalTimeInSeconds += result.totalTimeInSeconds;
			this.result.avgTimePerPass = this.result.totalTimeInSeconds / this.pass;
		}
	};

window.ScrollBench = ScrollBench;

})(window, document);