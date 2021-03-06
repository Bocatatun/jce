/**
 * editor_plugin_src.js
 *
 * Copyright 2009, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://tinymce.moxiecode.com/license
 * Contributing: http://tinymce.moxiecode.com/contributing
 */

(function() {
    var DOM = tinymce.DOM,
        Element = tinymce.dom.Element,
        Event = tinymce.dom.Event,
        each = tinymce.each,
        is = tinymce.is;

    tinymce.create('tinymce.plugins.InlinePopups', {
        init: function(ed, url) {
            // Replace window manager
            ed.onBeforeRenderUI.add(function() {
                ed.windowManager = new tinymce.InlineWindowManager(ed);

                if (!ed.settings.compress.css) {
                    DOM.loadCSS(url + '/css/window.css');
                }
            });

        }
    });

    function ucfirst(s) {
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }

    function updateWithTouchData(e) {
        var keys, i;

        if (e.changedTouches) {
            keys = "screenX screenY pageX pageY clientX clientY".split(' ');
            for (i = 0; i < keys.length; i++) {
                e[keys[i]] = e.changedTouches[0][keys[i]];
            }
        }
    }

    tinymce.create('tinymce.InlineWindowManager:tinymce.WindowManager', {
        InlineWindowManager: function(ed) {
            var self = this;

            self.parent(ed);
            self.zIndex = 300000;
            self.count = 0;
            self.windows = {};
        },

        open: function(f, p) {
            var self = this,
                id, opt = '',
                ed = self.editor,
                dw = 0,
                dh = 0,
                vp, po, mdf, clf, rsf, we, w, u, parentWindow;

            f = f || {};
            p = p || {};

            // Run native windows
            if (!f.inline) {
                return self.parent(f, p);
            }

            parentWindow = self._frontWindow();

            if (parentWindow && DOM.get(parentWindow.id + '_ifr')) {
                parentWindow.focussedElement = DOM.get(parentWindow.id + '_ifr').contentWindow.document.activeElement;
            }

            // Only store selection if the type is a normal window
            if (!f.type) {
                self.bookmark = ed.selection.getBookmark(1);
            }

            id = DOM.uniqueId("mce_inlinepopups_"); // Use a prefix so this can't conflict with other ids

            vp = DOM.getViewPort();

            f.width = parseInt(f.width || 0);
            f.height = parseInt(f.height || 0) + (tinymce.isIE ? 8 : 0);

            p.mce_inline = true;
            p.mce_window_id = id;

            //p.mce_width     = f.width;
            //p.mce_height    = f.height;

            self.features = f;
            self.params = p;

            // don't translate
            f.translate_i18n = false;

            self.onOpen.dispatch(self, f, p);

            // modal html
            var html = '<div class="mceModalBody" id="' + id + '">' +
                '   <div class="mceModalContainer">' +
                '       <div class="mceModalHeader mceModalMove" id="' + id + '_header">' +
                '           <button class="mceModalClose" type="button"></button>' +
                '           <h3 class="mceModalTitle" id="' + id + '_title">' + (f.title || "") + '</h3>' +
                '       </div>' +
                '       <div class="mceModalContent" id="' + id + '_content"></div>' +
                '   </div>' +
                '   </div>';

            // find modal
            var modal = DOM.select('.mceModal');

            // create modal
            if (!modal.length) {
                modal = DOM.add(DOM.doc.body, 'div', { 'class': 'mceModal', role: 'dialog' }, '');

                if (f.overlay !== false) {
                    DOM.add(modal, 'div', { 'class': 'mceModalOverlay' });
                }
            }

            DOM.add(modal, 'div', { 'class': 'mceModalFrame', id: id + '_frame' }, html);

            u = f.url || f.file;

            if (u) {
                if (tinymce.relaxedDomain) {
                    u += (u.indexOf('?') == -1 ? '?' : '&') + 'mce_rdomain=' + tinymce.relaxedDomain;
                }

                u = tinymce._addVer(u);
            }

            if (!f.type) {
                // add loader
                DOM.addClass(id, 'mceLoading');

                var iframe = DOM.add(id + '_content', 'iframe', { id: id + '_ifr', src: 'javascript:""', frameBorder: 0 });

                try {
                    //iframe.style.minHeight = f.height + 'px';
                } catch (e) {}

                DOM.setAttrib(iframe, 'src', u);

                Event.add(iframe, 'load', function() {
                    DOM.removeClass(id, 'mceLoading');
                });
            } else {
                // remove title
                DOM.setHTML(id + '_title', '');

                DOM.addClass(id, 'mceModal' + ucfirst(f.type));

                // add footer
                DOM.add(DOM.select('.mceModalContainer', id), 'div', { 'class': 'mceModalFooter', id: id + '_footer' });

                // add buttons
                DOM.add(id + '_footer', 'button', { id: id + '_ok', 'class': 'mceButton mceOk', type: 'button' }, f.type == 'confirm' ? 'Yes' : 'Ok');

                if (f.type == 'confirm') {
                    DOM.add(id + '_footer', 'button', {
                        'type': 'button',
                        'class': 'mceButton mceCancel'
                    }, 'No');
                }

                DOM.setHTML(id + '_content', '<div>' + f.content.replace('\n', '<br />') + '</div>');

                // Close on escape
                Event.add(id, 'keyup', function(evt) {
                    if (evt.keyCode === 27) {
                        f.button_func(false);
                        return Event.cancel(evt);
                    }
                });

                Event.add(id, 'keydown', function(evt) {

                    if (evt.keyCode === 9) {
                        var cancelButton = DOM.select('.mceCancel', id + '_footer')[0];

                        if (cancelButton && cancelButton !== evt.target) {
                            cancelButton.focus();
                        } else {
                            DOM.get(id + '_ok').focus();
                        }

                        return Event.cancel(evt);
                    }
                });
            }

            // Measure borders
            if (!f.type) {
                dh += DOM.get(id + '_header').clientHeight;
            }

            // set size classes
            if (f.size) {
                DOM.addClass(id, f.size);
            } else {
                if (f.width) {
                    DOM.setStyle(id, 'width', f.width + dw);
                }

                if (f.height) {
                    DOM.setStyle(id, 'height', f.height + dh);
                }
            }

            /*if (tinymce.isIE8) {
                var p = DOM.getRect(id),
                    m = 41;

                if (DOM.get(id + '_footer')) {
                    m = 90;
                }

                DOM.setStyle(id + '_content', 'height', p.h - m);
            }*/

            rsf = Event.add(DOM.win, 'resize orientationchange', function() {
                if (DOM.get(id)) {
                    self.position(id);
                }
            });

            // Register events
            mdf = Event.add(id, 'mousedown', function(e) {
                var n = e.target,
                    w, vp;

                w = self.windows[id];
                self.focus(id);

                if (n.nodeName == 'BUTTON') {
                    if (DOM.hasClass(n, 'mceModalClose')) {
                        self.close(null, id);

                        return Event.cancel(e);
                    }
                } else if (DOM.hasClass(n, 'mceModalMove') || DOM.hasClass(n.parentNode, 'mceModalMove')) {
                    return self._startDrag(id, e, 'Move');
                }
            });

            // click event on modal
            clf = Event.add(id, 'click', function(e) {
                var n = e.target;

                self.focus(id);

                if (n.nodeName == 'BUTTON') {
                    if (DOM.hasClass(n, 'mceModalClose')) {
                        self.close(null, id);
                    }

                    if (DOM.hasClass(n, 'mceButton')) {
                        f.button_func(DOM.hasClass(n, 'mceOk'));
                    }

                    return Event.cancel(e);
                }
            });

            // Add window
            w = self.windows[id] = {
                id: id,
                mousedown_func: mdf,
                click_func: clf,
                resize_func: rsf,
                features: f,
                deltaWidth: dw,
                deltaHeight: dh
            };

            // position modal
            this.position(id);

            Event.add(id + '_ifr', 'focus', function() {
                self.focus(id);
            });

            DOM.setAttrib(id, 'aria-hidden', 'false');

            self.focus(id);

            // Focus ok button
            if (DOM.get(id + '_ok')) {
                DOM.get(id + '_ok').focus();
            }

            self.count++;

            return w;
        },

        position: function(id) {
            var p = DOM.getRect(id),
                vp = DOM.getViewPort();

            var top = Math.round(Math.max(vp.y + 20, vp.y + (vp.h / 2.0) - (p.h / 2.0)));
            var left = Math.round(Math.max(vp.x + 20, vp.x + (vp.w / 2.0) - (p.w / 2.0)));

            DOM.setStyles(id, { 'left': left, 'top': top });
        },

        focus: function(id) {
            var self = this,
                w;

            if (w = self.windows[id]) {
                w.zIndex = this.zIndex++;

                DOM.setStyle(id, 'z-index', w.zIndex);

                DOM.removeClass(self.lastId, 'mceFocus');
                DOM.addClass(id, 'mceFocus');

                self.lastId = id;

                if (DOM.get(id + '_ok')) {
                    DOM.get(w.id + '_ok').focus();
                } else if (DOM.get(w.id + '_ifr')) {
                    DOM.get(w.id + '_ifr').focus();
                }
            }
        },

        _startDrag: function(id, se, ac) {
            var self = this,
                mu, mm, d = DOM.doc,
                w = self.windows[id],
                sx, sy, cp;

            if (DOM.hasClass(id, 'dragging')) {
                end();
                return Event.cancel(se);
            }

            updateWithTouchData(se);

            p = DOM.getRect(id);
            vp = DOM.getViewPort();

            //DOM.setStyles(id, { 'left': p.x - vp.x, 'top': p.y - vp.y });

            // Get positons and sizes
            cp = { x: 0, y: 0 };

            // Reduce viewport size to avoid scrollbars while dragging
            vp.w -= 2;
            vp.h -= 2;

            DOM.addClass(id, 'dragging');

            sx = se.screenX;
            sy = se.screenY;

            function end() {
                Event.remove(d, 'mouseup touchend', mu);
                Event.remove(d, 'mousemove touchmove', mm);

                DOM.removeClass(id, 'dragging');
            }

            // Handle mouse up
            mu = Event.add(d, 'mouseup touchend', function(e) {
                updateWithTouchData(e);

                end();

                return Event.cancel(e);
            });

            // Handle mouse move/drag
            mm = Event.add(d, 'mousemove touchmove', function(e) {
                var x, y, v;

                updateWithTouchData(e);

                x = e.screenX - sx; // - vp.x;
                y = e.screenY - sy; // - vp.y;

                dx = Math.max(p.x + x, 10);
                dy = Math.max(p.y + y, 10);

                DOM.setStyles(id, { 'left': dx, 'top': dy });

                return Event.cancel(e);
            });

            return Event.cancel(se);
        },

        close: function(win, id) {
            var self = this,
                w, d = DOM.doc,
                fw, id;

            id = self._findId(id || win);

            // Probably not inline
            if (!self.windows[id]) {
                self.parent(win);
                return;
            }

            self.count--;

            if (w = self.windows[id]) {
                self.onClose.dispatch(self);
                Event.remove(d, 'mousedown', w.mousedown_func);
                Event.remove(d, 'click', w.click_func);
                Event.remove(win, 'resize orientationchange', w.resize_func);

                Event.clear(id);
                Event.clear(id + '_ifr');

                DOM.setAttrib(id + '_ifr', 'src', 'javascript:""'); // Prevent leak

                // remove frame
                DOM.remove(id + '_frame');
                DOM.remove(id);

                delete self.windows[id];

                fw = self._frontWindow();

                if (fw) {
                    self.focus(fw.id);
                }
            }

            if (self.count === 0) {
                DOM.remove(DOM.select('.mceModal'));
                DOM.setAttrib(DOM.doc.body, 'aria-hidden', 'false');
                self.editor.focus();
            }
        },

        // Find front most window
        _frontWindow: function() {
            var fw, ix = 0;
            // Find front most window and focus that
            each(this.windows, function(w) {
                if (w.zIndex > ix) {
                    fw = w;
                    ix = w.zIndex;
                }
            });
            return fw;
        },

        setTitle: function(w, ti) {
            var e;

            w = this._findId(w);

            if (e = DOM.get(w + '_title')) {
                if (!e.innerHTML) {
                    e.innerHTML = DOM.encode(ti);
                }
            }
        },

        alert: function(txt, cb, s) {
            var self = this,
                w;

            w = self.open({
                title: self,
                type: 'alert',
                button_func: function(s) {
                    if (cb) {
                        cb.call(s || self, s);
                    }
                    self.close(null, w.id);
                },
                content: DOM.encode(self.editor.getLang(txt, txt)),
                inline: 1
            });
        },

        confirm: function(txt, cb, s) {
            var self = this,
                w;

            w = self.open({
                title: self,
                type: 'confirm',
                button_func: function(s) {
                    if (cb) {
                        cb.call(s || self, s);
                    }
                    self.close(null, w.id);
                },
                content: DOM.encode(self.editor.getLang(txt, txt)),
                inline: 1
            });
        },

        resizeBy: function(dw, dh, id) {
            var w = this.windows[id];
        },

        // Internal functions

        _findId: function(w) {
            var self = this;

            if (typeof(w) == 'string') {
                return w;
            }

            each(self.windows, function(wo) {
                var ifr = DOM.get(wo.id + '_ifr');

                if (ifr && w == ifr.contentWindow) {
                    w = wo.id;
                    return false;
                }
            });

            return w;
        }
    });

    // Register plugin
    tinymce.PluginManager.add('inlinepopups', tinymce.plugins.InlinePopups);
})();