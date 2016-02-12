var DomHelpers = {
  /**
   * wrap all children of element into a wrapper element
   *
   * @param {HTMLElement} element - the element who's children should be wrapped
   * @param {object} options - options.tag - the HTML tag of the wrapper
   * @returns {HTMLElement} the wrapper
   */
  wrapChildren: function(element, options) {
    options = options || {};
    var wrapper = document.createElement(options.tag || "div");
    for (var i = 0; i < element.childNodes.length; i++) {
      wrapper.appendChild(element.childNodes[i]);
    }
    element.appendChild(wrapper);
    return wrapper;
  },
  /**
   * unwrap the children of an element
   *
   * @param {HTMLElement} element - the element that contains a wrapper that should be removed. Copies all children of that wrapper into the element
   * @returns {void}
   */
  unwrapChildren: function(element) {
    var wrapper = element.removeChild(element.childNodes[0]);
    for (var i = 0; i < wrapper.childNodes.length; i++) {
      element.appendChild(wrapper.childNodes[i]);
    }
  },
  /**
   * browser detection
   * no mobile detection
   */
  detectBrowser: function() {
    var match;
    if (typeof navigator == 'undefined') {
      this.browser = 'node';
      return;
    }
    if (match = navigator.userAgent.match(/Edge\/([0-9]*)/)) {
      this.vendorPrefix = '-ms-';
      this.browserVersion = match[1];
      this.browser = "edge";
    } else if (match = navigator.userAgent.match(/MSIE ([0-9]*)/)) {
      this.vendorPrefix = '-ms-';
      this.browserVersion = match[1];
      this.browser = "ie";
    } else if (match = navigator.userAgent.match(/Trident.*rv\:([0-9]*)/)) {
      this.vendorPrefix = '-ms-';
      this.browserVersion = match[1];
      this.browser = "ie";
    } else if (match = navigator.userAgent.match(/Chrome\/([0-9]*)/)) {
      this.vendorPrefix = '-webkit-';
      this.browserVersion = match[1];
      this.browser = "chrome";
    } else if (match = navigator.userAgent.match(/Firefox\/([0-9]*)/)) {
      this.vendorPrefix = '-moz-';
      this.browserVersion = match[1];
      this.browser = "firefox";
    } else if (match = navigator.userAgent.match(/Safari\/([0-9]*)/)) {
      this.vendorPrefix = '-webkit-';
      this.browserVersion = match[1];
      this.browser = "safari";
    } else if (match = navigator.userAgent.match(/AppleWebKit/)) {
      this.vendorPrefix = '-webkit-';
      this.browserVersion = 0;
      this.browser = "webkit";
    }
  },
  calculatePrefixes: function(prefixable) {
    this.cssPrefix = this.cssPrefix || {};
    for (var i = 0; i < prefixable.length; i++) {
      this.cssPrefix[prefixable[i]] = (this.vendorPrefix && (this.vendorPrefix + prefixable[i])) || prefixable[i];
    }
  },
  postAnimationFrame: function(callback) {
    rf = window.requestAnimationFrame || function(cb) {
      setTimeout(cb, 1000 / 60);
    };
    rf(function() {
      // make sure to get behind the current render thread
      setTimeout(callback, 0);
    });
  }
}
DomHelpers.detectBrowser();
DomHelpers.calculatePrefixes(['transform', 'transform-origin']);

module.exports = DomHelpers;