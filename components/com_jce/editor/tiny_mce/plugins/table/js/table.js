//tinyMCEPopup.requireLangPack();
(function(tinymce, tinyMCEPopup, $) {
    function convertRGBToHex(col) {
        var re = new RegExp("rgb\\s*\\(\\s*([0-9]+).*,\\s*([0-9]+).*,\\s*([0-9]+).*\\)", "gi");

        var rgb = col.replace(re, "$1,$2,$3").split(',');
        if (rgb.length == 3) {
            r = parseInt(rgb[0]).toString(16);
            g = parseInt(rgb[1]).toString(16);
            b = parseInt(rgb[2]).toString(16);

            r = r.length == 1 ? '0' + r : r;
            g = g.length == 1 ? '0' + g : g;
            b = b.length == 1 ? '0' + b : b;

            return "#" + r + g + b;
        }

        return col;
    }

    function convertHexToRGB(col) {
        if (col.indexOf('#') != -1) {
            col = col.replace(new RegExp('[^0-9A-F]', 'gi'), '');

            r = parseInt(col.substring(0, 2), 16);
            g = parseInt(col.substring(2, 4), 16);
            b = parseInt(col.substring(4, 6), 16);

            return "rgb(" + r + "," + g + "," + b + ")";
        }

        return col;
    }

    function trimSize(size) {
        size = size.replace(/([0-9\.]+)(px|%|in|cm|mm|em|ex|pt|pc)/i, '$1$2');
        return size ? size.replace(/px$/, '') : "";
    }

    function getStyle(elm, attrib, style) {
        var val = tinyMCEPopup.editor.dom.getAttrib(elm, attrib);

        if (val != '') {
            return '' + val;
        }

        if (typeof(style) == 'undefined') {
            style = attrib;
        }

        return tinyMCEPopup.editor.dom.getStyle(elm, style);
    }

    function getCSSSize(size) {
        size = trimSize(size);

        if (size == "")
            return "";

        // Add px
        if (/^[0-9]+$/.test(size))
            size += 'px';
        // Sanity check, IE doesn't like broken values
        else if (!(/^[0-9\.]+(px|%|in|cm|mm|em|ex|pt|pc)$/i.test(size)))
            return "";

        return size;
    }

    var TableDialog = {
        settings: {},
        init: function() {
            var self = this,
                ed = tinyMCEPopup.editor,
                context = tinyMCEPopup.getWindowArg('context', 'table');

            this.html5 = ed.settings.schema === "html5-strict";

            if (!this.settings.file_browser) {
                $('input.browser').removeClass('browser');
            }

            Wf.init();

            if (context == 'merge') {
                return this.initMerge();
            }

            if (this.html5) {
                // hide HTML4 only attributes (tframe = frame)
                $('#axis, #abbr, #scope, #summary, #char, #charoff, #tframe, #nowrap, #rules, #cellpadding, #cellspacing').each(function() {
                    $(this).add('label[for="' + this.id + '"]').hide();
                });
            }

            if (ed.settings.schema !== "html4") {
                // replace border field with checkbox
                $('#border').replaceWith('<input type="checkbox" id="border" />');
            }

            // trigger colour changes
            $('#bgcolor, #bordercolor').change(function() {
                self.changedColor(this);
            });
            // background-image change
            $('#backgroundimage').change(function() {
                self.changedBackgroundImage(this);
            });
            // border
            $('#border').change(function() {
                self.changedBorder(this);
            });

            switch (context) {
                case 'table':
                    this.initTable();
                    break;
                case 'cell':
                    this.initCell();
                    break;
                case 'row':
                    this.initRow();
                    break;
            }
        },
        insert: function() {
            var context = tinyMCEPopup.getWindowArg('context', 'table');

            switch (context) {
                case 'table':
                    this.insertTable();
                    break;
                case 'cell':
                    this.updateCells();
                    break;
                case 'row':
                    this.updateRows();
                    break;
                case 'merge':
                    this.merge();
                    break;
            }
        },
        initMerge: function() {
            $('#numcols').val(tinyMCEPopup.getWindowArg('cols', 1));
            $('#numrows').val(tinyMCEPopup.getWindowArg('rows', 1));

            $('#insert').button('option', 'label', tinyMCEPopup.getLang('update', 'Update', true));
        },
        updateClassList: function(cls) {
            if (!cls) {
                return;
            }

            $('#classlist').val(function() {
                var n = this,
                    a = cls.split(' '),
                    r = [];

                $.each(a, function(i, v) {
                    if (v.indexOf('mceItem') == -1) {
                        if ($('option[value="' + v + '"]', n).length == 0) {
                            $(n).append(new Option(v, v));
                        }

                        r.push(v);
                    }
                });

                return r;

            }).change();
        },
        initTable: function() {
            var ed = tinyMCEPopup.editor;

            var elm = ed.dom.getParent(ed.selection.getNode(), "table");
            var action = tinyMCEPopup.getWindowArg('action');

            if (!action) {
                action = elm ? "update" : "insert";
            }

            if (elm && action != "insert") {
                var rowsAr = elm.rows;
                var cols = 0;

                for (var i = 0; i < rowsAr.length; i++) {
                    if (rowsAr[i].cells.length > cols) {
                        cols = rowsAr[i].cells.length;
                    }
                }

                var style = ed.dom.parseStyle(ed.dom.getAttrib(elm, "style"));

                // Update form
                $('#align').val(function() {
                    var v = ed.dom.getAttrib(elm, 'align') || ed.dom.getStyle(elm, 'float');

                    if (v) {
                        return v;
                    }

                    if (ed.dom.getStyle(elm, 'margin-left') === "auto" && ed.dom.getStyle(elm, 'margin-right') === "auto") {
                        style['margin-left'] = "";
                        style['margin-right'] = "";

                        return "center";
                    }

                    return "";
                });

                $('#tframe').val(ed.dom.getAttrib(elm, 'frame'));
                $('#rules').val(ed.dom.getAttrib(elm, 'rules'));

                var cls = ed.dom.getAttrib(elm, 'class');

                cls = cls.replace(/(?:^|\s)mceItem(\w+)(?!\S)/g, '');

                this.updateClassList(cls);

                $('#classes').val(cls);

                $('#cols').val(cols);
                $('#rows').val(rowsAr.length);

                var border = trimSize(getStyle(elm, 'border', 'borderWidth'));

                // clean border
                border = border.replace(/[\D]/g, '');

                // set border
                if ($('#border').is(':checkbox')) {
                    $('#border').prop('checked', border == 1);
                } else {
                    $('#border').val(border);
                }

                $('#cellpadding').val(ed.dom.getAttrib(elm, 'cellpadding', ""));
                $('#cellspacing').val(ed.dom.getAttrib(elm, 'cellspacing', ""));
                $('#bordercolor').val(convertRGBToHex(getStyle(elm, 'bordercolor', 'borderLeftColor'))).change();
                $('#bgcolor').val(convertRGBToHex(getStyle(elm, 'bgcolor', 'backgroundColor'))).change();
                $('#id').val(ed.dom.getAttrib(elm, 'id'));
                $('#summary').val(ed.dom.getAttrib(elm, 'summary'));

                $('#width').val(trimSize(getStyle(elm, 'width', 'width')));
                $('#height').val(trimSize(getStyle(elm, 'height', 'height')));

                // remove width and height 
                style.width = "";
                style.height = "";

                // update style field
                $('#style').val(ed.dom.serializeStyle(style));

                $('#dir').val(ed.dom.getAttrib(elm, 'dir'));
                $('#lang').val(ed.dom.getAttrib(elm, 'lang'));
                $('#backgroundimage').val(getStyle(elm, 'background', 'backgroundImage').replace(new RegExp("url\\(['\"]?([^'\"]*)['\"]?\\)", 'gi'), "$1"));

                $('#caption').prop('checked', elm.getElementsByTagName('caption').length > 0);

                this.orgTableWidth = $('#width').val();
                this.orgTableHeight = $('#height').val();

                $('#insert .uk-button-text').text(tinyMCEPopup.getLang('update', 'Update', true));
            } else {
                Wf.setDefaults(this.settings.defaults);
            }

            // Disable some fields in update mode
            if (action == "update") {
                $('#cols, #rows').prop('disabled', true);
            }
        },
        initRow: function() {
            var self = this,
                ed = tinyMCEPopup.editor,
                dom = tinyMCEPopup.dom;

            var trElm = dom.getParent(ed.selection.getStart(), "tr");
            var style = ed.dom.parseStyle(ed.dom.getAttrib(trElm, "style"));

            // Get table row data
            var rowtype = trElm.parentNode.nodeName.toLowerCase();
            var align = getStyle(trElm, 'align', 'text-align');
            var height = trimSize(getStyle(trElm, 'height', 'height'));
            var className = dom.getAttrib(trElm, 'class');
            var bgcolor = convertRGBToHex(getStyle(trElm, 'bgcolor', 'backgroundColor'));
            var backgroundimage = getStyle(trElm, 'background', 'backgroundImage').replace(new RegExp("url\\(['\"]?([^'\"]*)['\"]?\\)", 'gi'), "$1");
            var id = dom.getAttrib(trElm, 'id');
            var lang = dom.getAttrib(trElm, 'lang');
            var dir = dom.getAttrib(trElm, 'dir');

            $('#rowtype').change(function() {
                self.setActionforRowType();
            }).val(rowtype).change();

            // Any cells selected
            if (dom.select('td.mceSelected,th.mceSelected', trElm).length == 0) {

                $('#bgcolor').val(bgcolor).change();
                $('#backgroundimage').val(backgroundimage);
                $('#height').val(height);
                $('#id').val(id);
                $('#lang').val(lang);

                // remove align
                style['text-align'] = "";

                $('#align').val(align);

                // remove height 
                style.height = "";

                // update style field
                $('#style').val(dom.serializeStyle(style));

                className = className.replace(/(?:^|\s)mceItem(\w+)(?!\S)/g, '');

                // update class list
                this.updateClassList(className);

                $('#dir').val(dir);

                $('#insert .uk-button-text').text(tinyMCEPopup.getLang('update', 'Update', true));
            } else {
                $('#action').hide();
            }
        },
        initCell: function() {
            var ed = tinyMCEPopup.editor,
                dom = ed.dom;

            var tdElm = dom.getParent(ed.selection.getStart(), "td,th");
            var style = dom.parseStyle(dom.getAttrib(tdElm, "style"));

            // Get table cell data
            var celltype = tdElm.nodeName.toLowerCase();
            var align = getStyle(tdElm, 'align', 'text-align');
            var valign = getStyle(tdElm, 'valign', 'vertical-align');
            var width = trimSize(getStyle(tdElm, 'width', 'width'));
            var height = trimSize(getStyle(tdElm, 'height', 'height'));
            var bordercolor = convertRGBToHex(getStyle(tdElm, 'bordercolor', 'borderLeftColor'));
            var bgcolor = convertRGBToHex(getStyle(tdElm, 'bgcolor', 'backgroundColor'));
            var className = dom.getAttrib(tdElm, 'class');
            var backgroundimage = getStyle(tdElm, 'background', 'backgroundImage').replace(new RegExp("url\\(['\"]?([^'\"]*)['\"]?\\)", 'gi'), "$1");
            var id = dom.getAttrib(tdElm, 'id');
            var lang = dom.getAttrib(tdElm, 'lang');
            var dir = dom.getAttrib(tdElm, 'dir');
            var scope = dom.getAttrib(tdElm, 'scope');

            if (!dom.hasClass(tdElm, 'mceSelected')) {
                $('#bordercolor').val(bordercolor).change();
                $('#bgcolor').val(bgcolor).change();
                $('#backgroundimage').val(backgroundimage);
                $('#width').val(width);
                $('#height').val(height);
                $('#id').val(id);
                $('#lang').val(lang);

                // remove alignment
                style['vertical-align'] = "";
                style['text-align'] = "";

                $('#align').val(align);
                $('#valign').val(valign);

                // remove width and height 
                style.width = "";
                style.height = "";

                // update style field
                $('#style').val(dom.serializeStyle(style));

                className = className.replace(/(?:^|\s)mceItem(\w+)(?!\S)/g, '');

                // update class list
                this.updateClassList(className);

                $('#dir').val(dir);
                $('#celltype').val(celltype);
                $('#scope').val(scope);

                // Resize some elements
                if ($('#backgroundimagebrowser').is(':visible')) {
                    $('#backgroundimage').width(180);
                }

                $('#insert .uk-button-text').text(tinyMCEPopup.getLang('update', 'Update', true));
            } else {
                $('#action').hide();
            }
        },
        merge: function() {
            var func;

            tinyMCEPopup.restoreSelection();
            func = tinyMCEPopup.getWindowArg('onaction');

            func({
                cols: $('#numcols').val(),
                rows: $('#numrows').val()
            });

            tinyMCEPopup.close();
        },
        insertTable: function() {
            var ed = tinyMCEPopup.editor,
                dom = ed.dom;

            tinyMCEPopup.restoreSelection();

            var elm = ed.dom.getParent(ed.selection.getNode(), "table");
            var action = tinyMCEPopup.getWindowArg('action');

            if (!action) {
                action = elm ? "update" : "insert";
            }

            var cols = 2,
                rows = 2,
                border = 0,
                cellpadding = -1,
                cellspacing = -1,
                align, width, height, className, caption, frame, rules;
            var html = '',
                capEl, elm;
            var cellLimit, rowLimit, colLimit;

            if (!AutoValidator.validate($('form').get(0))) {
                tinyMCEPopup.alert(ed.getLang('invalid_data'));
                return false;
            }

            // Get form data
            cols = $('#cols').val();
            rows = $('#rows').val();
            border = $('#border').val() != "" ? $('#border').val() : 0;
            cellpadding = $('#cellpadding').val() != "" ? $('#cellpadding').val() : "";
            cellspacing = $('#cellspacing').val() != "" ? $('#cellspacing').val() : "";
            align = $("#align").val();
            frame = $("#tframe").val();
            rules = $("#rules").val();
            width = $('#width').val();
            height = $('#height').val();
            bordercolor = $('#bordercolor').val();
            bgcolor = $('#bgcolor').val();
            className = $("#classes").val();
            id = $('#id').val();
            summary = $('#summary').val();
            style = $('#style').val();
            dir = $('#dir').val();
            lang = $('#lang').val();
            background = $('#backgroundimage').val();
            caption = $('#caption').is(':checked');

            // reset border if checkbox (html5)
            if ($('#border').is(':checkbox')) {
                border = $('#border').is(':checked') ? '1' : '';
            }

            // Update table
            if (action == "update") {
                ed.execCommand('mceBeginUndoLevel');

                if (!this.html5) {
                    dom.setAttrib(elm, 'cellPadding', cellpadding, true);
                    dom.setAttrib(elm, 'cellSpacing', cellspacing, true);
                }

                if (!this.isCssSize(border)) {
                    dom.setAttrib(elm, 'border', border);
                } else {
                    dom.setAttrib(elm, 'border', '');
                }

                if (border == '') {
                    dom.setStyle(elm, 'border-width', '');
                    dom.setStyle(elm, 'border', '');
                    dom.setAttrib(elm, 'border', '');
                }

                // remove values for html5
                if (ed.settings.schema !== "html4") {
                    align = "";
                    width = "";
                    height = "";
                }
                // set or remove align
                dom.setAttrib(elm, 'align', align);

                // set or remove width & height
                dom.setAttribs({ "width": width, "height": height });

                dom.setAttrib(elm, 'frame', frame);
                dom.setAttrib(elm, 'rules', rules);
                dom.setAttrib(elm, 'class', className);
                dom.setAttrib(elm, 'style', style);
                dom.setAttrib(elm, 'id', id);
                dom.setAttrib(elm, 'summary', summary);
                dom.setAttrib(elm, 'dir', dir);
                dom.setAttrib(elm, 'lang', lang);
                capEl = ed.dom.select('caption', elm)[0];

                if (capEl && !caption) {
                    capEl.parentNode.removeChild(capEl);
                }

                if (!capEl && caption) {
                    capEl = elm.ownerDocument.createElement('caption');

                    if (!tinymce.isIE || tinymce.isIE11) {
                        capEl.innerHTML = '<br data-mce-bogus="1"/>';
                    }

                    elm.insertBefore(capEl, elm.firstChild);
                }

                // set width
                dom.setStyle(elm, 'width', getCSSSize($('#width').val()));
                // set height
                dom.setStyle(elm, 'height', getCSSSize($('#height').val()));

                if ($('#align').val()) {
                    ed.formatter.apply('align' + $('#align').val(), {}, elm);
                }

                // Remove these since they are not valid XHTML
                dom.setAttrib(elm, 'borderColor', '');
                dom.setAttrib(elm, 'bgColor', '');
                dom.setAttrib(elm, 'background', '');

                ed.addVisual();

                // Fix for stange MSIE align bug
                //elm.outerHTML = elm.outerHTML;

                ed.nodeChanged();
                ed.execCommand('mceEndUndoLevel', false, {}, {
                    skip_undo: true
                });

                // Repaint if dimensions changed
                if ($('#width').val() != this.orgTableWidth || $('#height').val() != this.orgTableHeight) {
                    ed.execCommand('mceRepaint');
                }

                tinyMCEPopup.close();
                return true;
            }

            // Create new table
            html += '<table';
            html += this.makeAttrib('id', id);
            if (!this.isCssSize(border)) {
                html += this.makeAttrib('border', border);
            }
            html += this.makeAttrib('cellpadding', cellpadding);
            html += this.makeAttrib('cellspacing', cellspacing);
            html += this.makeAttrib('data-mce-new', '1');

            if (ed.settings.schema !== "html4") {
                width = "";
                height = "";
                align = "";
            }

            html += this.makeAttrib('width', width);
            html += this.makeAttrib('height', height);

            html += this.makeAttrib('align', align);
            html += this.makeAttrib('frame', frame);
            html += this.makeAttrib('rules', rules);
            html += this.makeAttrib('class', className);
            html += this.makeAttrib('style', style);
            html += this.makeAttrib('summary', summary);
            html += this.makeAttrib('dir', dir);
            html += this.makeAttrib('lang', lang);
            html += '>';

            if (caption) {
                if (!tinymce.isIE || tinymce.isIE11) {
                    html += '<caption><br data-mce-bogus="1"/></caption>';
                } else {
                    html += '<caption></caption>';
                }
            }

            for (var y = 0; y < rows; y++) {
                html += "<tr>";

                for (var x = 0; x < cols; x++) {
                    if (!tinymce.isIE || tinymce.isIE11) {
                        html += '<td><br data-mce-bogus="1"/></td>';
                    } else {
                        html += '<td></td>';
                    }
                }
                html += "</tr>";
            }
            html += "</table>";

            ed.execCommand('mceBeginUndoLevel');

            // Move table
            if (ed.settings.fix_table_elements) {
                var patt = '';

                ed.focus();
                ed.selection.setContent('<br class="_mce_marker" />');

                tinymce.each('h1,h2,h3,h4,h5,h6,p'.split(','), function(n) {
                    if (patt) {
                        patt += ',';
                    }
                    patt += n + ' ._mce_marker';
                });


                tinymce.each(ed.dom.select(patt), function(n) {
                    ed.dom.split(ed.dom.getParent(n, 'h1,h2,h3,h4,h5,h6,p'), n);
                });


                dom.setOuterHTML(dom.select('br._mce_marker')[0], html);
            } else {
                ed.execCommand('mceInsertContent', false, html);
            }

            tinymce.each(dom.select('table[data-mce-new]'), function(node) {
                var tdorth = dom.select('td,th', node);

                // Fixes a bug in IE where the caret cannot be placed after the table if the table is at the end of the document
                if (tinymce.isIE && !tinymce.isIE11 && node.nextSibling == null) {
                    if (ed.settings.forced_root_block)
                        dom.insertAfter(dom.create(ed.settings.forced_root_block), node);
                    else
                        dom.insertAfter(dom.create('br', {
                            'data-mce-bogus': '1'
                        }), node);
                }

                try {
                    // IE9 might fail to do this selection
                    ed.selection.setCursorLocation(tdorth[0], 0);
                } catch (ex) {
                    // Ignore
                }

                dom.setAttrib(node, 'data-mce-new', '');
            });


            ed.addVisual();
            ed.execCommand('mceEndUndoLevel', false, {}, {
                skip_undo: true
            });

            tinyMCEPopup.close();
        },
        updateCells: function() {
            var self = this,
                el, ed = tinyMCEPopup.editor,
                inst = ed,
                tdElm, trElm, tableElm;

            tinyMCEPopup.restoreSelection();
            el = ed.selection.getStart();
            tdElm = ed.dom.getParent(el, "td,th");
            trElm = ed.dom.getParent(el, "tr");
            tableElm = ed.dom.getParent(el, "table");

            // Cell is selected
            if (ed.dom.hasClass(tdElm, 'mceSelected')) {
                // Update all selected sells
                tinymce.each(ed.dom.select('td.mceSelected,th.mceSelected'), function(td) {
                    self.updateCell(td);
                });

                ed.addVisual();
                ed.nodeChanged();
                inst.execCommand('mceEndUndoLevel');
                tinyMCEPopup.close();
                return;
            }

            ed.execCommand('mceBeginUndoLevel');

            switch ($('#action').val()) {
                case "cell":
                    var celltype = $('#celltype').val();
                    var scope = $('#scope').val();

                    function doUpdate(s) {
                        if (s) {
                            self.updateCell(tdElm);

                            ed.addVisual();
                            ed.nodeChanged();
                            inst.execCommand('mceEndUndoLevel');
                            tinyMCEPopup.close();
                        }
                    };

                    if (ed.getParam("accessibility_warnings", 1)) {
                        if (celltype == "th" && scope == "") {
                            tinyMCEPopup.confirm(ed.getLang('table_dlg.missing_scope', 'Missing Scope', true), doUpdate);
                        } else {
                            doUpdate(1);
                        }

                        return;
                    }

                    this.updateCell(tdElm);
                    break;

                case "row":
                    var cell = trElm.firstChild;

                    if (cell.nodeName != "TD" && cell.nodeName != "TH") {
                        cell = this.nextCell(cell);
                    }

                    do {
                        cell = this.updateCell(cell, true);
                    } while ((cell = this.nextCell(cell)) != null);

                    break;

                case "all":
                    var rows = tableElm.getElementsByTagName("tr");

                    for (var i = 0; i < rows.length; i++) {
                        var cell = rows[i].firstChild;

                        if (cell.nodeName != "TD" && cell.nodeName != "TH") {
                            cell = this.nextCell(cell);
                        }

                        do {
                            cell = this.updateCell(cell, true);
                        } while ((cell = this.nextCell(cell)) != null);
                    }

                    break;
            }

            ed.addVisual();
            ed.nodeChanged();
            inst.execCommand('mceEndUndoLevel');
            tinyMCEPopup.close();
        },
        updateRow: function(tr_elm, skip_id, skip_parent) {
            var ed = tinyMCEPopup.editor,
                dom = ed.dom,
                doc = ed.getDoc(),
                v;

            var curRowType = tr_elm.parentNode.nodeName.toLowerCase();
            var rowtype = $('#rowtype').val();

            var tableElm = dom.getParent(ed.selection.getStart(), "table");
            var rows = tableElm.rows;

            if (!rows.length) {
                rows.push(tr_elm);
            }

            function setAttrib(elm, name, value) {
                if (rows.length === 1 || value) {
                    dom.setAttrib(elm, name, value);
                }
            }

            function setStyle(elm, name, value) {
                if (rows.length === 1 || value) {
                    dom.setStyle(elm, name, value);
                }
            }

            $.each(['id', 'lang', 'dir', 'classes', 'scope', 'style'], function(i, k) {
                v = $('#' + k).val();

                if (k == 'id' && skip_id) {
                    return;
                }

                if (k == 'style') {
                    v = dom.serializeStyle(dom.parseStyle(v));
                }

                if (k == 'classes') {
                    k = 'class';
                }

                setAttrib(tr_elm, k, v);
            });

            // Clear deprecated attributes
            $.each(['height', 'bgColor', 'background'], function(i, k) {
                ed.dom.setAttrib(tr_elm, k, null);
            });

            // set height
            setStyle(tr_elm, 'height', getCSSSize($('#height').val()));

            if ($('#align').val()) {
                ed.formatter.apply('align' + $('#align').val(), {}, tr_elm);
            }

            /*if ($('#valign').val()) {
                ed.formatter.apply('valign' + $('#valign').val(), {}, tr_elm);
            }*/

            // Setup new rowtype
            if (curRowType != rowtype && !skip_parent) {
                // first, clone the node we are working on
                var newRow = tr_elm.cloneNode(1);

                // next, find the parent of its new destination (creating it if necessary)
                var theTable = dom.getParent(tr_elm, "table");
                var dest = rowtype;
                var newParent = null;
                for (var i = 0; i < theTable.childNodes.length; i++) {
                    if (theTable.childNodes[i].nodeName.toLowerCase() == dest) {
                        newParent = theTable.childNodes[i];
                    }
                }

                if (newParent == null) {
                    newParent = doc.createElement(dest);

                    if (dest == "thead") {
                        if (theTable.firstChild.nodeName == 'CAPTION') {
                            ed.dom.insertAfter(newParent, theTable.firstChild);
                        } else {
                            theTable.insertBefore(newParent, theTable.firstChild);
                        }
                    } else {
                        theTable.appendChild(newParent);
                    }
                }

                // append the row to the new parent
                newParent.appendChild(newRow);

                // remove the original
                tr_elm.parentNode.removeChild(tr_elm);

                // set tr_elm to the new node
                tr_elm = newRow;
            }
        },
        makeAttrib: function(attrib, value) {
            if (typeof(value) == "undefined" || value == null) {
                value = $('#' + attrib).val();
            }

            if (value == "") {
                return "";
            }

            // XML encode it
            value = value.replace(/&/g, '&amp;');
            value = value.replace(/\"/g, '&quot;');
            value = value.replace(/</g, '&lt;');
            value = value.replace(/>/g, '&gt;');

            return ' ' + attrib + '="' + value + '"';
        },
        updateRows: function() {
            var self = this,
                ed = tinyMCEPopup.editor,
                dom = ed.dom,
                trElm, tableElm;
            var action = $('#action').val();

            tinyMCEPopup.restoreSelection();
            trElm = dom.getParent(ed.selection.getStart(), "tr");
            tableElm = dom.getParent(ed.selection.getStart(), "table");

            // Update all selected rows
            if (dom.select('td.mceSelected,th.mceSelected', trElm).length > 0) {
                tinymce.each(tableElm.rows, function(tr) {
                    var i;

                    for (i = 0; i < tr.cells.length; i++) {
                        if (dom.hasClass(tr.cells[i], 'mceSelected')) {
                            self.updateRow(tr, true);
                            return;
                        }
                    }
                });

                ed.addVisual();
                ed.nodeChanged();
                ed.execCommand('mceEndUndoLevel');
                tinyMCEPopup.close();
                return;
            }

            ed.execCommand('mceBeginUndoLevel');

            switch (action) {
                case "row":
                    this.updateRow(trElm);
                    break;

                case "all":
                    var rows = tableElm.getElementsByTagName("tr");

                    for (var i = 0; i < rows.length; i++) {
                        this.updateRow(rows[i], true);
                    }

                    break;

                case "odd":
                case "even":
                    var rows = tableElm.getElementsByTagName("tr");

                    for (var i = 0; i < rows.length; i++) {
                        if ((i % 2 == 0 && action == "odd") || (i % 2 != 0 && action == "even"))
                            this.updateRow(rows[i], true, true);
                    }

                    break;
            }

            ed.addVisual();
            ed.nodeChanged();
            ed.execCommand('mceEndUndoLevel');
            tinyMCEPopup.close();
        },
        updateCell: function(td, skip_id) {
            var self = this,
                ed = tinyMCEPopup.editor,
                dom = ed.dom,
                doc = ed.getDoc(),
                v;

            var curCellType = td.nodeName.toLowerCase();
            var celltype = $('#celltype').val();

            var cells = ed.dom.select('td.mceSelected,th.mceSelected');

            if (!cells.length) {
                cells.push(td);
            }

            function setAttrib(elm, name, value) {
                if (cells.length === 1 || value) {
                    dom.setAttrib(elm, name, value);
                }
            }

            function setStyle(elm, name, value) {
                if (cells.length === 1 || value) {
                    dom.setStyle(elm, name, value);
                }
            }

            $.each(['id', 'lang', 'dir', 'classes', 'scope', 'style'], function(i, k) {
                v = $('#' + k).val();

                if (k == 'id' && skip_id) {
                    return;
                }

                if (k == 'style') {
                    v = dom.serializeStyle(dom.parseStyle(v));
                }

                if (k == 'classes') {
                    k = 'class';
                }

                setAttrib(td, k, v);
            });

            // Clear deprecated attributes
            $.each(['width', 'height', 'bgColor', 'borderColor', 'background'], function(i, k) {
                ed.dom.setAttrib(td, k, null);
            });

            // set width
            setStyle(td, 'width', getCSSSize($('#width').val()));
            // set height
            setStyle(td, 'height', getCSSSize($('#height').val()));

            if ($('#align').val()) {
                ed.formatter.apply('align' + $('#align').val(), {}, td);
            }

            if ($('#valign').val()) {
                ed.formatter.apply('valign' + $('#valign').val(), {}, td);
            }

            if (curCellType != celltype) {
                // changing to a different node type
                var newCell = doc.createElement(celltype);

                for (var c = 0; c < td.childNodes.length; c++)
                    newCell.appendChild(td.childNodes[c].cloneNode(1));

                for (var a = 0; a < td.attributes.length; a++)
                    ed.dom.setAttrib(newCell, td.attributes[a].name, ed.dom.getAttrib(td, td.attributes[a].name));

                td.parentNode.replaceChild(newCell, td);
                td = newCell;
            }

            return td;
        },
        nextCell: function(elm) {
            while ((elm = elm.nextSibling) != null) {
                if (elm.nodeName == "TD" || elm.nodeName == "TH") {
                    return elm;
                }
            }

            return null;
        },
        changedSize: function() {
            var st = tinyMCEPopup.dom.parseStyle($('#style').val());

            var height = $('#height').val();

            if (height != "") {
                st['height'] = this.cssSize(height);
            } else {
                st['height'] = "";
            }

            $('#style').val(tinyMCEPopup.dom.serializeStyle(st));
        },
        changedBackgroundImage: function() {
            var st = tinyMCEPopup.dom.parseStyle($('#style').val());

            st['background-image'] = "url('" + $('#backgroundimage').val() + "')";

            $('#style').val(tinyMCEPopup.dom.serializeStyle(st));
        },
        isCssSize: function(value) {
            return /^[0-9.]+(%|in|cm|mm|em|ex|pt|pc|px)$/.test(value);
        },
        cssSize: function(value, def) {
            value = tinymce.trim(value || def);

            if (!this.isCssSize(value)) {
                return parseInt(value, 10) + 'px';
            }

            return value;
        },
        changedBorder: function() {
            var st = tinyMCEPopup.dom.parseStyle($('#style').val());

            var bw = $('#border').val();

            if (bw != "" && (this.isCssSize(bw) || $('#bordercolor').val() != ""))
                st['border-width'] = this.cssSize(bw);
            else {
                if (!bw) {
                    st['border'] = '';
                    st['border-width'] = '';
                }
            }

            $('#style').val(tinyMCEPopup.dom.serializeStyle(st));
        },
        changedColor: function(e) {
            var dom = tinyMCEPopup.editor.dom;

            var v = e.value,
                id = e.id,
                st = dom.parseStyle($('#style').val());

            if (v && v.charAt(0) !== '#') {
                v = '#' + v;
            }

            if (id === 'bgcolor') {
                st['background-color'] = v;
            }

            if (id === 'bordercolor' && v !== '') {
                st['border-color'] = v;
            }

            $('#style').val(dom.serializeStyle(st));
        },
        changedStyle: function() {
            var dom = tinyMCEPopup.dom;
            var st = dom.parseStyle($('#style').val());

            if (st['background-image']) {
                $('#backgroundimage').val(st['background-image'].replace(new RegExp("url\\(['\"]?([^'\"]*)['\"]?\\)", 'gi'), "$1"));
            } else {
                $('#backgroundimage').val('');
            }
            if (st['width']) {
                $('#width').val(trimSize(st['width']));
            }

            if (st['height']) {
                $('#height').val(trimSize(st['height']));
            }
            if (st['background-color']) {
                $('#bgcolor').val(st['background-color']).change();
            }

            if (st['border-color']) {
                $('#bordercolor').val(st['border-color']).change();
            }

            if (st['border-spacing']) {
                $('#cellspacing').val(trimSize(st['border-spacing']));
            }

            if (st['border-collapse'] && st['border-collapse'] == 'collapse') {
                $('#cellspacing').val(0);
            }

            if (st['vertical-align']) {
                $('#valign').val(st['vertical-align']);
            }
        },
        setClasses: function(v) {
            //Wf.setClasses(v);
        },
        setActionforRowType: function() {
            var rowtype = $('#rowtype').val();

            if (rowtype === "tbody") {
                $('#action').prop('disabled', false);
            } else {
                $('#action').val('row').prop('disabled', true);
            }
        }

    };

    tinyMCEPopup.onInit.add(TableDialog.init, TableDialog);

    window.TableDialog = TableDialog;
})(tinymce, tinyMCEPopup, jQuery);