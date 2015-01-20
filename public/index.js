// Generated by CoffeeScript 1.8.0
(function() {
  var Nav, Pin, Util, spinner;

  Util = {
    id: function(id) {
      return document.getElementById(id);
    },
    element: function(tagName, attrs) {
      var el, k, v;
      el = document.createElement(tagName);
      for (k in attrs) {
        v = attrs[k];
        el.setAttribute(k, v);
      }
      el.inject = function(parent) {
        return parent.appendChild(el);
      };
      return el;
    },
    postForm: function(path, data, success, error) {
      var k, params, req, v;
      params = [];
      for (k in data) {
        v = data[k];
        params.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      }
      req = new XMLHttpRequest();
      req.onload = success;
      req.onerror = error;
      req.open('post', path);
      req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      return req.send(params.join('&'));
    },
    csrfToken: function() {
      return Util.id('csrf-token').getAttribute('value');
    },
    myFingerprint: function() {
      return Util.id('my-fingerprint').getAttribute('value');
    }
  };

  Nav = {
    init: function() {
      var el, _i, _len, _ref, _results;
      Util.id('signout-link').addEventListener('click', Nav.signOut);
      Util.id('delete-link').addEventListener('click', Nav.deleteAccount);
      window.addEventListener('popstate', Nav.updateVisiblePage);
      _ref = document.getElementsByClassName('sp-link');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        el = _ref[_i];
        _results.push(el.addEventListener('click', Nav.navigateSubPage));
      }
      return _results;
    },
    updateVisiblePage: function() {
      var el, page, _i, _len, _ref;
      _ref = Util.id('explain').childNodes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        el = _ref[_i];
        el.hidden = true;
      }
      page = location.pathname.match(/\/(.*)/)[1];
      if (page === '') {
        page = 'intro';
      }
      return Util.id(page).hidden = false;
    },
    navigateSubPage: function(e) {
      var href;
      e.preventDefault();
      href = e.target.href || e.target.parentNode.href;
      history.pushState(null, null, href);
      return Nav.updateVisiblePage();
    },
    signOut: function() {
      var form;
      form = Util.element('form', {
        action: 'signout',
        method: 'post'
      }).inject(document.body);
      Util.element('input', {
        type: 'hidden',
        name: 'csrf_token',
        value: Util.csrfToken()
      }).inject(form);
      return form.submit();
    },
    deleteAccount: function() {
      var form;
      form = Util.element('form', {
        action: 'delete-account',
        method: 'post'
      }).inject(document.body);
      Util.element('input', {
        type: 'hidden',
        name: 'csrf_token',
        value: Util.csrfToken()
      }).inject(form);
      return form.submit();
    }
  };

  Pin = {
    init: function(globe) {
      var pin;
      pin = {
        well: Util.id('pinwell'),
        drag: Util.id('pindrag'),
        globe: globe
      };
      Pin.addEvents(pin.well, pin.drag, pin.globe);
      return pin;
    },
    eventModes: {
      rest: [['well', 'mouseenter', 'wellEnter'], ['well', 'mouseleave', 'wellLeave'], ['well', 'mousedown', 'wellDown']],
      wellPressed: [['well', 'mousemove', 'wellPull'], ['well', 'mouseleave', 'dragStart'], ['well', 'mouseup', 'wellUp']],
      dragVoid: [['document', 'mousemove', 'dragMove'], ['document', 'mouseup', 'dragReset']],
      dragGlobe: [['document', 'mousemove', 'globeMove'], ['document', 'mouseup', 'globeUp']]
    },
    addEvents: function(well, drag, globe) {
      var events, mode, offset;
      mode = null;
      offset = {
        x: 0,
        y: 0
      };
      events = {
        wellEnter: function() {
          return well.classList.add('hover');
        },
        wellLeave: function() {
          return well.classList.remove('hover');
        },
        wellDown: function(e) {
          well.style.cursor = 'grabbing';
          offset = Pin.wellOffset(well, e);
          return mode = Pin.transitionMode(well, events, mode, 'wellPressed');
        },
        wellUp: function() {
          well.style.cursor = null;
          return mode = Pin.transitionMode(well, events, mode, 'rest');
        },
        wellPull: function(e) {
          var dist;
          dist = offset.distanceTo(Pin.wellOffset(well, e));
          if (dist > 10) {
            return events.dragStart(e);
          }
        },
        dragStart: function(e) {
          var fingerprint, pin, pins;
          events.wellLeave();
          events.wellUp();
          well.classList.add('empty');
          events.dragMove(e);
          drag.hidden = false;
          drag.style.transformOrigin = offset.x + 'px ' + offset.y + 'px';
          fingerprint = Util.myFingerprint();
          pins = globe.gl.pins;
          pin = pins.fingerprints[fingerprint];
          if (pin != null) {
            pins.fingerprints[fingerprint] = null;
            pins.remove(pin);
          }
          return mode = Pin.transitionMode(well, events, mode, 'dragVoid');
        },
        dragMove: function(e) {
          var dist, easing, globeOffset, pos, scale;
          drag.style.left = (e.clientX - offset.x) + 'px';
          drag.style.top = (e.clientY - offset.y) + 'px';
          globeOffset = Pin.globeOffset(globe.container, e);
          dist = globeOffset.length();
          easing = function(x) {
            return x * x;
          };
          scale = Pin.interpolate([1.54, 0.87], [1, 0.1], easing, dist);
          Pin.scalePin(drag, scale);
          pos = Globe.raycast(globe.gl, Pin.nudgeUpwards(globeOffset));
          if (pos != null) {
            return events.globeEnter(e);
          }
        },
        dragReset: function() {
          well.classList.remove('empty');
          drag.hidden = true;
          Util.postForm('pin', {
            csrf_token: Util.csrfToken()
          });
          return mode = Pin.transitionMode(well, events, mode, 'rest');
        },
        globeEnter: function(e) {
          drag.hidden = true;
          globe.interaction.dragPin = Globe.makePin(globe.gl, true);
          globe.gl.scene.add(globe.interaction.dragPin);
          events.globeMove(e);
          return mode = Pin.transitionMode(well, events, mode, 'dragGlobe');
        },
        globeMove: function(e) {
          var globeOffset, pos;
          globeOffset = Pin.globeOffset(globe.container, e);
          pos = Globe.raycast(globe.gl, Pin.nudgeUpwards(globeOffset));
          if (pos != null) {
            Globe.positionPin(globe.gl, globe.interaction.dragPin, pos);
          }
          if (pos == null) {
            return events.globeLeave(e);
          }
        },
        globeLeave: function(e) {
          globe.gl.scene.remove(globe.interaction.dragPin);
          globe.interaction.dragPin = null;
          events.dragMove(e);
          drag.hidden = false;
          return mode = Pin.transitionMode(well, events, mode, 'dragVoid');
        },
        globeUp: function(e) {
          var globeOffset, latLon, pin, pos;
          globe.gl.scene.remove(globe.interaction.dragPin);
          globe.interaction.dragPin = null;
          drag.hidden = true;
          globeOffset = Pin.globeOffset(globe.container, e);
          pos = Globe.raycast(globe.gl, Pin.nudgeUpwards(globeOffset));
          if (pos != null) {
            pin = Globe.makePin(globe.gl, true);
            pin.fingerprint = Util.myFingerprint();
            Globe.positionPin(globe.gl, pin, pos);
            globe.gl.pins.fingerprints[pin.fingerprint] = pin;
            globe.gl.pins.add(pin);
            latLon = Globe.vectorToLatLon(pos);
            Util.postForm('pin', {
              csrf_token: Util.csrfToken(),
              lat: latLon.lat,
              lon: latLon.lon
            });
          }
          return mode = Pin.transitionMode(well, events, mode, 'rest');
        }
      };
      return mode = Pin.transitionMode(well, events, mode, 'rest');
    },
    transitionMode: function(well, events, prevMode, mode) {
      var binding, targets, _i, _j, _len, _len1, _ref, _ref1;
      targets = {
        well: well,
        document: document
      };
      if (prevMode != null) {
        _ref = Pin.eventModes[prevMode];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          binding = _ref[_i];
          targets[binding[0]].removeEventListener(binding[1], events[binding[2]]);
        }
      }
      _ref1 = Pin.eventModes[mode];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        binding = _ref1[_j];
        targets[binding[0]].addEventListener(binding[1], events[binding[2]]);
      }
      return mode;
    },
    scalePin: function(pin, scale) {
      pin.style.transform = 'scale(' + scale + ',' + scale + ')';
      return pin.getElementsByClassName('outline')[0].style.strokeWidth = 2 / scale;
    },
    elementPosition: function(el) {
      return new THREE.Vector2(el.offsetLeft, el.offsetTop);
    },
    mouse: function(e) {
      return new THREE.Vector2(e.clientX, e.clientY);
    },
    wellOffset: function(well, e) {
      return Pin.mouse(e).sub(Pin.elementPosition(well.parentNode));
    },
    globeOffset: function(globeContainer, e) {
      return Pin.mouse(e).sub(Pin.elementPosition(globeContainer)).multiplyScalar(2 / 800).addScalar(-1).multiply(new THREE.Vector2(1, -1));
    },
    nudgeUpwards: function(pos) {
      return pos.clone().add(new THREE.Vector2(0, 0.02));
    },
    clamp: function(limits, x) {
      if (limits[1] < limits[0]) {
        limits = [limits[1], limits[0]];
      }
      if (x < limits[0]) {
        return limits[0];
      } else if (x > limits[1]) {
        return limits[1];
      } else {
        return x;
      }
    },
    interpolate: function(domain, range, easing, x) {
      var s;
      x = Pin.clamp(domain, x);
      s = (x - domain[0]) / (domain[1] - domain[0]);
      if (easing != null) {
        s = easing(s);
      }
      return s * (range[1] - range[0]) + range[0];
    }
  };

  spinner = Util.id('spinner-container');

  spinner.style.display = null;

  Nav.init();

  Globe.loadEverything(function(textures, xhr) {
    var globe, pin;
    spinner.parentNode.removeChild(spinner);
    globe = Globe.init(Util.id('gl'), textures, xhr);
    globe.container.style.display = null;
    return pin = Pin.init(globe);
  });

}).call(this);
