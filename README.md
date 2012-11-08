# Scroll.js, a Browser Scrolling Benchmark

Scroll.js is a simple bit of javascript that can be used to instrument scrolls on a web page. It’s goal is to measure scrolling framerate as accurately as possible across browsers.

##Methodology

To measure scrolling effectively it’s critical that instrumentation:
 * Interferes minimally with normal browser behavior
 * Is as precise as possible

For this reason, scroll.js is built on top of `requestAnimationFrame` callbacks and `window.performance.now` to measure frame times during a scroll triggered by window.scrollBy. In modern browsers `requestAnimationFrame` interferes least with browser rendering during a scroll (compared to other event handlers, such as scroll event handlers, or timers). High-precision timers like `window.performance.now` provide the timer granularity necessary to accurately measure frame times that should be around 16.6ms for a fast page on a 60Hz screen.

The rough methodology is:

1. Set up a requestAnimationFrame callback that:
 1. Checks to see if we've hit the bottom of the page
 2. Records the time delta between the last frame and this frame, as reported by `requestAnimationFrame`'s timestamp
2. Kicks off a scroll to the bottom of the page using `window.scrollBy`

We end up with a list of frame times for the duration of the scroll. From this we can infer average frame rate, how many frames were "missed" (e.g. longer than 1/60 ms on a 60Hz display), etc.


### Note yet real:

### Running the Benchmark

Just copy the contents of bin/scroll-js-bookmarklet.js to any page in the console or install it as a bookmarklet.

### Building the Benchmark

We keep the contents of the benchmark un-minified for simplicity, but to build the minified bookmarklet JS just run:
