/*jslint browser:true */
/*global HTMLElement*/

/*
 * First thing first. If we do not have access to any HTMLElement class it implies
 * that lysine can't work properly since it manipulates these elements.
 */
if (HTMLElement === undefined) { throw 'Lysine requires a browser to work. HTMLElement class was not found'; }
if (window      === undefined) { throw 'Lysine requires a browser to work. Window variable was not found'; }

depend([
	'm3/core/collection',
	'm3/core/lysine/inputAdapter',
	'm3/core/lysine/selectAdapter',
	'm3/core/lysine/htmlAdapter'
], 
function (collection, input, select, htmlAdapter) {
	"use strict";
	
	/**
	 * An adapter is any element that allows lysine to manipulate data. It's an 
	 * interface for the reading and writing of data.
	 * 
	 * This class also allows or testing the different Adapters as compatible since
	 * they all inherit from the Adapter class
	 * 
	 * Since JS is duck typed we can't define the abstract getValue and setValue
	 * functions that we normally would. Instead we will have to make sure that
	 * the methods are present in the implementing classes.
	 * 
	 * @returns {lysine_L11.Adapter}
	 */
	function Adapter() {
		/*
		 * The element the adapter wraps around. This will always be an HTML node.
		 */
		this.element = null;
		
		/**
		 * This method defines the element this adapter is managing. This way Lysine
		 * can leave a HTML node that the implementing adapter can retrieve.
		 * 
		 * @param {Element} e
		 * @returns {undefined}
		 */
		this.setElement = function (e) {
			this.element = e;
		};

		/**
		 * The implementing
		 * classes can use this to provide the data they're supposed to handle
		 * 
		 * @returns {Element}
		 */
		this.getElement = function () {
			return this.element;
		};
	}

	function ArrayAdapter(view) {
		this.views = [];
		this.base  = view;
		this.parentView = undefined;

		this.getValue = function () {
			var ret = [],
				 i;

			for (i = 0; i < this.views.length; i+=1) {
				ret.push(this.views[i].getValue());
			}
			return ret;
		};

		this.setValue = function (val) {

			var i, v;

			if (val === undefined) {
				return;
			}
			
			/*
			 * In this scenario, we have more views than necessary and need to get 
			 * rid of some. We first loop over the array to remove them from the 
			 * HTML (destroy them). Then we slice the array with them in it.
			 */
			for (i = val.length; i < this.views.length; i+=1) {
				this.views[i].destroy();
			}
			
			this.views = this.views.slice(0, val.length);
			
			/*
			 * In the event of the views not being enough to hold the data, we will
			 * add new views.
			 */
			for (i = this.views.length; i < val.length; i+=1) {
				v = new lysine(this.base);
				this.views.push(v);
				
				//Create a gettter so we can read the data
				this.makeGetter(i);
			}
			
			for (i = 0; i < val.length; i++) {
				this.views[i].setValue(val[i]);
			}
			
		};
		
		this.makeGetter = function (idx) {
			var ctx = this;
			
			Object.defineProperty(this, idx, {
				get: function () { return ctx.views[idx]; },
				configurable: true
			});
			
		};
		
		this.for = function() {
			return [this.base.getAttribute('data-for')];
		};
		
		this.parent = function(v) {
			this.parentView = v;
			return this;
		};
		
		this.refresh = function () {
			this.setValue(this.parentView.get(this.for()));
		};
	}
	
	/**
	 * The Attribute Array Adapter provides a easy way to accessing the attributes
	 * an element has that contain Lysine functionality.
	 * 
	 * An attribute called data-lysine-src for example will be used to set the value
	 * of the src attribute, allowing you to use the src as a fallback in case the
	 * attribute has no value in Lysine.
	 * 
	 * @param {HTMLElement} element
	 * @returns {lysine_L11.AttributeArrayAdapter}
	 */
	function AttributeArrayAdapter(element) {

		this.setElement(element);
		this.adapters = collection([]);

		this.fetchData = function (view) {
			var data = view.getData();

			for (var i = 0; i < this.adapters.length; i++) {
				var a = this.adapters[i];
				a.setData(data);
				this.getElement().setAttribute(
					a.getAttributeName(), 
					a.replace()
				);
			}
		};

		this.hasLysine = function() {
			var success = false;
			
			this.adapters.each(function(e) {
				if (e.hasLysine()) { success = true; }
			});
			
			return success;
		};
		
		this.for = function() {
			var ret = collection([]);
			this.adapters.each(function (e) { ret.merge(e.for()); });
			return ret.raw();
		};
		
		this.parent = function(v) {
			this.adapters.each(function (e) { e.parent(v); });
			return this;
		};
		
		this.refresh = function () {
			var self = this;
			
			this.adapters.each(function (e) { 
				e.refresh(); 
				
				self.getElement().setAttribute(
					e.getAttributeName(), 
					e.replace()
				);
			});
		};
		
		var dataset = this.getElement().dataset,
		    i;
		
		for (var i in dataset) {
			if (element.dataset.hasOwnProperty(i)) {
				this.adapters.push(new AttributeAdapter(i, element.dataset[i]));
			}
		}
	}

	AttributeArrayAdapter.prototype = new Adapter();
	AttributeArrayAdapter.prototype.constructor = AttributeArrayAdapter;
	
	/**
	 * 
	 * @param {string} name
	 * @param {string} value
	 * @returns {lysine_L11.AttributeAdapter}
	 */
	function AttributeAdapter(name, value) {
		
		this.name     = name;
		this.value    = value;
		this.adapters = this.makeAdapters();
		this.view     = undefined;
		
		this.setData  = function (data) {
			for (var i = 0; i < this.adapters.length; i++) {
				this.adapters[i].setValue(data[this.adapters[i].getName()]);
			}
		};
		
		this.replace  = function () {
			var str = '';
			
			for (var i = 0; i < this.adapters.length; i++) {
				str+= this.adapters[i].replace();
			}
			
			return str;
		};
	}
	
	AttributeAdapter.prototype = {
		hasLysine: function () { 
			return this.name.search(/^lysine/) !== -1; 
		},
		
		getAttributeName: function() {
			return this.name.replace(/^lysine/, '').toLowerCase();
		},
		
		makeAdapters: function () {
			if (!this.hasLysine()) { return []; }
			
			var exp1 = /\{\{([A-Za-z0-9]+)\}\}/g;
			var exp2 = /\{\{[A-Za-z0-9]+\}\}/g;
			
			var adapters = [];
			
			var pieces = this.value.split(exp2);
			var m      = exp1.exec(this.value);
			while (m) {
				adapters.push(new AttributeVariableAdapter(pieces.shift(), true));
				adapters.push(new AttributeVariableAdapter(m[1], false));
				//Continue the loop
				m = exp1.exec(this.value);
			}
			
			if (pieces.length > 0) { adapters.push(new AttributeVariableAdapter(pieces.shift(), true)); }
			
			return adapters;
		},
		
		for: function () {
			var ret = collection([]);
			
			collection(this.adapters).each(function(e) {
				if (!e.isReadOnly()) { ret.append(e.getName); }
			});
			
			return ret;
		},
		
		parent : function (view) {
			this.view = view;
			return this;
		},
		
		refresh : function () {
			var self = this;
			collection(this.adapters).each(function(e) { 
				if (e.isReadOnly()) { return; }
				e.setValue(self.view.get(e.getName()));
			});
		}
	};
	
	function AttributeVariableAdapter(name, readonly) {
		var value = null;
		
		this.setValue = function (v) {
			value = v;
		};
		
		this.getValue = function () {
			return value;
		};
		
		this.getName  = function () {
			return name;
		};
		
		this.isReadOnly  = function () {
			return readonly;
		};
		
		this.replace  = function () {
			if (readonly) { return name; }
			else          { return value; }
		};
	}

	function Condition(expression, element) {
		var exp = /([a-zA-Z_0-9]+)\(([a-zA-Z_0-9\-]+)\)\s?(\=\=|\!\=)\s?(.+)/g;
		var res = exp.exec(expression);
		
		var fn = res[1];
		var id = res[2];
		var comp = res[3];
		var tgt = res[4];
		
		var parent = element.parentNode;
		var nextSib = element.nextSibling;
		
		this.isVisible = function (data) {
			var val = undefined;
			
			switch(fn) {
				case 'count':
					val = data[id].length;
					break;
				case 'value':
					val = data[id];
					break;
			}
			
			return comp === '=='? val === tgt : val !== tgt;
		};
		
		this.test = function (data) {
			var visible = this.isVisible(data);
			
			if (visible === (element.parentNode === parent)) {
				return;
			}
			
			if (this.isVisible(data)) {
				parent.insertBefore(element, nextSib);
			}
			else {
				parent.removeChild(element);
			}
		};
	}

	/**
	 * Creates a new Lysine view that handles the user's HTML and accepts objects as
	 * data to fill in said HTML. 
	 * 
	 * Beware of the following: IDs will potentially not properly work inside Lysine.
	 * Lysine maintains several copies of the original node and will potentially 
	 * create issues. You should dinamically generate ID to use with your objects.
	 * 
	 * @param {HTMLElement|String} id
	 * @returns {lysine_L11.lysine}
	 */
	function lysine(id) {
		
		var view, 
			 html,
			 data = {},
			 adapters = collection([]),
			 conditions = [];
		
		/*
		 * First we receive the id and check whether it is a string or a HTMLElement
		 * this way we can handle several types of arguments received there.
		 */
		if (id instanceof HTMLElement) { view = id; } 
		else { view = document.querySelector('*[data-lysine-view="'+ id +'"]'); }
		
		/*
		 * Make a deep copy of the node. This allows Lysine to create as many copies
		 * of the original without causing trouble among the copies.
		 */
		html = view.cloneNode(true);
		
		this.set = function (k, v) {
			data[k] = v;
			
			adapters.each(function(e) {
				if (e.for().indexOf(k) === -1) { return; }
				e.refresh();
			});
		};
		
		this.get = function (k) {
			return data[k];
		};

		/**
		 * Defines the data that we're gonna be using for the view. This way the 
		 * application can quickly pass a big amount of data to the view.
		 *
		 * @todo Remove the data variable that is not currently needed.
		 * @param {Object} newData
		 * @returns {undefined}
		 */
		this.setData = function (newData) {
			data = newData;
			
			adapters.each(function(e) {
				e.refresh();
			});
		};
		
		this.getData = function () {
			return data;
		};

		this.getValue = this.getData;
		this.setValue = this.setData;

		this.fetchAdapters = function (parent) {
			//Argument validation
			parent = (parent !== undefined)? parent : html;

			var attrAdapter, self = this;
			
			collection(parent.childNodes).each(function (e) {
				
				if (e.nodeType === 3) {
					return;
				}
				
				if (e.getAttribute && e.getAttribute('data-for')) {
					
					/*
					 * Array adapters may not be overridden in multiple places, it just
					 * makes little to no sense to have that feature.
					 */
					if (e.hasAttribute('data-lysine-view')) {
						adapters.merge(collection([(new ArrayAdapter(e)).parent(self)]));
					}
					else {
						/*
						 * This needs some fixing. The issue is that the system returns
						 * an array of adapters for a given value, which is okay, but
						 * the system cannot handle having multiple adapters for one 
						 * property.
						 */
						var adapter = collection([]).merge(input.find(e)).merge(select.find(e)).merge(htmlAdapter.find(e));
						adapters.merge(adapter.each(function (e) { return e.parent(self); }));
					}
				}
				else {
					self.fetchAdapters(e);
				}
				
				attrAdapter = new AttributeArrayAdapter(e);
				if (attrAdapter.hasLysine()) {
					adapters.push(attrAdapter.parent(self));
				}
				
				if (e.getAttribute && e.getAttribute('data-condition')) {
					var c = new Condition(e.getAttribute('data-condition'), e);
					conditions.push(c);
				}
			});
			
		};

		this.getHTML = function () {
			return html;
		};

		this.getElement = this.getHTML;

		this.destroy = function () {
			html.parentNode.removeChild(html);
			return this;
		};

		//Constructor tasks
		html.removeAttribute('data-lysine-view');
		this.fetchAdapters();
		view.parentNode.insertBefore(html, view);
	}
	
	/*
	 * Return the entry point so other pieces of the application may be able to 
	 * use Lysine.
	 */
	return {
		view : lysine
	};
});

/*
 * We do not wish any of the view templates to be displayed by the browser. Furthermore,
 * the application should attempt to cache and strip the elements from the DOM so
 * no stray data gets into other code that accesses the DOM.
 */
(function() {
	//Hide the unneeded view prototypes
	var style = document.createElement('style');
	style.type = "text/css";
	style.innerHTML = "*[data-lysine-view] { display: none !important;}";
	document.head.appendChild(style);
}());