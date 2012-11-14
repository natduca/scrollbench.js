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
				function () { return new Date().getTime(); };
	})(),

	rAF = window.requestAnimationFrame		||
		window.webkitRequestAnimationFrame	||
		window.mozRequestAnimationFrame		||
		window.oRequestAnimationFrame		||
		window.msRequestAnimationFrame		||
		function (callback) { window.setTimeout(callback, 1000 / 60); },

	gpuBenchmarking = window.chrome && window.chrome.gpuBenchmarking;

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
		_scrollStep: function () {
			if ( this.doStop ) {
				this.doStop = false;
				return;
			}

			this.scrollY += this.options.scrollStep;

			if ( this.element == document.body ) {
				window.scrollTo(0, this.scrollY);
			} else {
				this.element.scrollTop += this.options.scrollStep;
			}
			
			if ( this.clientHeight + this.scrollY < this.element.scrollHeight ) {
				rAF(this._scrollStep.bind(this));
				this.frames.push(now());
				return;
			}

			if ( this.pass < this.options.iterations ) {
				this._updateResult();
				this._startPass();
				return;
			}

			this._updateResult();
			console.log(this.result);
		},

		_startPass: function () {
			this.pass++;
			this.scrollY = 0;
			this.element.scrollTop = 0;
			this.frames = [];

			this._scrollStep();
		},

		start: function () {
			var that = this;

			this.clientHeight = this.element == document.body ? window.innerHeight : this.element.clientHeight;
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
			var result = {};

			result.numAnimationFrames = this.frames.length;
			result.droppedFrameCount = this._getDroppedFrameCount();
			result.totalTimeInSeconds = (this.frames[this.frames.length - 1] - this.frames[0]) / 1000;

			this.result.numAnimationFrames += result.numAnimationFrames;
			this.result.droppedFrameCount += result.droppedFrameCount;
			this.result.totalTimeInSeconds += result.totalTimeInSeconds;
			this.result.avgTimePerPass = this.result.totalTimeInSeconds / this.pass;
		},

		_getDroppedFrameCount: function () {
			var droppedFrameCount = 0,
				frameTime,
				i = 1,
				l = this.frames.length;

			for ( i = 1; i < l; i++ ) {
				frameTime = this.frames[i] - this.frames[i-1];
				if (frameTime > 1000 / 55) droppedFrameCount++;		// Shouldn't it be more like 58-59?
			}

			return droppedFrameCount;
		}
	};

window.ScrollBench = ScrollBench;

})(window, document);