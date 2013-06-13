Scrollbench
=========

Scrollbench is a browser scrolling performance test. Scrollbench:

 - Runs as a bookmarklet so it can work widely (including mobile), or can be invoked from JS on a page.
 - Uses the best frame time measurement methodology available on the platform; most commonly `requestAnimationFrame` callbacks, hi-resolution timer `window.performance.now()`, and `window.scrollBy()`.
 - Still doesn't give very accurate results in many cases (see below for why).


## About

Complex DOM structure, sophisticated styling, and how the rendering engine chooses to deal with them all influence framerates during scrolling. Scrollbench tries to measure the framerate of a scroll and reports the average frame time as well as how many frames went significantly beyond that average (to give a sense of how steady the framerate is, which can be just as important as the average).

Scrollbench was originally a little piece of a performance test in the Chromium project that was ripped out to live on its own here so it could be run in other browsers and contexts.

## Methodology

### Current Best Practices

It is important to note that you shouldn't compare browsers that support different set of technologies. The benchmark is performed using the best API we can find on the platform, but a browser that supports requestAnimationFrame will have very different results compared to one that only has setTimeout.

For this reason at the end of the test you'll get an index which defines the browser "resolution".

Presently we have 3 resolutions: High, Medium and Low. You should be comparing browsers at the same resolution index only. Clicking on the Resolution value in the report you'll also get a detailed list of the technologies used to perform the benchmark.

Don't mix apples and oranges!

### Test Reliability

The more sophisticated your browser the more reliable the benchmark. On recent browsers we can rely on requestAnimationFrame which grants the test a good resolution but that's only a part of the equation. We also need a high definition timer. A good candidate in this case would be window.performance.now.

So if you have both, the test result is considered reliable.

If one feature is missing we fall back to the closest alternative, which in case of requestAnimationFrame is setTimeout (notoriously a low definition timer).

In some cases, though, a JavaScript-driven scroll is never going to emulate a user-initiated scroll very accurately. For instance, on many browsers on touch devices scrolling is done asynchronously (the user flings the page and it keeps going). For the test to be reliable on such devices we need support for triggering an asyncronous scroll from JavaScript, _and_ we need a way measure framerate from the part of the browser that's moving the page (rather than measuring with requestAnimationFrame callbacks, which might be blocked by other JavaScript while the browser's compositor or UI thread cheerfully continues to scroll the page).

Unfortunately today we lack both an asynchronous scroll API and way of measuring framerate that doesn't . This is a hard problem, because if frame rates from the perspective of JavaScript (i.e. requestAnimationFrame) and the user (i.e. what the browser is currently putting on-screen) are different... what does frame rate even mean? 

So don't mix apples and oranges on the current technology being used, but also don't be surprised if the apples taste like papayas.

## Quick start

The easiest way to use Scrollbench.js is through the bookmarklet.

1. Make a new bookmark (e.g. just bookmark this site).
2. Edit the bookmarklet to have the name "scrollbench" and set its URL to this:

            `javascript:!function(){function e(){window.ScrollBench&&new ScrollBench({loadConfig:!0}).start()}if(!window.ScrollBench&&!window.scrollbench_bookmarklet){window.scrollbench_bookmarklet=!0;var n=document.createElement('script');return n.src='https://raw.github.com/natduca/scrollbench.js/master/src/scrollbench.js',n.addEventListener('load',e,!1),document.getElementsByTagName('head')[0].appendChild(n),void 0}e()}();`
    
3. There is no 3, just run the bookmarklet:
    * On desktop browsers just click it.
    * On iOS Safari open the bookmarks list and select it.
    * On Chrome for Android, start typing "scrollbench" in the omnibox and hit "scrollbench" when it shows up in the suggestions list.

#### iOS
Note that on iOS, it's a little tricky to edit the bookmarklet: first save the bookmark, then open the bookmarks panel and edit the bookmark you just added. You are now able to modify the site address. Replace the address with the bookmarklet code and voilà!

