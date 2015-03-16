var VER = 1;
var TYPE = 'gardr';
var REFRESH_KEY = 'refresh-' + TYPE;
var FAILED_CLASS = TYPE + '-failed';

function validSize(v) {
    if (typeof v === 'string' && v.indexOf('px') !== -1) { return v; }
    if ( (typeof v === 'string' && v.indexOf('%') === -1) || typeof v === 'number') {
        return v + 'px';
    }
    return v;
}

function getOrigin(loc) {
    return loc.origin || (loc.protocol + '//' + loc.hostname + (loc.port ? ':' + loc.port : ''));
}

function fixIosResponsiveIframeBug (ifr) {
    if (ifr.width === '100%') {
        ifr.element.style.width = '1px';
        ifr.element.style.minWidth = '100%';
    }
}

function Iframe(id, options) {
    if (typeof id !== 'string' || !id) {
        throw new Error('Iframe missing id');
    }
    this.id = id;
    if (!options || typeof options.iframeUrl === 'undefined') {
        throw new Error('Iframe missing options and iframeUrl');
    }
    this.element = null;
    this.iframeUrl = options.iframeUrl;
    this.width = options.width || '100%';
    this.height = options.height || '100px';
    this.classes = options.classes || '';
    this.hidden = options.hidden;
    this.setData(options.data || {});
}

Iframe.prototype.remove = function() {
    this.wrapper.parentNode.removeChild(this.wrapper);
    this.wrapper = null;
    this.element = null;
    return this;
};

Iframe.prototype.resize = function(w, h) {
    if (w) { this.width = w; }
    if (h) { this.height = h; }

    if (this.element && this.element.style) {
        this.element.style.width = validSize(this.width);
        this.element.style.height = validSize(this.height);
    }

    return this;
};

Iframe.prototype.addFailedClass = function() {
    var val;
    if (this.wrapper && ((val = this.wrapper.className.indexOf()) === -1)) {
        this.wrapper.className = val + ' ' + FAILED_CLASS;
    }
};

Iframe.prototype.setData = function (data) {
    data.origin = getOrigin(document.location);
    data.id = this.id;
    this.data = data;
};

Iframe.prototype._getUrl = function(src) {
    var baseUrl = this.iframeUrl;
    if (typeof baseUrl != 'string') {
        throw new Error('iframeUrl must be a string');
    }
    var sep = baseUrl.indexOf('?') !== -1 ? '&' : '?';
    var refresh = src && src.indexOf(REFRESH_KEY) === -1 ? REFRESH_KEY + '=true&' : '';
    var params = JSON.stringify(this.data);
    var url = [
        baseUrl,
        sep,
        'ver=', VER,
        '&', refresh,
        '#', encodeURIComponent(params)
    ].join('');
    if (url.length >= 2083) {
        // IE has a limit for URLs longer than 2083 bytes, so fallback to iframe.name if the URL is too long
        url = url.split('#')[0];
        this.element.name = params;
    }
    return url;
};

Iframe.prototype.refresh = function () {
    this.element.src = this._getUrl(this.element.src);
};

Iframe.prototype._createIframeElement = function () {
    return document.createElement('iframe');
};

Iframe.prototype.makeIframe = function() {
    var wrapper = this.wrapper = document.createElement('div');
    var i = this.element = this._createIframeElement();
    var inner = document.createElement('div');
    var classes = [TYPE, TYPE + '-' + this.id];

    if (this.classes) {
        classes.push(this.classes);
    }
    if (this.hidden) {
        classes.push(TYPE + '-hidden');
        wrapper.style.display = 'none';
    }
    //wrapper.id = this.id;
    wrapper.className = (classes.join(' ')).toLowerCase();
    wrapper.setAttribute('data-' + TYPE, this.id);
    i.setAttribute('data-automation-id', this.id);
    // iframe.name chrome cache issue https://github.com/gardr/host/pull/15
    i.name = this.id + '-' + (+new Date());
    i.src = this._getUrl();
    i.className = TYPE + '-iframe';
    // https://github.com/gardr/host/pull/16
    i.tabIndex = -1;
    // IE 7-8
    i.marginWidth = 0;
    i.marginHeight = 0;
    i.frameBorder = '0';
    i.allowTransparency = 'true';
    // Safari will will not show iframe until scroll with width/height == 0px
    //i.width = validSize(this.width);
    //i.height = this.height;
    i.style.width = validSize(this.width);
    i.style.height = validSize(this.height);
    fixIosResponsiveIframeBug(this);
    i.style.border = '0';
    i.style.display = 'block';
    // stop scroll
    i.style.overflow = 'hidden';
    i.scrolling = 'no';

    inner.appendChild(i);
    inner.className = TYPE + '-inner';
    wrapper.appendChild(inner);
    return this;
};

module.exports = Iframe;
