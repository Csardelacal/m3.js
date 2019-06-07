/* 
 * The MIT License
 *
 * Copyright 2019 César de la Cal Bretschneider <cesar@magic3w.com>.
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

depend([], function () {
	
	var RollingWindow = function (a, b) {
		this.a = a < b? a : b;
		this.b = a < b? b : a;
	};
	
	RollingWindow.prototype = {
		
		intersection: function (r) {
			/*
			 * Sort the windows first, if we put the first one first, we know the 
			 * intersection easier
			 */
			var pa = this.a > r.a? this.a : r.a;
			var pb = this.b < r.b? this.b : r.b;
			
			/*
			 * They don't cross each other.
			 */
			if (pa > pb) { return undefined; }
			
			return new RollingWindow(pa, pb);
		},
		
		contains: function (r) {
			var t = this.intersection(r);
			
			if (t === undefined) { return false; }
			return t.a === r.a && t.b === r.b;
		},
		
		above: function (r) {
			return this.a < r.a;
		},
		
		below: function (r) {
			return this.b > r.b;
		},
		
		height: function () {
			return this.b - this.a;
		},
		
		extend : function (by) {
			return new RollingWindow(this.a - by, this.b + by);
		}
		
	};
	
	return RollingWindow;
	
});