#### IE10
No bookmarklets in IE10, but you can invoke it through the F12 tools console:

1. Open developer tools with "F12" and go to "Console"
2. Execute:

    ```javascript
    document.head.innerHTML+="<script src='http://domain.com/fil.js'></script>";
    ```
    
3. Execute:

    ```javascript
    var sb = new ScrollBench(); sb.start();
    ```

## Interpretting Results

After running, scrollbench spits out some results in a report. Most of them are self-explanatory, but a few are difficult to understand. Here's the list:

* Time: total time the test took to run, in seconds, across all runs. Also an average time per run.
* Travel: distance scrolled in pixels. Note on infinite scroll pages (or pages that change the DOM while the test is running) this might not be the same as the height of the page.
* FPS: frames per second of the animation, as defined by the number of frames generated in JavaScript. Note this might not be the same as frames seen by the user! This value is averaged across the duration of the animation, but the longest frame is also reported (since outliers represent bad jank).
* Steadines: a rough, opiniated measurement of how steady the framerate was. This counts the number of frames that are more than 10% longer or shorter than average. The steadiness number is poor if more than 10% of the frames are more than 10% longer or shorter than average.
* Resolution: a rough measurement of the test's accuracy based on the technique used for timing (date.now vs window.performance.now) and drawing (setTimeout vs requestAnimationFrame)
* Overall: a rough measurement of how well the page did on the test. 5★ only if Steadiness is good and FPS is high. 4★ if FPS is high and Steadiness is mediocre. 3★ if FPS and Steadiness are mediocre. 2★ and 1★ if FPS and Steadiness are poor.


## Per-page configuration

Sometimes a page doesn't scroll the body, but instead scroll a container element (that has an `overflow: scroll` property set). It's hard to know which element to scroll automatically, so we keep a list of pages to handle specially in `src/config.js`

We welcome additions! To add a new one, copy an existing example -- the basic format is:

```javascript
// Site name
config.pages.push({
      url: '^https://www.example.com/',
    element: document.getElementById('containerElement')
  });
```

You can also use `scrollElementFn` instead of `element` to write a function that finds the element that scrolls. See the documentation below for more on how that works.

Feel free to send a pull request with additional pages added to the config file.

## JavaScript Documentation

Scrollbench can be used from a web page like so:

```html
<head>
...
<script src="scrollbench.js" type="text/javascript"></script>
</head>
```

You can then invoke the scrollbench from inside your code or the debug console with the following:

```javascript
var sb = new ScrollBench();
sb.start();
```

Scrollbench.js (SBJS) is a class, to use it you have to create an instace with `new`. The script initiates itself but does not perform any actual benchmark until you call the start method.

### Options

SBJS accepts one paramenter for special configuration. The parameter must be an object and the accepted values are:

1. **element**: reference to a node object. SBJS can scroll both the whole page or a DOM element. Default: document.documentElement.
1. **initViewport**: boolean. If true the viewport is set to initial scale 1.0. Default: false.
1. **iterations**: an integer representing the number of passes to perform. Minimum suggested and default: 2.
1. **loadConfig**: boolean or string. Loads per site configurations from either the default config file or an user defined file. Default: 2.
1. **onCompletion**: function. Returns the results to a custom function. Default: null
1. **scrollableElementFn**: function. Function to be executed to find the scrollable element. Default: null
1. **scrollStep**: integer value. In case of synchronous scroll, the amount of pixels to scroll per cycle. Default: 100
1. **waitForFn**: function. Holds back the benchmark execution until the passed function returns true. Default: null

#### Options: Element

SBJS scrolls the DOM element with id="scrollme":

```javascript
new ScrollBench({
    element: document.getElementById('scrollme')
}).start();
```

By default SBJS scrolls the whole page (namely: document.documentElement). There are special cases where the content is contained inside an element and scrolling the document wouldn't have any effect. In those cases you can specify the element that needs to be scrolled.

#### Options: initViewport

