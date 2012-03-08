﻿/**
enyo.TouchScrollStrategy is a helper kind that implments a touch based scroller that integrates the scrolling simulation provided
by <a href="#enyo.ScrollMath">enyo.ScrollMath</a> into an <a href="#enyo.Scroller">enyo.Scroller</a>.

enyo.TouchScrollStrategy is not typically created in application code.
*/
enyo.kind({
	name: "enyo.TouchScrollStrategy",
	kind: "ScrollStrategy",
	/**
		If true, the scroller will not propagate dragstart events that cause it to start scrolling (defaults to true)
	*/
	preventDragPropagation: true,
	published: {
		/**
			Specifies how to horizontally scroll. Acceptable values are:
			
			* "scroll": Always scrolls.
			* "auto":  Scroll only if the content overflows the scroller.
			* "hidden": Never scroll.
			* "default": In touch environments, the default vertical scrolling behavior is to always scroll. If the content does not
			overflow the scroller, the scroller will overscroll and snap back.
		*/
		vertical: "default",
		/**
			Specifies how to vertically scroll. Acceptable values are:

			* "scroll": Always scrolls.
			* "auto":  Scroll only if the content overflows the scroller.
			* "hidden": Never scroll.
			* "default": Same as auto.
		*/
		horizontal: "default",
		nofit: false
	},
	events: {
		onScrollStart: "doScrollStart",
		onScroll: "doScroll",
		onScrollStop: "doScrollStop"
	},
	//* @protected
	handlers: {
		onflick: "flick",
		onhold: "hold",
		ondragstart: "dragstart",
		ondrag: "drag",
		ondragfinish: "dragfinish",
		onmousewheel: "mousewheel"
	},
	classes: "enyo-touch-scroller",
	components: [
		{name: "scroll", kind: "ScrollMath"},
		{name: "client", classes: "enyo-touch-scroller", attributes: {"onscroll": enyo.bubbler}}
	],
	create: function() {
		this.inherited(arguments);
		this.nofitChanged();
	},
	rendered: function() {
		this.inherited(arguments);
		this.calcBoundaries();
		this.syncScrollMath();
	},
	nofitChanged: function() {
		this.$.client.addRemoveClass("enyo-fit", !this.nofit);
	},
	scrollHandler: function() {
		this.calcBoundaries();
		this.syncScrollMath();
	},
	horizontalChanged: function() {
		this.$.scroll.horizontal = (this.horizontal != "hidden");
	},
	verticalChanged: function() {
		this.$.scroll.vertical = (this.horizontal != "hidden");
	},
	calcScrollNode: function() {
		return this.$.client.hasNode();
	},
	calcAutoScrolling: function() {
		var v = (this.vertical == "auto");
		var h = (this.horizontal == "auto") || (this.horizontal == "default");
		if ((v || h) && this.scrollNode) {
			var b = this.container.getBounds();
			if (v) {
				this.$.scroll.vertical = this.scrollNode.scrollHeight > b.height;
			}
			if (h) {
				this.$.scroll.horizontal = this.scrollNode.scrollWidth > b.width;
			}
		}
	},
	shouldDrag: function(e) {
		var requestV = e.vertical;
		var canH = this.$.scroll.horizontal;
		var canV = this.$.scroll.vertical;
		return requestV && canV || !requestV && canH;
	},
	flick: function(inSender, e) {
		var onAxis = Math.abs(e.xVelocity) > Math.abs(e.yVelocity) ? this.horizontal : this.vertical;
		if (onAxis) {
			this.$.scroll.flick(e);
			return this.preventDragPropagation;
		}
	},
	hold: function(inSender, e) {
		if (this.$.scroll.isScrolling() && !this.$.scroll.isInOverScroll()) {
			this.$.scroll.stop(e);
			return true;
		}
	},
	// special synthetic DOM events served up by the Gesture system
	dragstart: function(inSender, inEvent) {
		this.calcAutoScrolling();
		this.dragging = this.shouldDrag(inEvent);
		if (this.dragging) {
			inEvent.preventNativeDefault();
			// note: needed because show/hide changes
			// the position so sync'ing is required when 
			// dragging begins (needed because dom scroll does not fire on show/hide)
			this.syncScrollMath();
			this.$.scroll.startDrag(inEvent);
			if (this.preventDragPropagation) {
				return true;
			}
		}
	},
	drag: function(inSender, inEvent) {
		if (this.dragging) {
			inEvent.preventNativeDefault();
			this.$.scroll.drag(inEvent);
		}
	},
	dragfinish: function(inSender, inEvent) {
		if (this.dragging) {
			inEvent.preventTap();
			this.$.scroll.dragFinish();
			this.dragging = false;
		}
	},
	mousewheel: function(inSender, e) {
		if (!this.dragging && this.$.scroll.mousewheel(e)) {
			e.preventDefault();
			return true;
		}
	},
	scrollStart: function(inSender) {
		if (this.scrollNode) {
			this.calcBoundaries();
			this.doScrollStart(inSender);
		}
	},
	scroll: function(inSender) {
		this.effectScroll(-inSender.x, -inSender.y);
		this.doScroll(inSender);
	},
	scrollStop: function(inSender) {
		this.effectOverscroll(null, null);
		this.doScrollStop(inSender);
	},
	calcBoundaries: function() {
		var s = this.$.scroll, b = this.$.client.getBounds();
		s.bottomBoundary = b.height - this.scrollNode.scrollHeight;
		s.rightBoundary = b.width - this.scrollNode.scrollWidth;
	},
	syncScrollMath: function() {
		var s = this.$.scroll;
		if (!s.isScrolling()) {
			s.setScrollX(-this.getScrollLeft());
			s.setScrollY(-this.getScrollTop());
		}
	},
	effectScroll: function(inX, inY) {
		if (this.scrollNode) {
			this.scrollNode.scrollLeft = inX;
			this.scrollNode.scrollTop = inY;
			this.effectOverscroll(Math.round(inX), Math.round(inY));
		}
	},
	effectOverscroll: function(inX, inY) {
		var n = this.scrollNode;
		var o = "";
		if (inY !== null && Math.abs(inY - n.scrollTop) > 1) {
			o += " translateY(" + (n.scrollTop - inY) + "px)";
		}
		if (inX !== null && Math.abs(inX - n.scrollLeft) > 1) {
			o += " translateX(" + (n.scrollLeft - inX) + "px)";
		}
		if (n) {
			var s = n.style;
			s.webkitTransform = s.MozTransform = s.msTransform = s.transform = o;
		}
	},
	getScrollBounds: function() {
		var r = this.inherited(arguments);
		var m = this.$.scroll;
		r.overleft = -Math.floor(this.getScrollLeft() + m.x);
		r.overtop = -Math.floor(this.getScrollTop() + m.y);
		return r;
	}
});
