/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * BrowserMapUtil contains various utility static functions used by BrowserMap-related code.
 *
 * @class BrowserMapUtil
 */
 (function(BrowserMapUtil) {
    'use strict';

        /**
     * Merge two objects as hashes. Entries with duplicate keys are overwritten with values from the second object.
     *
     * @param {Object} hsh1 - the first hash object
     * @param {Object} hsh2 - the second hash object
     * @return {Object} a hash object obtained by merging the two parameter hash objects
     */
    BrowserMapUtil.merge = function(hsh1, hsh2) {
        var hsh = { },
            prop;
        for (prop in hsh1) {
            if (hsh1.hasOwnProperty(prop)) {
                hsh[prop] = hsh1[prop];
            }
        }
        for (prop in hsh2) {
            if (hsh2.hasOwnProperty(prop)) {
                hsh[prop] = hsh2[prop];
            }
        }
        return hsh;
    };

    /**
     * Returns the set difference between Array a and Array b (a \ b).
     *
     * @param {Array} a - the first Array
     * @param {Array} b - the second Array
     * @return {Array} an Array containing the set difference
     * @throws TypeError if either a or b are not of type Array
     */
    BrowserMapUtil.getArrayDifference = function (a, b) {
        if (!a instanceof Array) {
            throw new TypeError('Expected Array for a');
        }
        if (!b instanceof Array) {
            throw new TypeError('Expected Array for b');
        }
        var i,
            seen = [],
            diff = [];
        for (i = 0; i < b.length; i++) {
            seen[b[i]] = true;
        }
        for (i = 0; i < a.length; i++) {
            if (!seen[a[i]]) {
                diff.push(a[i]);
            }
        }
        return diff;
    };

    /**
     * The <code>cookieManager</code> is used to manage cookies client-side (see
     * <a href="https://developer.mozilla.org/en/DOM/document.cookie">https://developer.mozilla.org/en/DOM/document.cookie</a>).
     *
     * @class BrowserMapUtil.CookieManager
     */
    BrowserMapUtil.CookieManager = {
        /**
         * Returns a <code>Cookie</code> set on the client.
         *
         * @param {String} name - the cookie's name
         * @return {Cookie} the cookie; <code>null</code> if the specified cookie cannot be found
         */
        getCookie : function (name) {
            if (!name || !this.cookieExists(name)) { return null; }
            var cookieValue = decodeURIComponent(document.cookie.replace(new RegExp('(?:^|.*;\\s*)' +
                encodeURIComponent(name).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*'), '$1'));
            var cookie = new Cookie(name, cookieValue);
            return cookie;
        },

        /**
         * Sets a <code>Cookie</code> on the client.
         *
         * @param {Cookie} cookie - the cookie
         */
        setCookie : function (cookie) {
            if (!cookie.name || /^(?:expires|max\-age|path|domain|secure)$/.test(cookie.name)) { return; }
            var sExpires = '';
            if (cookie.expires) {
                switch (typeof cookie.expires) {
                    case 'number':
                        sExpires = '; max-age=' + cookie.expires; break;
                    case 'String':
                        sExpires = '; expires=' + cookie.expires; break;
                    case 'object':
                        if (cookie.expires.hasOwnProperty('toGMTString')) {
                            sExpires = '; expires=' + cookie.expires.toGMTString();
                        }
                    break;
                }
            }
            document.cookie = encodeURIComponent(cookie.name) + '=' + encodeURIComponent(cookie.value) + sExpires +
                (cookie.domain ? '; domain=' + cookie.domain : '') + (cookie.path ? '; path=' + cookie.path : '') +
                    (cookie.secure ? '; secure' : '');
        },

        /**
         * Removes a cookie from the client, if one exists.
         *
         * @param {String} name - the <code>Cookie</code>'s name
         */
        removeCookie : function (name) {
            if (!name || !this.cookieExists(name)) { return; }
            var oExpDate = new Date();
            oExpDate.setDate(oExpDate.getDate() - 1);
            document.cookie = encodeURIComponent(name) + '=; expires=' + oExpDate.toGMTString() + ';';
        },

        /**
         * Tests if a cookie exists on the client.
         *
         * @param {String} name - the cookie's name
         * @return {Boolean} <code>true</code> if the cookie exists, <code>false</code> otherwise
         */
        cookieExists : function (name) {
            return (new RegExp('(?:^|;\\s*)' + encodeURIComponent(name).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=')).test(document.cookie);
        },

        cookiesEnabled : function () {
            var cookie = new Cookie('browsermap_test_cookie', 'browsermap_test_cookie', 10, '/');
            this.setCookie(cookie);
            var testCookie = this.getCookie('browsermap_test_cookie');
            if (testCookie !== null) {
                this.removeCookie('browsermap_test_cookie');
                return true;
            }
            return false;
        }
    };

    /**
     * The <code>file</code> object provides various file-related static utility methods.
     *
     * @class BrowserMapUtil.File
     */
    BrowserMapUtil.File = {
        /**
         * Returns the extension of a file based on the file name.
         *
         * @param {String} file - the file's name
         * @return {String} a String containing the file's extension, empty String if the file does not have an extension
         */
        getFileExtension : function (file) {
            var extension = '';
            if (file && file !== '' && file.indexOf('.') != -1) {
                extension = file.substring(file.lastIndexOf('.') + 1, file.length);
            }
            return extension;
        },

        /**
         * Analyses if a file has selectors in its file name and returns the file name (file part + extension) without the selectors.
         *
         * @param {String} file - the file from which to remove the selectors
         * @return {String} a String containing the file with the removed selectors
         */
        removeSelectorsFromFile : function(file) {
            if (file && file !== '') {
                var tokens = file.split('.');
                if (tokens.length > 2) {
                    return tokens[0] + '.' + tokens[tokens.length - 1];
                }
            }
            return file;
        }
    };

    /**
     * The <code>url</code> object provides various URL-related static utility methods.
     *
     * @class BrowserMapUtil.Url
     */
    BrowserMapUtil.Url = {
        /**
         * Analyses a URL an returns the domain part from it.
         *
         * @param {String} url - the URL from which to extract the domain part
         * @return {String} the detected domain
         */
        getDomainFromURL : function (url) {
            var domain = '';
            url = url.replace(/http:\/\/|https:\/\//, '');
            var slashIndex = url.indexOf('/');
            if (slashIndex == -1) {
                domain = url;
            } else {
                domain = url.substring(0, slashIndex);
            }
            return domain;
        },

        /**
         * Decodes the value of a <code>GET</code> request URL parameter.
         *
         * @param {String} value - the encoded value of the parameter
         * @return {String} the decoded value of the parameter
         */
        decodeURLParameterValue : function (value) {
            return decodeURIComponent(value.replace(/\+/g, ' '));
        },

        /**
         * Returns a map with the <code>GET</code> paramters of a URL.
         *
         * @param {String} url - the URL from which the parameters need to be extracted
         * @return {Object} the map with the parameters and their values
         */
        getURLParameters : function (url) {
            var map = {}, self = this;
            var f = function(m,key,value) { map[key] = self.decodeURLParameterValue(value); };
            url.replace(/[?&]+([^=&]+)=([^&]*)/gi, f);
            return map;
        },

        /**
         * Returns the value of a specified <code>GET</code> parameter from a URL if the parameter exists. Otherwise it will return
         * <code>null</code>.
         *
         * @param {String} url - the URL from which the parameter value needs to be extracted
         * @param {String} parameter - the name of the <code>GET</code> parameter whose value needs to be returned
         * @return {String} the value of the parameter, <code>null</code> if the parameter does not exist
         */
        getValueForParameter : function (url, parameter) {
            return this.getURLParameters(url)[parameter];
        },

        /**
         * Returns the <code>GET</code> parameters String from a URL.
         *
         * @param {String} url - the URL form which the parameters String should be extracted
         * @return {String} the parameters String; empty String if the URL is <code>null</code> / empty
         */
        getURLParametersString : function (url) {
            var urlParametersString = '';
            if (url && url !== '' && url.lastIndexOf('?') != -1) {
                urlParametersString = url.substring(url.lastIndexOf('?'), url.length);
            }
            return urlParametersString;
        },

        /**
         * Returns the file part of a URL If the URL sent as a parameter
         * is empty or null, the returned value will be an empty String.
         *
         * @param {String} url - the URL from which the file part should be extracted
         * @return {String} a String containing the file part; empty String if the URL is null or empty or points to a folder instead of
         *      a file
         */
        getFileFromURL : function (url) {
            var file = '';
            if (url && url !== '') {
                url = url.replace('https://', '');
                url = url.replace('http://', '');
                url = url.replace(BrowserMapUtil.Url.getURLParametersString(url), '');
                if (url.lastIndexOf('/') != -1 && url[url.lastIndexOf('/') + 1] != '?') {
                    file = url.substring(url.lastIndexOf('/') + 1, url.length);
                }
            }
            return file;
        },

        /**
         * Retrieves the folder path from a URL.
         *
         * @param {String} url - the URL from which the path is extracted
         * @return {String} a String containing the folder path; empty String if the URL is <code>null</code> or empty or it does not end
         *  with "/"
         */
        getFolderPathFromURL : function (url) {
            var folderPath = '';
            var tmpURL = url;
            tmpURL = tmpURL.replace('https://', '');
            tmpURL = tmpURL.replace('http://', '');
            if (tmpURL && tmpURL !== '' && tmpURL.lastIndexOf('/') != -1) {
                folderPath = tmpURL.substring(0, tmpURL.lastIndexOf('/') + 1);
                folderPath = url.substring(0, url.indexOf(folderPath)) + folderPath;
            }
            return folderPath;
        },

        /**
         * Analyses a resource (the file part from a URL) and retrieves its selectors. The selectors will be returned in an Array. An empty
         * Array will be returned if no selectors have been found.
         *
         * @param {String} url - the URL from which the selectors have to be extracted
         * @return {Array} an Array with the selectors; the Array will be empty if no selectors have been found
         */
        getSelectorsFromURL : function(url) {
            var selectors = [];
            if (url && url !== '') {
                url = url.replace('https://', '');
                url = url.replace('http://', '');
                // ditch the parameters when retrieving selectors
                if (url.lastIndexOf('?') != -1) {
                    url = url.substring(0, url.lastIndexOf('?'));
                }
                if (url.lastIndexOf('/') != -1 ) {
                    url = url.substring(url.lastIndexOf('/') + 1, url.length);
                    var selectorCandidates = url.split('.');
                    if (selectorCandidates.length > 2) {
                        for (var i = 1; i < selectorCandidates.length - 1; i++) {
                            selectors.push(selectorCandidates[i]);
                        }
                    }
                }
            }
            return selectors;
        },

        /**
         * Adds selectors to the supplied URL and returns the modified URL. For example:
         * <pre>
         *      BrowserMapUtil.Url.addSelectorsToUrl('http://www.example.com/index.html', ['mobile'])
         *      ->
         *      'http://www.example.com/index.mobile.html'
         * </pre>
         * @param {String} url - the URL to which selectors need to be added
         * @param {Array} selectors - an Array with the selectors that have to be applied to the current URL
         * @return {String} a String containing the new URL
         */
        addSelectorsToURL : function(url, selectors) {
            var file = this.getFileFromURL(url),
                parameters = BrowserMapUtil.Url.getURLParametersString(url);
            file = BrowserMapUtil.File.removeSelectorsFromFile(file);
            if (file && file !== '') {
                var path = this.getFolderPathFromURL(url);
                var extension = BrowserMapUtil.File.getFileExtension(file);
                file = file.replace('.' + extension, '');
                var newURL = path + file;
                if (selectors.length > 0) {
                    newURL += '.';
                }
                newURL += selectors.join('.');
                if (extension && extension !== '') {
                    newURL += '.' + extension;
                }
                newURL += parameters;
                return newURL;
            }
            return url;
        },

        /**
         * Transforms a relative URL to an absolute one for IE7 which is not able to resolve relative URLs by itself.
         *
         * @param {String} url - the relative URL
         * @return {String} a String with the absolute URL
         */
        qualifyURL : function(url) {
            var absoluteURL = null,
                el;
            if (url) {
                el = document.createElement('div');
                el.innerHTML= '<a href="' + encodeURI(url) + '">x</a>';
                absoluteURL = el.firstChild.href;
            }
            return absoluteURL;
        },

        /**
         * Searches for a canonical link in the current document. If ones is found, its href attribute's value is returned.
         *
         * @return {String} a String with the canonical URL; null if one is not found
         */
        getCanonicalURL : function() {
            var headElement = document.getElementsByTagName('head')[0],
                links,
                i,
                link,
                url;
            if (headElement) {
                links = headElement.getElementsByTagName('link');
                if (links) {
                    for (i = 0; i < links.length; i++) {
                        link = links[i];
                        if (link.rel && link.rel === 'canonical') {
                            url = link.href;
                            break;
                        }
                    }
                }
            }
            return url;
        }
    };

 })(window.BrowserMapUtil = window.BrowserMapUtil || {});


/**
 * Creates a Cookie object.
 *
 * @constructor
 * @param {String} name - this cookie's name
 * @param {String} value - this cookie's value (unescaped - the cookie manager will handle escaping / unescaping)
 * @param {Object} expires - this cookie's expires information; the object can have the following types:
 *      <ol>
 *          <li><code>Number</code> - expiration time in seconds</li>
 *          <li><code>String</code> - expiration time as a String formatted date</li>
 *          <li><code>Object</code> - expiration time as a Date object</li>
 *      </ol>
 * @param {String} path - the path for which this cookie is valid
 * @param {String} domain - the domain for which this cookie is valid
 * @param {Boolean} secure - boolean flag to inidicate if this cookie needs to be used only for HTTPS connections or not
 */
function Cookie(name, value, expires, path, domain, secure) {
    if (!(this instanceof Cookie)) {
        return new Cookie(name, value, expires, path, domain, secure);
    }
    this.name = name;
    this.value = value;
    this.expires = expires;
    this.path = path;
    this.domain = domain;
    this.secure = secure;
}

// Array.indexOf polyfill
// from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
        'use strict';
        if (this === null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = 0;
        if (arguments.length > 0) {
            n = Number(arguments[1]);
            if (n != n) { // shortcut for verifying if it's NaN
                n = 0;
            } else if (n !== 0 && n != Infinity && n != -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) {
            return -1;
        }
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (; k < len; k++) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    };
}

// String.trim() polyfill
// from https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/String/Trim
if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g,'');
    };
}

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*global BrowserMapUtil:false, Cookie:false */
/**
 * The BrowserMap object is used to identify the client's device group, based on JavaScript detection tests ("probes") that find out
 * which features the client supports.
 *
 * @class BrowserMap
 */
(function(BrowserMap) {
    'use strict';

    var cookiePrefix = 'BMAP_',
        deviceGroupCookieName = 'device',
        deviceOverrideParameter = 'device',
        languageOverrideParameter = 'language',
        enableForwardingWhenCookiesDisabled = false,
        matchRun = false,
        languageOverride = null,
        matchedDeviceGroups = {},
        probes = {},
        probeCache = {},
        deviceGroups = {};
    // Android 4.x phones in landscape view use 42 pixels for displaying the "soft buttons"
    BrowserMap.THE_ANSWER_TO_LIFE_THE_UNIVERSE_AND_EVERYTHING = 42;

    BrowserMap.VERSION = '1.4.0'; // replaced at build time by Grunt

    var linkDataDevgroups = 'data-bmap-devgroups';
    var linkcurrentVariant = 'data-bmap-currentvar';

    /**
     * Retrieves the probes Map - useful for outputting debugging information.
     *
     * @return {Object} an Object holding the probes and their results
     */
    BrowserMap.getProbingResults = function () {
        var probingResults = {},
            probe;
        for (probe in probes) {
            if (probes.hasOwnProperty(probe)) {
                probingResults[probe] = BrowserMap.probe(probe);
            }
        }
        return probingResults;
    };

    /**
     * Initialises BrowserMap with a configuration object.
     *
     * @param {Object} config - a hash object with various properties that can be used to configure BrowserMap
     * <p>
     * The following properties can be be used:
     *      <ol>
     *          <li><code>config.cookiePrefix</code> - the prefix used to name cookies used throughout the detection</li>
     *          <li><code>config.deviceGroupCookieName</code> - the name of the device group cookie (the final name will be of the form
     *             <code>config.cookiePrefix + config.deviceGroupCookieName</code>)</li>
     *          <li><code>config.deviceOverrideParameter</code> - the name of the GET parameter that triggers a device override</li>
     *          <li><code>config.languageOverrideParameter</code> - the name of the GET parameter that triggers a language override</li>
     *          <li><code>config.enableForwardingWhenCookiesDisabled</code> - if true, it will allow for all the URLs pointing to resources
     *              from the current domain to be modified in order to include the deviceOverrideParameter; this is useful if the client
     *              does not support cookies</li>
     *      </ol>
     * </p>
     */
    BrowserMap.config = function (config) {
        if (config.cookiePrefix !== null) {
            cookiePrefix = config.cookiePrefix;
        }
        if (config.deviceGroupCookieName !== null) {
            deviceGroupCookieName = config.deviceGroupCookieName;
        }
        if (config.deviceOverrideParameter !== null) {
            deviceOverrideParameter = config.deviceOverrideParameter;
        }
        if (config.languageOverrideParameter !== null) {
            languageOverrideParameter = config.languageOverrideParameter;
        }
        if (config.enableForwardingWhenCookiesDisabled !== null) {
            enableForwardingWhenCookiesDisabled = config.enableForwardingWhenCookiesDisabled;
        }
    };

    /**
     * Returns an Array of the alternate sites by analysing the link elements with rel='alternate' and the data-bmap-devgroups attribute
     * not null or empty.
     *
     * @return {Array} an array of alternate sites defined as objects with the <code>id, href, hreflang, devgroups</code> set of
     *                 attributes; an empty array if no alternate site is found
     */
    BrowserMap.getAllAlternateSites = function () {
        var alternateSites = [],
            links,
            i,
            link,
            headElement,
            onIE7,
            linkHref,
            devgroups;
        onIE7 = navigator.appVersion.indexOf('MSIE 7') !== -1;
        headElement = document.getElementsByTagName('head')[0];
        if (headElement) {
            links = headElement.getElementsByTagName('link');
            for (i = 0; i < links.length; i++) {
                link = links[i];
                devgroups = link.getAttribute(linkDataDevgroups);
                if (link.rel == 'alternate' && devgroups && devgroups !== '') {
                    if (onIE7) {
                        linkHref = BrowserMapUtil.Url.qualifyURL(link.href);
                    } else {
                        linkHref = link.href;
                    }
                    alternateSites.push(
                        {'id' : link.id, 'href' : linkHref, 'hreflang' : link.hreflang, 'devgroups' : devgroups}
                    );
                }
            }
        }
        return alternateSites;
    };

    /**
     * <p>
     * Looks for the best matching alternate site. The primary criterion is the number of matched device groups which also provides the
     * score of the alternate site. More criteria can be added by providing a filtering function.
     * </p>
     * <p>
     * The filtering function receives an alternate site as a parameter and it must return a boolean value if the filter matches or not. The
     * filter is applied to alternate sites that have matched at least one device group. If the alternate site matches the filter, the total
     * score of the alternate site will increase by 1. The alternate site's object attributes are id, href, hreflang and media.
     * </p>
     *
     * @param {Array} deviceGroups - an array containing the names of the device groups for which to get the best alternate link
     * @param {Function} filter - a callback function that acts as a filter and which must return a boolean; the callback will receive a
     *      hash object representing an alternate site with the following attributes: "id", "href", "hreflang", "devgroups"
     * @return {String} the alternate link that matches the most device groups matched by the client
     */
    BrowserMap.getAlternateSite = function (deviceGroups, filter) {
        var alternateSites = BrowserMap.getAllAlternateSites(),
            maxLinkScore = 0,
            alternateSite = null,
            i,
            j,
            linkScore,
            devices;
        for (i = 0; i < alternateSites.length; i++) {
            linkScore = 0;
            devices = alternateSites[i].devgroups.split(',');
            for (j = 0; j < devices.length; j++) {
                if (deviceGroups.indexOf(devices[j].trim()) !== -1) {
                    linkScore++;
                }
            }
            if (typeof filter == 'function' && linkScore > 0) {
                if(filter(alternateSites[i])) {
                    linkScore++;
                }
            }
            if (linkScore > maxLinkScore) {
                alternateSite = alternateSites[i];
                maxLinkScore = linkScore;
            }
        }
        return alternateSite;
    };

    /**
     * Returns the current variant, if one is found.
     *
     * @return {Object} an object with the <code>id, href, hreflang, devgroups</code> set of attributes; <code>null</code> if the current
     *                  variant cannot be determined
     */
    BrowserMap.getCurrentVariant = function () {
        var headElement = document.getElementsByTagName('head')[0],
            i = 0,
            currentVariant = null,
            currentVariantAttribute,
            links,
            link,
            onIE7,
            linkHref,
            devgroups;
        onIE7 = navigator.appVersion.indexOf('MSIE 7') !== -1;
        if (headElement) {
            links = headElement.getElementsByTagName('link');
            for (i = 0; i < links.length; i++) {
                link = links[i];
                if (link.rel == 'alternate') {
                    if (onIE7) {
                        linkHref = BrowserMapUtil.Url.qualifyURL(link.href);
                    } else {
                        linkHref = link.href;
                    }
                    devgroups = link.getAttribute(linkDataDevgroups);
                    currentVariantAttribute = link.getAttribute(linkcurrentVariant);
                    if (currentVariantAttribute && currentVariantAttribute === 'true') {
                        currentVariant = {'id' : link.id, 'href' : linkHref, 'hreflang' : link.hreflang, 'devgroups' : devgroups};
                        break;
                    }
                }
            }
        }
        return currentVariant;
    };

    /**
     * Returns the defined DeviceGroups for this BrowserMap as an array in which the elements are ordered by their ranking property.
     *
     * @return {Array}
     */
    BrowserMap.getDeviceGroupsInRankingOrder = function () {
        var dgs = [],
            dg;
        for (dg in deviceGroups) {
            if (deviceGroups.hasOwnProperty(dg)) {
                dgs.push(deviceGroups[dg]);
            }
        }
        dgs.sort(function(a, b) {
            return a.ranking - b.ranking;
        });
        return dgs;
    };

    /**
     * Executes a probe that was previously added via <code>addProbe</code>. The result of the probe is cached so a second call
     * with the same probeName will not run the probe again. You can use <code>BrowserMap.clearProbeCache()</code> to avoid that.
     *
     * @param {String} probeName - the name of the requested probe
     * @return {Object} the result of the probe, or null if the probe has not been defined
     */
    BrowserMap.probe = function (probeName) {
        if (!probes[probeName]) {
            return null;
        }
        if (!probeCache.hasOwnProperty(probeName)) {
            probeCache[probeName] = probes[probeName]();
        }
        return probeCache[probeName];
    };

    /**
     * Starting from a currentURL, an array of device groups and an array of url selectors returns the alternate URL for the current URL.
     *
     * @param {String} currentURL - the current URL
     * @param {Array} detectedDeviceGroups - the Array of detected device groups
     * @param {Array} urlSelectors - the Array of URL selectors, in the order of their device group ranking
     * @return {String} the specific URL for the identified device groups
     */
    BrowserMap.getNewURL = function (currentURL, detectedDeviceGroups, urlSelectors) {
        var newURL = null,
            currentVariant = BrowserMap.getCurrentVariant(),
            alternateSite = BrowserMap.getAlternateSite(detectedDeviceGroups, function(alternateLink) {
                if (languageOverride && alternateLink.hreflang && alternateLink.hreflang.lastIndexOf(languageOverride) === 0) {
                    return true;
                } else if (currentVariant && currentVariant.hreflang === alternateLink.hreflang) {
                    return true;
                }
                return false;
            }),
            i,
            dg,
            parameters = BrowserMapUtil.Url.getURLParametersString(currentURL),
            urlNoParams = currentURL.replace(parameters, '');
        if (alternateSite) {
            newURL = alternateSite.href;
        }
        if (!newURL) {
            for (i = 0; i < detectedDeviceGroups.length; i++) {
                dg = BrowserMap.getDeviceGroupByName(detectedDeviceGroups[i]);
                if (dg) {
                    newURL = dg.url;
                    if (newURL) {
                        break;
                    }
                }
            }
        }
        if (!newURL) {
            newURL = BrowserMapUtil.Url.addSelectorsToURL(urlNoParams, urlSelectors);
        }
        if (parameters) {
            newURL += parameters;
        }
        return newURL;
    };

    /**
     * Removes the device group override, whether it was set up by using the override cookie or just by using the specific device group
     * override parameter.
     */
    BrowserMap.removeOverride = function () {
        var oCookie = BrowserMapUtil.CookieManager.getCookie('o_' + cookiePrefix + deviceGroupCookieName),
            currentURL = window.location.href,
            parameters = BrowserMapUtil.Url.getURLParametersString(currentURL),
            overrideParameter,
            indexOfOverride;
        if (oCookie) {
            BrowserMapUtil.CookieManager.removeCookie(cookiePrefix + deviceGroupCookieName);
            BrowserMapUtil.CookieManager.removeCookie(oCookie.name);
            oCookie.name = cookiePrefix + deviceGroupCookieName;
            oCookie.path = '/';
            BrowserMapUtil.CookieManager.setCookie(oCookie);
        }
        if (parameters) {
            overrideParameter = deviceOverrideParameter + '=' +
                BrowserMapUtil.Url.getValueForParameter(currentURL, deviceOverrideParameter);
            currentURL = currentURL.replace(parameters, '');
            indexOfOverride = parameters.indexOf(overrideParameter);
            if (indexOfOverride !== -1) {
                if (parameters.length > indexOfOverride + overrideParameter.length) {
                    if (parameters[indexOfOverride - 1] == '?') {
                        parameters = parameters.replace(overrideParameter + '&', '');
                    }
                    else {
                        parameters = parameters.replace('&' + overrideParameter, '');
                    }
                }
                else {
                    parameters = parameters.replace('?' + overrideParameter, '');
                }
            }
            currentURL += parameters;
        }
        window.location = currentURL;
    };

    /**
     * <p>Decides if the client should be forwarded to the best matching alternate link, depending on the detected device group.</p>
     * <p>
     * Three options are available for determining the correct representation of a page depending on the detected device group, listed in
     * the order of their importance:
     *      <ol>
     *          <li>alternate links: <code>&lt;link rel="alternate" href="..." hreflang="..." media="device_groups" &gt;</code></li>
     *          <li><code>DeviceGroup</code> level URLs (check the <code>DeviceGroup</code> objects description)</li>
     *          <li>selector-based URLs (the device group names will be appended to the current URL: <code>index.html ->
     *              index.tablet.html</code>)</li>
     *      </ol>
     * In either case <code>GET</code> parameters will be maintained.
     */
    BrowserMap.forwardRequest = function () {
        var currentURL = window.location.href,
            deviceOverride = BrowserMapUtil.Url.getValueForParameter(currentURL, deviceOverrideParameter),
            detectedDeviceGroups = [],
            urlSelectors = [],
            oCookie = BrowserMapUtil.CookieManager.getCookie('o_' + cookiePrefix + deviceGroupCookieName),
            cookie = BrowserMapUtil.CookieManager.getCookie(cookiePrefix + deviceGroupCookieName),
            dgs = [],
            i,
            g,
            registeredDeviceGroups,
            dgName,
            domain,
            aTags,
            url,
            parameters,
            newURL,
            canonicalURL = BrowserMapUtil.Url.getCanonicalURL();
        if (BrowserMap.isEnabled()) {
            languageOverride = BrowserMapUtil.Url.getValueForParameter(currentURL, languageOverrideParameter);
            if (deviceOverride) {
                // override detected
                detectedDeviceGroups = deviceOverride.split(',');
                if (detectedDeviceGroups.length > 0) {
                    if (BrowserMapUtil.CookieManager.cookiesEnabled()) {
                        if (!oCookie && !cookie) {
                            // tried to access resource directly with override parameter without passing through detection
                            // run detection code to detect the original device groups
                            oCookie = new Cookie();
                            oCookie.name = 'o_' + cookiePrefix + deviceGroupCookieName;
                            oCookie.path = '/';
                            BrowserMap.matchDeviceGroups();
                            for (g in matchedDeviceGroups) {
                                if (matchedDeviceGroups.hasOwnProperty(g)) {
                                    dgs.push(matchedDeviceGroups[g].name);
                                }
                            }
                            if (deviceOverride !== dgs.join(',')) {
                                oCookie.value = dgs.join(',');
                                BrowserMapUtil.CookieManager.setCookie(oCookie);
                            }
                        }
                        else if (!oCookie) {
                            // detection has been performed; override detected; store original values
                            if (cookie.value !== detectedDeviceGroups.join(',')) {
                                cookie.name = 'o_' + cookie.name;
                                cookie.path = '/';
                                BrowserMapUtil.CookieManager.setCookie(cookie);
                            }
                        }
                        // store the override
                        cookie = new Cookie();
                        cookie.name = cookiePrefix + deviceGroupCookieName;
                        cookie.value = detectedDeviceGroups.join(',');
                        cookie.path = '/';
                        BrowserMapUtil.CookieManager.setCookie(cookie);
                        if (oCookie) {
                            if (oCookie.value == cookie.value) {
                                BrowserMapUtil.CookieManager.removeCookie(oCookie.name);
                            }
                        }
                    }
                }
            }
            if (cookie !== null || deviceOverride) {
                /**
                 * cookie was either set by the detection code before, or we have an override;
                 *
                 * in either case, the matchDeviceGroups must match the detectedDeviceGroups which can come from the cookie or from the
                 * override parameter
                 */
                registeredDeviceGroups = BrowserMap.getDeviceGroups();
                if (detectedDeviceGroups.length === 0) {
                    detectedDeviceGroups = cookie.value.split(',');
                }
                matchedDeviceGroups = { };
                for (i = 0 ; i < detectedDeviceGroups.length; i++) {
                    dgName = detectedDeviceGroups[i].trim();
                    if (registeredDeviceGroups.hasOwnProperty(dgName)) {
                        if (registeredDeviceGroups[dgName].isSelector) {
                            urlSelectors.push(dgName);
                        }
                        matchedDeviceGroups[dgName] = registeredDeviceGroups[dgName];
                    }
                }
                // add the device override parameter to links using the same domain if a device override was detected
                if (deviceOverride && cookie === null && enableForwardingWhenCookiesDisabled) {
                    domain = BrowserMapUtil.Url.getDomainFromURL(window.location.href);
                    aTags = document.getElementsByTagName('a');
                    for (i = 0; i < aTags.length; i++) {
                        url = aTags[i].href;
                        if (url && url.indexOf(domain) !== -1) {
                            parameters = BrowserMapUtil.Url.getURLParametersString(url);
                            if (parameters) {
                                if (parameters.indexOf(languageOverrideParameter + '=' + deviceOverride) == -1) {
                                    aTags[i].href = url + '&' + deviceOverrideParameter + '=' + deviceOverride;
                                }
                            }
                            else {
                                aTags[i].href = url + '?' + deviceOverrideParameter + '=' + deviceOverride;
                            }
                        }
                    }
                }
            }
            else {
                // no override has been detected, nor a cookie has been set previous to this call
                // perform the match and then set the cookie
                BrowserMap.matchDeviceGroups();
                for (g in matchedDeviceGroups) {
                    if (matchedDeviceGroups.hasOwnProperty(g)) {
                        if (matchedDeviceGroups[g].isSelector) {
                            urlSelectors.push(matchedDeviceGroups[g].name);
                        }
                        detectedDeviceGroups.push(matchedDeviceGroups[g].name);
                    }
                }
                cookie = new Cookie();
                cookie.name = cookiePrefix + deviceGroupCookieName;
                cookie.value = detectedDeviceGroups.join(',');
                cookie.path = '/';
                BrowserMapUtil.CookieManager.setCookie(cookie);
            }
            newURL = BrowserMap.getNewURL(currentURL, detectedDeviceGroups, urlSelectors);
            if (currentURL !== newURL && canonicalURL !== newURL) {
                window.location = newURL;
            }
        }
    };

    /**
     * Clears the probe result cache.
     */
    BrowserMap.clearProbeCache = function () {
        probeCache = { };
    };

    /**
     * Adds a <code>DeviceGroup</code> to the <code>BrowserMap</code> object. The key which is used to store the <code>DeviceGroup</code> is
     * represented by its name. The last <code>DeviceGroup</code> added to <code>BrowserMap</code> with the same name as a previously
     * existing <code>DeviceGroup</code> will be the one which will be stored.
     *
     * @param {Object} deviceGroup - the DeviceGroup to be added to the list
     * <p>
     * A DeviceGroup is represented by a hash object with the following attributes:
     *      <ol>
     *          <li><code>Number</code> <code>ranking</code> - the order number of the DeviceGroup (when it comes to matching the
     *              <code>DeviceGroups</code> to the client's capabilites, the defined <code>DeviceGroups</code> will be evaluated in order)
     *          </li>
     *          <li><code>String</code> <code>name</code> - the name of the <code>DeviceGroup</code> as one word (use camelCase if you need
     *              more words)</li>
     *          <li><code>Function</code> <code>testFunction</code> - the function that is to be evaluated to check if the client matches
     *              the <code>DeviceGroup</code>; this function <strong>must</strong> return a boolean value</li>
     *          <li><code>String</code> <code>url</code> (optional) - the URL to which a client will be forwarded in case the
     *              <code>DeviceGroup</code> matches and the current page does not contain an alternate link to which the client can be
     *              forwarded</li>
     *          <li><code>String</code> <code>description</code> (optional) - the description of the <code>DeviceGroup</code></li>
     *          <li><code>Boolean</code> <code>isSelector</code> (optional) - if present and set to <code>true</code>, the name of the
     *              <code>DeviceGroup</code> will be used to create a URL with a selector to which BrowserMap can forward the client
     *              (e.g. index.selector.html)</li>
     *      </ol>
     * </p>
     */
    BrowserMap.addDeviceGroup = function (deviceGroup) {
        // validate the deviceGroup object
        if (typeof deviceGroup.ranking !== 'number') {
            throw new TypeError('Expected a Number for device group ' + deviceGroup.name + ' ranking');
        }
        if (typeof deviceGroup.testFunction !== 'function') {
            throw new TypeError('Expected a Function for device group ' + deviceGroup.name + ' testFunction');
        }
        deviceGroups[deviceGroup.name] = deviceGroup;
    };

    /**
     * Adds a probe to BrowserMap and returns the BrowserMap object (useful for chaining). The probe name must be unique. If one tries to
     * overwrite an existing probe nothing will happen and the BrowserMap object will be returned as it was before the method was called.
     *
     * @param name a String containing the name of the probe
     * @param probe a Function that returns the result of the probe
     *
     * @return the BrowserMap object
     */
    BrowserMap.addProbe = function (name, probe) {
        if (typeof name !== 'string' || name.length < 1) {
            throw new TypeError('invalid probe name');
        }
        if (typeof probe !== 'function') {
            throw new TypeError('invalid probe function');
        }
        if (!probes.hasOwnProperty(name)) {
            probes[name] = probe;
        }
        return BrowserMap;
    };

    /**
     * Returns the DeviceGroups that a client has matched.
     *
     * @return {Object} a hash object containing the matched device groups
     */
    BrowserMap.getMatchedDeviceGroups = function () {
        return matchedDeviceGroups;
    };

    /**
     * Returns all the DeviceGroups defined for the BrowserMap object.
     *
     * @return {Object} a hash object containing the defined device groups for this BrowserMap instance
     */
    BrowserMap.getDeviceGroups = function () {
        return deviceGroups;
    };

    /**
     * Matches the DeviceGroups to the client's capabilities by evaluating the DeviceGroup's test function.
     */
    BrowserMap.matchDeviceGroups = function () {
        var deviceGroupsArray = BrowserMap.getDeviceGroupsInRankingOrder(),
            i,
            deviceGroup;
        for (i = 0; i < deviceGroupsArray.length; i++) {
            deviceGroup = deviceGroupsArray[i];
            if (!!deviceGroup.testFunction.call()) {
                matchedDeviceGroups[deviceGroup.name] = deviceGroup;
            }
        }
        matchRun = true;
    };

    /**
     * Queries the list of DeviceGroups associated to this BrowserMap object using a DeviceGroup name and returns it if found.
     *
     * @param {String} groupName - the name of the DeviceGroup
     * @return {Object} the DeviceGroup with the respective name, <code>null</code> otherwise
     * @see BrowserMap.addDeviceGroup
     */
    BrowserMap.getDeviceGroupByName = function (groupName) {
        return deviceGroups[groupName];
    };

    /**
     * Checks if BrowserMap should be enabled by searching the current document for tags like <code>&lt;meta name="browsermap.enabled"
     *  content="false"&gt;</code> in the <head> section. If such a tag exists, then this method returns <code>false</code>.
     *
     * @return {Boolean} false if the previously mentioned tag exists, true otherwise
     */
    BrowserMap.isEnabled = function () {
        var headElement = document.getElementsByTagName('head')[0],
            metaTags,
            i,
            name,
            tag;
        if (headElement) {
            metaTags = headElement.getElementsByTagName('meta');
            for (i = 0; i < metaTags.length; i++) {
                if ((tag = metaTags[i]) && (name = tag.getAttribute('name'))) {
                    if (name === 'browsermap.enabled' && tag.getAttribute('content') === 'false') {
                        return false;
                    }
                }
            }
        }
        return true;
    };

    return BrowserMap;

})(window.BrowserMap = window.BrowserMap || {});

/*! matchMedia() polyfill - Test a CSS media type/query in JS. Authors & copyright (c) 2012: Scott Jehl, Paul Irish, Nicholas Zakas. Dual MIT/BSD license */

window.matchMedia = window.matchMedia || (function(doc, undefined){

  var bool,
      docElem  = doc.documentElement,
      refNode  = docElem.firstElementChild || docElem.firstChild,
      // fakeBody required for <FF4 when executed in <head>
      fakeBody = doc.createElement('body'),
      div      = doc.createElement('div');

  div.id = 'mq-test-1';
  div.style.cssText = "position:absolute;top:-100em";
  fakeBody.style.background = "none";
  fakeBody.appendChild(div);

  return function(q){

    div.innerHTML = '&shy;<style media="'+q+'"> #mq-test-1 { width: 42px; }</style>';

    docElem.insertBefore(fakeBody, refNode);
    bool = div.offsetWidth === 42;
    docElem.removeChild(fakeBody);

    return { matches: bool, media: q };
  };

}(document));

/* custom modernizr script generated from modernizr.com,
   including just what we need for browsermap. */

/* Modernizr 2.5.3 (Custom Build) | MIT & BSD
 * Build: http://modernizr.com/download/#-csstransforms3d-touch-teststyles-testprop-testallprops-prefixes-domprefixes
 */
;window.Modernizr=function(a,b,c){function y(a){i.cssText=a}function z(a,b){return y(l.join(a+";")+(b||""))}function A(a,b){return typeof a===b}function B(a,b){return!!~(""+a).indexOf(b)}function C(a,b){for(var d in a)if(i[a[d]]!==c)return b=="pfx"?a[d]:!0;return!1}function D(a,b,d){for(var e in a){var f=b[a[e]];if(f!==c)return d===!1?a[e]:A(f,"function")?f.bind(d||b):f}return!1}function E(a,b,c){var d=a.charAt(0).toUpperCase()+a.substr(1),e=(a+" "+n.join(d+" ")+d).split(" ");return A(b,"string")||A(b,"undefined")?C(e,b):(e=(a+" "+o.join(d+" ")+d).split(" "),D(e,b,c))}var d="2.5.3",e={},f=b.documentElement,g="modernizr",h=b.createElement(g),i=h.style,j,k={}.toString,l=" -webkit- -moz- -o- -ms- ".split(" "),m="Webkit Moz O ms",n=m.split(" "),o=m.toLowerCase().split(" "),p={},q={},r={},s=[],t=s.slice,u,v=function(a,c,d,e){var h,i,j,k=b.createElement("div"),l=b.body,m=l?l:b.createElement("body");if(parseInt(d,10))while(d--)j=b.createElement("div"),j.id=e?e[d]:g+(d+1),k.appendChild(j);return h=["&#173;","<style>",a,"</style>"].join(""),k.id=g,(l?k:m).innerHTML+=h,m.appendChild(k),l||(m.style.background="",f.appendChild(m)),i=c(k,a),l?k.parentNode.removeChild(k):m.parentNode.removeChild(m),!!i},w={}.hasOwnProperty,x;!A(w,"undefined")&&!A(w.call,"undefined")?x=function(a,b){return w.call(a,b)}:x=function(a,b){return b in a&&A(a.constructor.prototype[b],"undefined")},Function.prototype.bind||(Function.prototype.bind=function(b){var c=this;if(typeof c!="function")throw new TypeError;var d=t.call(arguments,1),e=function(){if(this instanceof e){var a=function(){};a.prototype=c.prototype;var f=new a,g=c.apply(f,d.concat(t.call(arguments)));return Object(g)===g?g:f}return c.apply(b,d.concat(t.call(arguments)))};return e});var F=function(c,d){var f=c.join(""),g=d.length;v(f,function(c,d){var f=b.styleSheets[b.styleSheets.length-1],h=f?f.cssRules&&f.cssRules[0]?f.cssRules[0].cssText:f.cssText||"":"",i=c.childNodes,j={};while(g--)j[i[g].id]=i[g];e.touch="ontouchstart"in a||a.DocumentTouch&&b instanceof DocumentTouch||(j.touch&&j.touch.offsetTop)===9,e.csstransforms3d=(j.csstransforms3d&&j.csstransforms3d.offsetLeft)===9&&j.csstransforms3d.offsetHeight===3},g,d)}([,["@media (",l.join("touch-enabled),("),g,")","{#touch{top:9px;position:absolute}}"].join(""),["@media (",l.join("transform-3d),("),g,")","{#csstransforms3d{left:9px;position:absolute;height:3px;}}"].join("")],[,"touch","csstransforms3d"]);p.touch=function(){return e.touch},p.csstransforms3d=function(){var a=!!E("perspective");return a&&"webkitPerspective"in f.style&&(a=e.csstransforms3d),a};for(var G in p)x(p,G)&&(u=G.toLowerCase(),e[u]=p[G](),s.push((e[u]?"":"no-")+u));return y(""),h=j=null,e._version=d,e._prefixes=l,e._domPrefixes=o,e._cssomPrefixes=n,e.testProp=function(a){return C([a])},e.testAllProps=E,e.testStyles=v,e}(this,this.document);

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * This file defines the default probes.
 */

/*global BrowserMap:false, Modernizr:false */
BrowserMap.addProbe('BrowserMap.version', function() {
    return BrowserMap.VERSION;
}).addProbe('Modernizr.touch', function() {
    return Modernizr.touch;
}).addProbe('Modernizr.csstransforms3d', function() {
    return Modernizr.csstransforms3d;
}).addProbe('window.devicePixelRatio', function() {
    return window.devicePixelRatio;
}).addProbe('window.orientation', function() {
    return window.orientation;
}).addProbe('navigator.vendor', function() {
    return navigator.vendor;
}).addProbe('navigator.platform', function() {
    return navigator.platform;
}).addProbe('navigator.appName', function() {
    return navigator.appName;
}).addProbe('navigator.appVersion', function() {
    return navigator.appVersion;
}).addProbe('navigator.appCodeName', function() {
    return navigator.appCodeName;
}).addProbe('navigator.userAgent', function() {
    return navigator.userAgent;
}).addProbe('screenWidth', function() {
    return screen.width;
}).addProbe('screenHeight', function() {
    return screen.height;
}).addProbe('clientWidth', function() {
    return document.documentElement.clientWidth;
}).addProbe('orientation', function() {
    var orientation = '';
    if (window.innerWidth > window.innerHeight) {
        orientation = 'landscape';
    }
    else {
        orientation = 'portrait';
    }
    return orientation;
}).addProbe('portrait', function() {
    return BrowserMap.probe('orientation') == 'portrait';
}).addProbe('landscape', function() {
    return BrowserMap.probe('orientation') == 'landscape';
}).addProbe('screenWidthDependingOnOrientation', function () {
    var widthDependingOnOrientation = 0;
    if (BrowserMap.probe('orientation') === 'portrait') {
        widthDependingOnOrientation = screen.width > screen.height ? screen.height : screen.width;
    } else {
        widthDependingOnOrientation = screen.width < screen.height ? screen.height : screen.width;
    }
    return widthDependingOnOrientation;
}).addProbe('clientWidthDependingOnOrientation', function () {
    var clientWidthDependingOnOrientation = 0;
    if (BrowserMap.probe('orientation') == 'portrait') {
        clientWidthDependingOnOrientation = document.documentElement.clientWidth <
            document.documentElement.clientHeight ? document.documentElement.clientWidth : document.documentElement.clientHeight;
    } else {
        clientWidthDependingOnOrientation = document.documentElement.clientWidth >
            document.documentElement.clientHeight ? document.documentElement.clientWidth : document.documentElement.clientHeight;
    }
    return clientWidthDependingOnOrientation;
}).addProbe('devicePixelRatio', function() {
    var mq = window.matchMedia,
        ratio = -1,
        userAgent;
    if (mq) {
        for (var i = 0.5; i <= 3; i+= 0.05) {
            var r = Math.round(i * 100)/100;
            if (mq(
                    '(max-resolution: ' + r + 'dppx), \
                    (max-resolution: ' + r * 96 + 'dpi), \
                    (-webkit-max-device-pixel-ratio: ' + r + '), \
                    (-o-device-pixel-ratio: ' + r + ')'
                ).matches) {
                ratio = r;
                break;
            }
        }
    }

    // hacks for browsers not returning correct answers to the above media queries
    userAgent = BrowserMap.probe('navigator.userAgent');
    if (userAgent.indexOf('BlackBerry') != -1 || userAgent.indexOf('Windows Phone') != -1) {
        ratio = Math.round(BrowserMap.probe('screenWidthDependingOnOrientation') /
                BrowserMap.probe('clientWidthDependingOnOrientation') * 100) /
                100;
    }
    return ratio;
}).addProbe('canResizeBrowserWindow', function() {
    /**
     * useful to detect a mobile browser (false) / a desktop browser (true)
     */
    return Math.round(BrowserMap.probe('screenWidthDependingOnOrientation') / BrowserMap.probe('devicePixelRatio')) -
                BrowserMap.THE_ANSWER_TO_LIFE_THE_UNIVERSE_AND_EVERYTHING > BrowserMap.probe('clientWidth');
});

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * This file defines the default device groups.
 */

 /*global BrowserMap:false, Modernizr:false */
BrowserMap.addDeviceGroup({
    'ranking' : 0,
    'name' : 'smartphone',
    'description' : 'Smartphone',
    'testFunction' : function() {
        if (BrowserMap.probe('clientWidth') > 480 && BrowserMap.probe('portrait')) {
            return false;
        }
        if (BrowserMap.probe('clientWidth') >= 900 && BrowserMap.probe('landscape')) {
            return false;
        }
        if (BrowserMap.probe('canResizeBrowserWindow')) {
            return false;
        }
        return true;
    },
    'isSelector' : true
});

BrowserMap.addDeviceGroup({
    'ranking' : 10,
    'name' : 'tablet',
    'description' : 'Standard Tablet',
    'testFunction' : function() {
        if (BrowserMap.probe('portrait') && BrowserMap.probe('clientWidth') <= 480) {
            return false;
        }
        if (BrowserMap.probe('landscape') && BrowserMap.probe('clientWidth') < 900) {
            return false;
        }
        if (!Modernizr.touch) {
            return false;
        }
        if (BrowserMap.probe('canResizeBrowserWindow')) {
            return false;
        }
        return true;
    },
    'isSelector' : true
});

BrowserMap.addDeviceGroup({
    'ranking' : 20,
    'name' : 'highResolutionDisplay',
    'description' : 'High Resolution Display',
    'testFunction' : function() {
        return BrowserMap.probe('devicePixelRatio') >= 2;
    },
    'isSelector' : true
});

BrowserMap.addDeviceGroup({
    'ranking' : 30,
    'name' : 'browser',
    'description' : 'Modern desktop browser',
    'testFunction': function () {
        if (BrowserMap.probe('portrait') && BrowserMap.probe('clientWidth') < 720) {
            return false;
        }
        if (BrowserMap.probe('landscape') && BrowserMap.probe('clientWidth') <1200) {
            return false;
        }
        return Modernizr.csstransforms3d && !Modernizr.touch;
    },
    'isSelector' : false
});

BrowserMap.addDeviceGroup({
    'ranking' : Number.MAX_VALUE,
    'name' : 'oldBrowser',
    'description' : 'Old desktop browser',
    'testFunction' : function() {
        for (var i in BrowserMap.getMatchedDeviceGroups()) {
            if (BrowserMap.getMatchedDeviceGroups().hasOwnProperty(i)) {
                return false;
            }
        }
        return true;
    },
    'isSelector' : false
});

BrowserMap.forwardRequest();

