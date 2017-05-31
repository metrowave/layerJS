'use strict';
var defaults = require('./defaults.js');
var TMat = require('./tmat.js');

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
    var wrapper = element.ownerDocument.createElement(options.tag || "div");
    while (element.childNodes.length) {
      wrapper.appendChild(element.childNodes[0]);
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
    var wrapper = element.removeChild(element.children[0]);
    while (wrapper.childNodes.length) {
      element.appendChild(wrapper.childNodes[0]);
    }
  },
  addClass: function(element, className) {
    element.className += (element.className ? " " : "") + className;
  },
  removeClass: function(element, className) {
    element.className = element.className.replace(new RegExp("(?:\\s+|^)" + className + "(?:\\s+|$)"), "");
  },
  /**
   * browser detection
   * no mobile detection
   */
  detectBrowser: function() {
    var match;
    if (typeof navigator === 'undefined') {
      this.browser = 'node';
      return;
    }
    if ((match = navigator.userAgent.match(/Edge\/([0-9]*)/))) {
      this.vendorPrefix = '-ms-';
      this.browserVersion = match[1];
      this.browser = "edge";
    } else if ((match = navigator.userAgent.match(/MSIE ([0-9]*)/))) {
      this.vendorPrefix = '-ms-';
      this.browserVersion = match[1];
      this.browser = "ie";
    } else if ((match = navigator.userAgent.match(/Trident.*rv\:([0-9]*)/))) {
      this.vendorPrefix = '-ms-';
      this.browserVersion = match[1];
      this.browser = "ie";
    } else if ((match = navigator.userAgent.match(/Chrome\/([0-9]*)/))) {
      this.vendorPrefix = '-webkit-';
      this.browserVersion = match[1];
      this.browser = "chrome";
    } else if ((match = navigator.userAgent.match(/Firefox\/([0-9]*)/))) {
      this.vendorPrefix = '';
      this.browserVersion = match[1];
      this.browser = "firefox";
    } else if ((match = navigator.userAgent.match(/Safari\/([0-9]*)/))) {
      this.vendorPrefix = '-webkit-';
      this.browserVersion = match[1];
      this.browser = "safari";
    } else if ((match = navigator.userAgent.match(/AppleWebKit/))) {
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
  /**
   * execute after the next renderloop
   * needed to ensure a previous transform has been applied so we can now apply a new transform with a transition
   * NOTE: if this is too slow (at least 16ms), we may try to apply the first transform also with a transision (1ms)
   * and listen for transitionEnd event
   *
   * @param {Function} callback - the function to be executed
   * @returns {void}
   */
  postAnimationFrame: function(callback) {
    var rf = window.requestAnimationFrame || function(cb) {
      setTimeout(cb, 1000 / 60);
    };
    rf(function() {
      // make sure to get behind the current render thread
      setTimeout(callback, 0);
    });
  },
  /**
   * select a layerJS view object using a CSS selector
   * returns only the first view it finds.
   *
   * @param {string} selector - a CSS selector that identifies an element that is associated with a NodeView OR the element itself
   * @returns {NodeView} the selected view object
   */
  selectView: function(selector) {
    var nodes;
    if (selector instanceof HTMLElement) {
      nodes = [selector];
    } else {
      nodes = document.querySelectorAll(selector);
    }
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i]._ljView) return nodes[i]._ljView;
    }
  },
  /**
   * similar to jquery delegated bind. Will "bind" to all elements matching selector, even if those are added after the listener was added.
   *
   * @param {HTMLElement} element - the root element within which elements specified by selector exist or will exist
   * @param {string} eventName - which event type should be bound
   * @param {string} selector - the selector for elements that shoud be bound
   * @param {funcion} fn - the listener
   * @returns {Type} Description
   */
  addDelegtedListener: function(element, eventName, selector, fn) {
    // install Element.matches polyfill method
    if (!window.Element.prototype.matches) {
      window.Element.prototype.matches =
        window.Element.prototype.matchesSelector ||
        window.Element.prototype.mozMatchesSelector ||
        window.Element.prototype.msMatchesSelector ||
        window.Element.prototype.oMatchesSelector ||
        window.Element.prototype.webkitMatchesSelector ||
        function(s) {
          var matches = (this.document || this.ownerDocument).querySelectorAll(s),
            i = matches.length;
          while (--i >= 0 && matches.item(i) !== this) {} // jshint ignore:line
          return i > -1;
        };
    }
    element.addEventListener(eventName, function(event) {
      var el = event.target;
      while (el !== element && !el.matches(selector)) {
        el = el.parentNode;
      }
      if (el !== element) {
        fn.call(el, event);
      }
    });
  },
  /**
   * compare position of two HTML elements in source order
   *
   * @param {HTMLElement} a - the first element
   * @param {HTMLElement} b - the second element
   * @returns {Number} 1 if a is after b; -1 otherwise
   */
  comparePosition: function(a, b) {
    if (a === b) return 0;
    if (!a.compareDocumentPosition) {
      // support for IE8 and below
      return a.sourceIndex - b.sourceIndex;
    }
    var cmp = a.compareDocumentPosition(b);

    /*jslint bitwise: true */
    if ((cmp & window.Node.DOCUMENT_POSITION_DISCONNECTED)) throw "compare position: the two elements belong to different documents";
    if ((cmp & window.Node.DOCUMENT_POSITION_PRECEDING) || (cmp & window.Node.DOCUMENT_POSITION_CONTAINS)) return 1;
    return -1;
    /*jslint bitwise: false */
  },
  /**
   * Will get the value for a data-lj-* or lj-* attribute
   *
   * @param {HTMLElement} element
   * @param {string} name - the attribute name
   * @returns {string}
   */
  getAttributeLJ: function(element, name) {
    return element.getAttribute('data-lj-' + name) || element.getAttribute('lj-' + name);
  },
  /**
   * Check if the element has a data-lj-* or lj-* attribute defined
   *
   * @param {HTMLElement} element
   * @param {string} name - the attribute name
   * @returns {boolean}
   */
  hasAttributeLJ: function(element, name) {
    return element.hasAttribute('data-lj-' + name) || element.hasAttribute('lj-' + name);
  },
  /**
   * Set the data-lj-* or lj-* attribute
   *
   * @param {HTMLElement} element
   * @param {string} name - the attribute name
   * @param {string} value - the attribute value
   */
  setAttributeLJ: function(element, name, value) {
    name = 'lj-' + name;
    if (element.getAttribute('data-' + name)) {
      element.setAttribute('data-' + name, value);
    } else {
      element.setAttribute(name, value);
    }
  },
  /**
   * Will try to find a parent view of a specific type
   *
   * @param {HTMLElement} element
   * @param {string} type - the view type to look
   * @returns {Object} a view
   */
  findParentViewOfType: function(element, type) {
    var parent = element.parentElement;
    var found = false;

    while (parent && !found) {
      if (parent._ljView && parent._ljView.type() === type) {
        found = true;
      } else {
        parent = parent.parentElement;
      }
    }

    return found ? parent._ljView : undefined;
  },
  timeToMS: function(time) {
    var match = time && time.match(/^([\d\.]*)(s|ms|min|h)$/);
    if (!match) return 0;
    switch (match[2]) {
      case 'ms':
        return match[1];
      case 's':
        return match[1] * 1000;
      case 'min':
        return match[1] * 60 * 1000;
      case 'h':
        return match[1] * 60 * 60 * 1000;
    }
    return 0;
  },
  /**
   * will convert a css dimension value (e.g. 3px, 4em, 6vh) into a number representing pixels
   *
   * @param {string|number} value - the value to be converted
   * @param {HTMLElement} element - needed for dimensions based on 'em'; note: 'ex' is not supported
   * @returns {number} dimension in pixels
   */
  parseDimension: function(value, element) {
    if (!isNaN(Number(value))) return Number(value);
    if (value.match(/px$/)) return parseInt(value);
    if (value.match(/em$/)) return parseInt(value) * parseInt(window.getComputedStyle(element)['font-size']);
    if (value.match(/vh$/)) return parseInt(value) * window.innerHeight / 100;
    if (value.match(/vw$/)) return parseInt(value) * window.innerWidth / 100;
    // FIXME: '%' missing
    return undefined;
  },
  /**
   * Will generate a unique id for a specific prefix (layerJS type). The id is scoped
   * to the current document.
   *
   * @param {string} prefix - a prefix (layerJS type)
   * @param {Object} doc - the document to generate a unique id from
   * @returns {string} a unique id
   */
  uniqueID: function(prefix, doc) {
    doc = doc || document;
    if (doc._ljUniqueHash === undefined) {
      doc._ljUniqueHash = {};
    }
    var uniqueHash = doc._ljUniqueHash;
    prefix = prefix || -1;
    if (uniqueHash[prefix] === undefined) {
      uniqueHash[prefix] = -1;
    }
    if (prefix !== -1) {
      return prefix + "[" + (++uniqueHash[prefix]) + "]";
    } else {
      return ++uniqueHash[prefix];
    }
  },
  /**
   * Will parse the url for a location, queryString and hash
   *
   * @param {string} url - url to parse
   * @returns {Object} An object that contains the location, queryString and hash based on the provided url
   */
  splitUrl: function(url) {
    // this regular expression does not always works
    var match = url.match(/^([^?#]*)?(?:\?([^#]*))?(?:#(.*))?$/);
    return {
      location: match[1],
      queryString: match[2],
      hash: match[3]
    };
    /*
        var splitted = url.split('?');
        var before = splitted[0];
        var queryString = '';
        var hash = '';

        if (splitted.length > 1) {
          splitted = splitted[1].split('#');
          queryString = splitted[0];
          hash = splitted.length > 1 ? splitted[1] : '';
        } else {
          splitted = splitted[0].split('#');
          before = splitted[0];
          hash = splitted.length > 1 ? (splitted[1]) : '';
        }

        return {
          location: before,
          queryString: queryString,
          hash: hash
        };*/
  },
  /**
   * take splitted url an rejoin
   *
   * @param {Object} splitted - the splitted url
   * @param {bool} noHash - when true, the hash will be ommitted
   * @returns {string} url
   */
  joinUrl: function(splitted, noHash) {
    var result = (splitted.location ? splitted.location : "") + (splitted.queryString ? "?" + splitted.queryString : "");

    if (noHash !== true)
      result += splitted.hash ? "#" + splitted.hash : "";

    return result;
  },
  /**
   * Will parse a string for transition parameters
   *
   * @param {string} string - A string to parse for transition parameters
   * @param {boolean} keepParameters - If true, the transitionParameters will not be removed from the string
   * @returns {Object} An object that contains a string and a transition object
   */
  parseStringForTransitions: function(string, keepParameters) {
    var transition = {};

    if (string) {
      for (var parameter in defaults.transitionParameters) {
        if (defaults.transitionParameters.hasOwnProperty(parameter)) {
          var parameterName = defaults.transitionParameters[parameter];
          var regEx = new RegExp("(?:^|[?&])" + parameterName + "=([^&]+)");
          var match = string.match(regEx);
          if (match) {
            transition[parameter] = match[1];
            if (true !== keepParameters) {
              string = string.replace(regEx, '');
            }
          }
        }
      }
    }

    return {
      string: string,
      transition: transition
    };
  },
  /**
   * Will parse an url for transition parameters
   *
   * @param {string} url - An url to parse
   * @param {boolean} keepParameters - If true, the transitionParameters will not be removed from the string
   * @returns {Object} An object that contains a url and a transition object
   */
  // parseQueryString: function(url, keepParameters) {
  //   var parsedUrl = this.splitUrl(url);
  //   var parsed = this.parseStringForTransitions(parsedUrl.queryString, keepParameters);
  //
  //   return {
  //     transition: parsed.transition,
  //     url: parsedUrl.location + (parsed.string.length > 0 ? (parsed.string) : '') + (parsedUrl.hash.length > 0 ? (parsedUrl.hash) : '')
  //   };
  // },
  /**
   *  Will transform a relative url to an absolute url
   * https://davidwalsh.name/get-absolute-url
   * @param {string} url to tranform to an absolute url
   * @return {string} an absolute url
   */
  getAbsoluteUrl: (function() {
    var a = document.createElement('a');
    return function(url) {
      a.href = url;
      return a.href;
    };
  })(),

  /**
   *  Will return all parents of a node in DOM order
   * https://gist.github.com/benpickles/4059636
   * @param {object} node an node who's parents we need to find
   * @return {array} Array of the DOM parents of the node. Tomost parent comes first
   */
  _parents: function(node) {
    // Place the first node into an array
    var nodes = [node];

    // As long as there is a node
    for (; node; node = node.parentNode) {
      // Place that node at the beginning of the array
      // This unravels the tree into an array with child/parents only
      nodes.unshift(node);
    }
    // Return the array
    return nodes;
  },

  /**
   *  Will return the common parent between 2 nodes
   * https://gist.github.com/benpickles/4059636
   * @param {object} node
   * @param {object} node
   * @return {object} common parent
   */
  commonParent: function(node1, node2) {
    // Get the hierarchy arrays
    var parents1 = this._parents(node1);
    var parents2 = this._parents(node2);

    /* At this point we have two hierarchies. Although DOM can go x steps up to
     ** a common parent node, top down will be equal for a common ancestor, as
     ** the difference to the top is only after we break past the common ancestor.
     ** After that, the common node has the same parent as the other node, so it's
     ** the same all the way to the top. (If that doesn't make sense, thing about
     ** it, and maybe draw it out).
     */

    // Ensure we have found a common ancestor, which will be the first one if anything
    if (parents1[0] !== parents2[0]) return null;

    /* Otherwise, traverse down the hierarchy until we reach where they're no longer
     ** the same. Then return one up, which is the closest, common ancestor.
     */
    for (var i = 0; i < parents1.length; ++i) {
      // If we found the split, return the one above it
      if (parents1[i] !== parents2[i]) return parents1[i - 1];
    }

    // Formality, even though we'll never make it this far
    return null;
  },
  getMatrixArray: function(element) {
    var st = window.getComputedStyle(element, null);
    var tr = st.getPropertyValue("-webkit-transform") ||
      st.getPropertyValue("-moz-transform") ||
      st.getPropertyValue("-ms-transform") ||
      st.getPropertyValue("-o-transform") ||
      st.getPropertyValue("transform") ||
      "FAIL";

    var array;
    if (tr === 'none') {
      array = [1, 0, 0, 1, 0, 0];
    } else {
      var values = tr.split('(')[1].split(')')[0].split(',');
      var a = parseFloat(values[0].replace(/\s+/g, ''));
      var b = parseFloat(values[1].replace(/\s+/g, ''));
      var c = parseFloat(values[2].replace(/\s+/g, ''));
      var d = parseFloat(values[3].replace(/\s+/g, ''));
      var e = parseFloat(values[4].replace(/\s+/g, ''));
      var f = parseFloat(values[5].replace(/\s+/g, ''));

      array = [a, b, c, d, e, f];
    }

    return array;
  },

  getMatrix: function(element) {
    var matrix = new TMat(this.getMatrixArray(element));
    var topLeftMatrix = this.getTopLeftMatrix(element);
    /*
    could contain translate -> correct this
    topLeftMatrix.tx = topLeftMatrix.tx - (matrix.tx * matrix.a);
    topLeftMatrix.ty = topLeftMatrix.ty - (matrix.ty * matrix.d);
    topLeftMatrix = topLeftMatrix.prod(TMat.Tscalexy(matrix.a, matrix.d));
    */
    //  matrix = matrix.prod(topLeftMatrix);
    matrix = topLeftMatrix.prod(matrix);

    return matrix;
  },

  getTopLeftMatrix: function(element) {

    /*  var elementBoundingRect = element.getBoundingClientRect();
      var parentBoundingRect = element.parentNode.getBoundingClientRect();

      return TMat.Ttrans(elementBoundingRect.left - parentBoundingRect.left, elementBoundingRect.top - parentBoundingRect.top);*/

    return TMat.Ttrans(element.offsetLeft, element.offsetTop);
  }
};
DomHelpers.detectBrowser();
DomHelpers.calculatePrefixes(['transform', 'transform-origin']);

// enable this function to get timing information into the console logs
// var oldlog = console.log;
// var log0 = Date.now();
// console.log = function() {
//   oldlog.apply(this, [((Date.now() - log0) / 1000).toFixed(2) + "s"].concat(Array.prototype.slice.call(arguments)));
// };
module.exports = DomHelpers;