Sets the viewport to scale factor 1.0:

```javascript
new ScrollBench({
  initViewport: true
}).start();
```

This may be useful on mobile devices. If the website doesn't define the viewport size, the mobile browser tries to fit the page on the screen, but each screen/device will have a different scale factor. To get consistent benchmark results you can force the viewport scale factor to 1.0.

#### Options: iterations

Performs the test 5 times instead of the default 2:

```javascript
new ScrollBench({
  iterations: 5
}).start();
```

For better reliability the test is performed 2 times by default, but this value can be raised for higher resolution. The browser often needs a "warm up" period to reach the highest performance level, so the first pass has sometimes a lower performance rate.

#### Options: loadConfig

Loads the default per site config file

javascriptnew ScrollBench({
  loadConfig: true
}).start();
Any of the SBJS options can be passed on a per site basis from an user defined configuration file. By default no file is loaded, passing true SBJS loads the default config. You may alternatively pass an URL the configuration file is loaded from.

The configuration is a javascript file that sets the scrollbench_config variable. See the default config for reference.

Note that the bookmarklet loads the default config file but this is not the default SBJS behavior.

#### Options: onCompletion

Bypasses the default report and simply shows an alert box with the results:

```javascript
new ScrollBench({
  onCompletion: function (result) {
    alert(JSON.stringify(result, null, ' '))
  }
}).start();
```

The parameter returned by the function has the following keys:

* numAnimationFrames: total number of frames of the animation
* droppedFrameCount: number of frames dropped (ie: performed with low frame rate)
* totalTimeInSeconds: runtime
* resolution: test reliability based on browser specs
* timer: timer used for the test
* animation: technology used to perform the animation
* avgTimePerPass: average time needed for each pass
* framesPerSecond: frames per second the animation is performed at (estimated)
* travel: pixels travelled by the animation

A value can be followed by a !, - or + meaning respectively: bad, average, good result.

The results are shown by default in an overlaying iFrame, you may want to pass them to a custom function for further inspection. The results will be passed as first parameter to the specified fuction. The default internal report is not executed.

#### Options: scrollableElementFn

Tricky code to get the scrollable element on Gmail:

```javascript
new ScrollBench({
    scrollableElementFn: function (callback) {
        gmonkey.load('2.0',
            function (api) {
                callback(api.getScrollableElement());
            }
        );
    }
}).start();
```

In some circumstances it's not possible to foresee the element that should be scrolled. In those cases we can rely on a custom function. The element must be sent as first parameter of a callback function.

#### Options: scrollStep

Increase the number of frames by reducing the scrolling step from the default 100 to 50:

```javascript
new ScrollBench({
  scrollStep: 50
}).start();
```

The scrolling is normally performed with a 100 pixels step. Each step is a frame. You may want to increase of decrease the number of frames by altering the scrollStep.

#### Options: waitForFn

Wait for the element waitForMe to be loaded before starting the benchmark.

```javascript
new ScrollBench({
    waitForFn: function () {
        return document.getElementById('waitForMe');
    }
}).start();
```

The passed function is executed repeatedely until it doesn't returs true. When it is finally true, the benchmark begins.


## Getting Involved

Scrollbench could be way better! Here are some ways to help:

1. Test it on various sites! If you find one that doesn't work, either file an issue or better yet, add a custom handler for it in `src/config.js` and send us a pull request (see "Per-page configuration" above for more info).
2. Test it on various browsers! If you find a page that only fails in one browser, file an issue.
3. Make the code better! Pull requests welcome, or if you have ideas on how this could be improved to be more accurate and want to talk about it, file an issue.

## Updating the bookmarklet code

To update the bookmarklet code (e.g. to change where the source files are served from) you need node and uglify-js installed first. Then modify src/bookmarklet.js as you see fit, and then in the `build` direction run `node makebm.js`, which will minify src/bookmarklet.js and (theoretically) update anywhere the bookmarklet code appears with an updated copy.
