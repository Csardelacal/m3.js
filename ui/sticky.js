/* 
 * The MIT License
 *
 * Copyright 2018 César de la Cal Bretschneider <cesar@magic3w.com>.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */


/**
 * 
 * @todo This code is a major mess, but it seems to work reliably enough for now.
 *       Needs refactoring.
 * 
 * @returns {undefined}
 */
depend(['m3/core/debounce', 'm3/ui/rollingwindow'], function (debounce, RollingWindow) {
	
	"use strict";
	
	var offset     = {x : window.pageXOffset, y : window.pageYOffset, dir : undefined };
	var height     = window.innerheight;
	var registered = [];
	
	
	var Sticky = function (element, placeholder, context, direction) {
		
		/*
		 * Allows to configure the clearance that the element should maintain from
		 * the top of the screen at any given point in time.
		 */
		this.clear = 0;
		
		this.status = 'grounded';
		this.scrollDirection = 'down';
		this.offset = element.getBoundaries().a;
		
		this.getElement   = function () { return element; };
		this.getContext   = function () { return context; };
		
		this.getDirection = function () { 
			return direction || 'top'; 
		};
		
		this.update = function (viewport, direction, delta) {
			var contextB = this.getContext().getElement().getBoundaries();
			var elementB = new RollingWindow(this.offset, this.offset + this.getElement().dimensions.height);
			
			/**
			 * If the element is floating, it position is considered relative to the 
			 * viewport
			 */
			if (this.status === 'floating') {
				elementB = elementB.move('down', viewport.a);
			}
			
			/*
			 * In case the viewport is bigger than the element we only care for the 
			 * part that is as big as the element. We can then shrink it to fit 
			 * appropriately
			 */
			var diff = (viewport.b - viewport.a) - (elementB.b - elementB.a);
			
			if ( diff > 0 ) {
				if (this.getDirection() === 'top') { viewport.b-= diff; }
				if (this.getDirection() === 'bottom') { viewport.a+= diff; }
			}
			
			/*
			 * If the viewport and the context do not touch, then there's no way our
			 * item is going to be displayed.
			 */
			if (contextB.intersection(viewport) === undefined) { return this.ground(contextB.a); }
			
			/*
			 * If the context is small enough to fit into the viewport, then our item 
			 * will be certianly not moving around.
			 */
			if (viewport.contains(contextB)) { return this.ground(contextB.a); }
			
			/*
			 * 
			 */
			if (viewport.below(contextB)) { return this.ground(contextB.b - this.getElement().dimensions.height); }
			if (viewport.above(contextB)) { return this.ground(contextB.a); }
			
			if (direction !== this.scrollDirection && diff < 0) {
				this.ground(elementB.a);
				this.scrollDirection = direction;
				//return;
			}
			
			/*
			 * 
			 */
			if (direction === 'down' && viewport.below(elementB)) { 
				this.pin(this.getDirection() === 'top'? Math.min(diff, 0) : diff); 
				return;
			}
			
			if (direction === 'up' && viewport.above(elementB)) { 
				this.pin(this.getDirection() === 'top'? 0 : Math.max(diff, 0)); 
				return;
			}
			
		};
		
		this.pin = function ( at) 
		{
			
			this.status = 'floating';
			this.offset = at;

			var wrapper = placeholder.getHTML();
			var detach  = this.getElement().getHTML();
			var c       = detach.getBoundingClientRect();
			var w       = wrapper.getBoundingClientRect();
			
			/*
			 * Create a placeholder so the layout doesn't shift when the element
			 * is being removed from the parent's static flow.
			 */
			wrapper.style.height  = c.height + 'px';
			
			/*
			 * Pin the element accordingly.
			 */
			detach.style = null;
			detach.style.position  = 'fixed';
			detach.style.width     = w.width + 'px';
			detach.style.top = at + 'px';
			
		};
		
		
		this.ground = function (at) {
			
			
			this.status =  'grounded';
			this.offset = at;
			
			var wrapper = placeholder.getHTML();
			var detach  = this.getElement().getHTML();
			var c       = detach.getBoundingClientRect();
			
			detach.style = null;
			
			/*
			 * Create a placeholder so the layout doesn't shift when the element
			 * is being removed from the parent's static flow.
			 */
			wrapper.style.height  = c.height + 'px';
			
			
			detach.style.position  = 'absolute';
			detach.style.top       = at + 'px';
			detach.style.width     = c.width + 'px';
			detach.style.zIndex    = 5;

		};
		
		registered.push(this);
	};
	
	var Context = function (element) {
		
		this.getElement = function () {
			return element;
		};
		
		/**
		 * 
		 * @type Array
		 */
		this.registered = [];
	};
	
	var Element = function (original) {
		
		this.getBoundaries = debounce(function () { 
			var box = original.getBoundingClientRect();
			return new RollingWindow(box.top + offset.y, offset.y + box.top + box.height);
		}, 500);
		
		/*
		 * Calculate the dimensions of the item the first time
		 */
		this.dimensions = original.getBoundingClientRect();
		
		this.getHTML = function() {
			return original;
		};
	};
	
	
	var findContext = function (e) {
		if (e === document.body) { return e; }
		if (e.hasAttribute('data-sticky-context')) { return e; }
		
		return findContext(e.parentNode);
	};
	
	var wrap = function (element) {
		var wrapper = document.createElement('div');
		element.parentNode.insertBefore(wrapper, element);
		wrapper.appendChild(element);
		
		return wrapper;
	};
	
	/*
	 * Register a listener to defer all scroll listening. When the user scrolls, 
	 * the listener will check which elements it should pin to the top and which
	 * it should leave behind.
	 */
	window.addEventListener('scroll', debounce(function () {
		
		/*
		 * Recalculate the offsets. Offsets do, for some reason, trigger reflows
		 * of the browser. So, we must read them before making any changes to the
		 * DOM
		 */
		offset = {x : window.pageXOffset, y : window.pageYOffset, dir : (window.pageYOffset - offset.y) > 0? 'down' : 'up', delta : window.pageYOffset - offset.y };
		height = window.innerHeight;

		/*
		 * Only elements with oncreen contexts are even remotely relevant to this 
		 * query, since offscreen contexts never allow their elements to escape.
		 */
		registered.forEach( function (e) { e.update(new RollingWindow(offset.y, offset.y + height), offset.dir, offset.delta); });
		

		
	}), false);
	
	
	document.addEventListener('load', function () {
		
		/*
		 * Recalculate the offsets. Offsets do, for some reason, trigger reflows
		 * of the browser. So, we must read them before making any changes to the
		 * DOM
		 */
		offset = {x : window.pageXOffset, y : window.pageYOffset, dir : (window.pageYOffset - offset.y) > 0? 'down' : 'up', delta : window.pageYOffset - offset.y};
		height = window.innerHeight;

		/*
		 * Only elements with oncreen contexts are even remotely relevant to this 
		 * query, since offscreen contexts never allow their elements to escape.
		 */
		registered.forEach( function (e) { e.update(new RollingWindow(offset.y, offset.y + height), offset.dir); });
		
	}, false);
	
	return {
		context : findContext,
		
		stick : function (element, context, direction) { 
			var ctx = new Context(new Element(context));
			/*
			 * Element gets wrapped, and the placeholder wraps the element again.
			 */
			var element = wrap(element);
			var stick = new Sticky(new Element(element), new Element(wrap(element)), ctx, direction);
			
			stick.update(new RollingWindow(offset.y, offset.y + height), offset.dir)
			return stick;
		}
	};
	
});