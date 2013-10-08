/*
 * Configuration panel for some of MapBBCodeUI properties
 * Callback is invoked every time any of the options is changed
 */
window.MapBBCodeConfig = L.Class.extend({
    includes: L.Mixin.Events,

    options: {
        layers: [],
        defaultZoom: 2,
        defaultPosition: [22, 11],
        viewWidth: 600,
        viewHeight: 300,
        fullViewHeight: 600,
        editorHeight: 400,
        windowWidth: 600,
        windowHeight: 400,
        fullFromStart: false,
        editorInWindow: true,
        editorTypeFixed: false,
        maxLayers: 5
    },

    strings: {},

    initialize: function( options ) {
        L.setOptions(this, options);
    },

    setStrings: function( strings ) {
        this.strings = L.extend({}, this.strings, strings);
    },

    addLayer: function( id ) {
        this._layerSwitcher.addLayer(id);
    },

    _updateDivSize:function (el) {
        var width, height, mode = this._mode;
        if( mode === 'view' && this.options.fullFromStart )
            mode = 'full';
        if( mode === 'edit' && this.options.editorInWindow )
            mode = 'window';
        if( mode === 'view' ) {
            width = '' + this.options.viewWidth + 'px';
            height = '' + this.options.viewHeight + 'px';
        } else if( mode === 'full' ) {
            width = '100%';
            height = '' + this.options.fullViewHeight + 'px';
        } else if( mode === 'edit' ) {
            width = '100%';
            height = '' + this.options.editorHeight + 'px';
        } else if( mode === 'window' ) {
            width = this.options.windowWidth || this.options.viewWidth;
            height = this.options.windowHeight || this.options.editorHeight;
        }
        el.style.width = width;
        el.style.height = height;
    },

    _latLngToArray: function( latlng ) {
        return [
            L.Util.formatNum(latlng.lat, 5),
            L.Util.formatNum(latlng.lng, 5)
        ];
    },

    _updateFullTitle: function( mode, fs ) {
        if( this._mode === 'view' ) {
            mode.setContent(this.strings.view);
            mode.setTitle(this.strings.viewTitle);
            fs.setContent(this.options.fullFromStart ? this.strings.viewFull : this.strings.viewNormal);
            fs.setTitle(this.options.fullFromStart ? this.strings.viewFullTitle : this.strings.viewNormalTitle);
        } else if( this._mode === 'edit' ) {
            mode.setContent(this.strings.editor);
            mode.setTitle(this.strings.editorTitle);
            fs.setContent(this.options.editorInWindow ? this.strings.editInWindow : this.strings.editInPanel);
            fs.setTitle(this.options.editorInWindow ? this.strings.editInWindowTitle : this.strings.editInPanelTitle);
        }
    },

    show: function( element ) {
        var el = typeof element === 'string' ? document.getElementById(element) : element;
        if( !el )
            return;
        this._mode = 'view';
        var mapDiv = document.createElement('div');
        el.appendChild(mapDiv);

        this._updateDivSize(mapDiv);

        var map = L.map(mapDiv, { zoomControl: false }).setView(this.options.defaultPosition && this.options.defaultPosition.length == 2 ? this.options.defaultPosition : [22, 11], this.options.defaultZoom);
        map.addControl(new L.Control.Zoom({ zoomInTitle: this.strings.zoomInTitle, zoomOutTitle: this.strings.zoomOutTitle }));
        var layerSwitcher = L.staticLayerSwitcher(this.options.layers, { editable: true, maxLayers: this.options.maxLayers });
        map.addControl(layerSwitcher);
        layerSwitcher.on('layerschanged', function(e) {
            this.options.layers = e.layers;
            this.fire('change', this.options);
        }, this);
        layerSwitcher.on('selectionchanged', function(e) {
            this.fire('layerselected', { id: e.selectedId });
        }, this);
        this.options.layers = layerSwitcher.getLayerIds();
        this._layerSwitcher = layerSwitcher;

        map.on('moveend zoomend', function() {
            this.options.defaultPosition = this._latLngToArray(map.getCenter());
            this.options.defaultZoom = map.getZoom();
            this.fire('change', this.options);
        }, this);

        var fs = new L.FunctionButton('full', { position: 'topright' });
        var modeButton = new L.FunctionButton('mode', { position: 'topright' });
        var widthButton = new L.FunctionButtons(['&ltrif;', '&rtrif;'], { position: 'bottomright', titles: [this.strings.shrinkTitle, this.strings.growTitle] });
        var heightButton = new L.FunctionButtons(['&utrif;', '&dtrif;'], { position: 'bottomleft', titles: [this.strings.shrinkTitle, this.strings.growTitle] });

        var toggleWidthButton = function() {
            var isFull = this._mode === 'view' ? this.options.fullFromStart : !this.options.editorInWindow;
            if( isFull )
                map.removeControl(widthButton);
            else
                map.addControl(widthButton);
        };

        fs.on('clicked', function() {
            var isFull = this._mode === 'view' ? this.options.fullFromStart : !this.options.editorInWindow;
            if( this._mode === 'view' )
                this.options.fullFromStart = !isFull;
            else
                this.options.editorInWindow = isFull;
            toggleWidthButton.call(this);
            this._updateFullTitle(modeButton, fs);
            this._updateDivSize(mapDiv);
            map.invalidateSize();
            this.fire('change', this.options);
        }, this);

        modeButton.on('clicked', function() {
            this._mode = this._mode === 'view' ? 'edit' : 'view';
            if( this.options.fullFromStart == this.options.editorInWindow )
                toggleWidthButton.call(this);
            if( this.options.editorTypeFixed ) {
                if( this._mode === 'view' )
                    map.addControl(fs);
                else
                    map.removeControl(fs);
            }
            this._updateFullTitle(modeButton, fs);
            this._updateDivSize(mapDiv);
            map.invalidateSize();
        }, this);

        widthButton.on('clicked', function(e) {
            var delta = e.idx * 100 - 50,
                value = this._mode === 'view' ? this.options.viewWidth : this.options.windowWidth;
            if( value + delta >= 400 && value + delta <= 1000 ) {
                // more strict checks
                if( this._mode === 'view' ) {
                    if( !this.options.fullFromStart ) {
                        this.options.viewWidth += delta;
                        this._updateDivSize(mapDiv);
                        map.invalidateSize();
                        this.fire('change', this.options);
                    }
                } else if( this._mode === 'edit' ) {
                    if( this.options.editorInWindow ) {
                        this.options.windowWidth += delta;
                        this._updateDivSize(mapDiv);
                        map.invalidateSize();
                        this.fire('change', this.options);
                    }
                }
            }
        }, this);

        heightButton.on('clicked', function(e) {
            var delta = e.idx * 100 - 50, value;
            if( this._mode === 'view' )
                value = this.options.fullFromStart ? this.options.fullViewHeight : this.options.viewHeight;
            else if( this._mode === 'edit' )
                value = this.options.editorInWindow ? this.options.windowHeight : this.options.editorHeight;

            if( value + delta >= 200 && value + delta <= 800 ) {
                if( this._mode === 'view' ) {
                    if( this.options.fullFromStart )
                        this.options.fullViewHeight += delta;
                    else
                        this.options.viewHeight += delta;
                } else if( this._mode === 'edit' ) {
                    if( this.options.editorInWindow )
                        this.options.windowHeight += delta;
                    else
                        this.options.editorHeight += delta;
                }
                this._updateDivSize(mapDiv);
                map.invalidateSize();
                this.fire('change', this.options);
            }
        }, this);

        map.addControl(modeButton);
        map.addControl(fs);
        map.addControl(widthButton);
        map.addControl(heightButton);
        this._updateFullTitle(modeButton, fs);
        this.fire('show', this.options);
    }
});
