/*
 diff v2.0.1

Software License Agreement (BSD License)

Copyright (c) 2009-2015, Kevin Decker <kpdecker@gmail.com>

All rights reserved.

Redistribution and use of this software in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

 Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

 Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

 Neither the name of Kevin Decker nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
@license
*/
(function (g, c) { "object" === typeof exports && "object" === typeof module ? module.exports = c() : "function" === typeof define && define.amd ? define(c) : "object" === typeof exports ? exports.JsDiff = c() : g.JsDiff = c() })(this, function () {
  return function (g) { function c(e) { if (k[e]) return k[e].exports; var d = k[e] = { exports: {}, id: e, loaded: !1 }; g[e].call(d.exports, d, d.exports, c); d.loaded = !0; return d.exports } var k = {}; c.m = g; c.c = k; c.p = ""; return c(0) }([function (g, c, k) {
    c.__esModule = !0; g = (g = k(1)) && g.__esModule ? g : { "default": g }; var e = k(3),
      d = k(4), h = k(5), a = k(6), b = k(7), f = k(8), l = k(9), m = k(10), t = k(12); k = k(13); c.Diff = g["default"]; c.diffChars = e.diffChars; c.diffWords = d.diffWords; c.diffWordsWithSpace = d.diffWordsWithSpace; c.diffLines = h.diffLines; c.diffTrimmedLines = h.diffTrimmedLines; c.diffSentences = a.diffSentences; c.diffCss = b.diffCss; c.diffJson = f.diffJson; c.structuredPatch = m.structuredPatch; c.createTwoFilesPatch = m.createTwoFilesPatch; c.createPatch = m.createPatch; c.applyPatch = l.applyPatch; c.convertChangesToDMP = t.convertChangesToDMP; c.convertChangesToXML =
        k.convertChangesToXML; c.canonicalize = f.canonicalize
  }, function (g, c, k) {
    function e(a) { this.ignoreWhitespace = a } function d(a, b, f, l) { for (var m = 0, t = a.length, q = 0, n = 0; m < t; m++) { var r = a[m]; if (r.removed) r.value = f.slice(n, n + r.count).join(""), n += r.count, m && a[m - 1].added && (r = a[m - 1], a[m - 1] = a[m], a[m] = r); else { if (!r.added && l) { var w = b.slice(q, q + r.count); w = h["default"](w, function (x, v) { v = f[n + v]; return v.length > x.length ? v : x }); r.value = w.join("") } else r.value = b.slice(q, q + r.count).join(""); q += r.count; r.added || (n += r.count) } } return a }
    c.__esModule = !0; c["default"] = e; var h = (k = k(2)) && k.__esModule ? k : { "default": k }; e.prototype = {
      diff: function (a, b, f, l) {
        function m(u) { return f ? (setTimeout(function () { f(void 0, u) }, 0), !0) : u } function t() {
          if (l && l < Date.now()) throw Error("Diff Timeout"); for (var u = -1 * w; u <= w; u += 2) {
            var p = v[u - 1]; var A = v[u + 1], y = (A ? A.newPos : 0) - u; p && (v[u - 1] = void 0); var F = p && p.newPos + 1 < n; y = A && 0 <= y && y < r; if (F || y) {
              !F || y && p.newPos < A.newPos ? (p = { newPos: A.newPos, components: A.components.slice(0) }, q.pushComponent(p.components, void 0, !0)) : (p.newPos++,
                q.pushComponent(p.components, !0, void 0)); y = q.extractCommon(p, b, a, u); if (p.newPos + 1 >= n && y + 1 >= r) return m(d(p.components, b, a, q.useLongestToken)); v[u] = p
            } else v[u] = void 0
          } w++
        } var q = this; a = this.castInput(a); b = this.castInput(b); if (b === a) return m([{ value: b }]); if (!b) return m([{ value: a, removed: !0 }]); if (!a) return m([{ value: b, added: !0 }]); b = this.removeEmpty(this.tokenize(b)); a = this.removeEmpty(this.tokenize(a)); var n = b.length, r = a.length, w = 1, x = n + r, v = [{ newPos: -1, components: [] }], B = this.extractCommon(v[0], b, a, 0); if (v[0].newPos +
          1 >= n && B + 1 >= r) return m([{ value: b.join("") }]); if (f) (function p() { setTimeout(function () { if (w > x) return f(); t() || p() }, 0) })(); else for (; w <= x;)if (B = t()) return B
      }, pushComponent: function (a, b, f) { var l = a[a.length - 1]; l && l.added === b && l.removed === f ? a[a.length - 1] = { count: l.count + 1, added: b, removed: f } : a.push({ count: 1, added: b, removed: f }) }, extractCommon: function (a, b, f, l) {
        var m = b.length, t = f.length, q = a.newPos; l = q - l; for (var n = 0; q + 1 < m && l + 1 < t && this.equals(b[q + 1], f[l + 1]);)q++, l++, n++; n && a.components.push({ count: n }); a.newPos =
          q; return l
      }, equals: function (a, b) { var f = /\S/; return a === b || this.ignoreWhitespace && !f.test(a) && !f.test(b) }, removeEmpty: function (a) { for (var b = [], f = 0; f < a.length; f++)a[f] && b.push(a[f]); return b }, castInput: function (a) { return a }, tokenize: function (a) { return a.split("") }
    }; g.exports = c["default"]
  }, function (g, c) {
    c.__esModule = !0; c["default"] = function (k, e, d) { if (Array.prototype.map) return Array.prototype.map.call(k, e, d); for (var h = Array(k.length), a = 0, b = k.length; a < b; a++)h[a] = e.call(d, k[a], a, k); return h }; g.exports =
      c["default"]
  }, function (g, c, k) { c.__esModule = !0; c.diffChars = function (d, h, a) { return e.diff(d, h, a) }; g = k(1); var e = new (g && g.__esModule ? g : { "default": g })["default"]; c.characterDiff = e }, function (g, c, k) {
    c.__esModule = !0; c.diffWords = function (a, b, f) { return d.diff(a, b, f) }; c.diffWordsWithSpace = function (a, b, f) { return h.diff(a, b, f) }; g = (g = k(1)) && g.__esModule ? g : { "default": g }; var e = /^[A-Za-z\xC0-\u02C6\u02C8-\u02D7\u02DE-\u02FF\u1E00-\u1EFF]+$/, d = new g["default"](!0); c.wordDiff = d; var h = new g["default"]; c.wordWithSpaceDiff =
      h; d.tokenize = h.tokenize = function (a) { a = a.split(/(\s+|\b)/); for (var b = 0; b < a.length - 1; b++)!a[b + 1] && a[b + 2] && e.test(a[b]) && e.test(a[b + 2]) && (a[b] += a[b + 2], a.splice(b + 1, 2), b--); return a }
  }, function (g, c, k) {
    c.__esModule = !0; c.diffLines = function (h, a, b) { return e.diff(h, a, b) }; c.diffTrimmedLines = function (h, a, b) { return d.diff(h, a, b) }; g = (g = k(1)) && g.__esModule ? g : { "default": g }; var e = new g["default"]; c.lineDiff = e; var d = new g["default"]; c.trimmedLineDiff = d; d.ignoreTrim = !0; e.tokenize = d.tokenize = function (h) {
      var a = []; h = h.split(/^/m);
      for (var b = 0; b < h.length; b++) { var f = h[b], l = h[b - 1]; l = l && l[l.length - 1]; "\n" === f && "\r" === l ? a[a.length - 1] = a[a.length - 1].slice(0, -1) + "\r\n" : (this.ignoreTrim && (f = f.trim(), b < h.length - 1 && (f += "\n")), a.push(f)) } return a
    }
  }, function (g, c, k) { c.__esModule = !0; c.diffSentences = function (d, h, a) { return e.diff(d, h, a) }; g = k(1); var e = new (g && g.__esModule ? g : { "default": g })["default"]; c.sentenceDiff = e; e.tokenize = function (d) { return d.split(/(\S.+?[.!?])(?=\s+|$)/) } }, function (g, c, k) {
    c.__esModule = !0; c.diffCss = function (d, h, a) {
      return e.diff(d,
        h, a)
    }; g = k(1); var e = new (g && g.__esModule ? g : { "default": g })["default"]; c.cssDiff = e; e.tokenize = function (d) { return d.split(/([{}:;,]|\s+)/) }
  }, function (g, c, k) {
    function e(b, f, l) {
      f = f || []; l = l || []; var m; for (m = 0; m < f.length; m += 1)if (f[m] === b) return l[m]; if ("[object Array]" === h.call(b)) { f.push(b); var t = Array(b.length); l.push(t); for (m = 0; m < b.length; m += 1)t[m] = e(b[m], f, l); f.pop(); l.pop() } else if ("object" === typeof b && null !== b) {
        f.push(b); t = {}; l.push(t); var q = [], n = void 0; for (n in b) b.hasOwnProperty(n) && q.push(n); q.sort();
        for (m = 0; m < q.length; m += 1)n = q[m], t[n] = e(b[n], f, l); f.pop(); l.pop()
      } else t = b; return t
    } c.__esModule = !0; c.diffJson = function (b, f, l) { return a.diff(b, f, l) }; c.canonicalize = e; var d = (g = k(1)) && g.__esModule ? g : { "default": g }; k = k(5); var h = Object.prototype.toString, a = new d["default"]; c.jsonDiff = a; a.useLongestToken = !0; a.tokenize = k.lineDiff.tokenize; a.castInput = function (b) { return "string" === typeof b ? b : JSON.stringify(e(b), void 0, "  ") }; a.equals = function (b, f) {
      return d["default"].prototype.equals(b.replace(/,([\r\n])/g,
        "$1"), f.replace(/,([\r\n])/g, "$1"))
    }
  }, function (g, c) {
    c.__esModule = !0; c.applyPatch = function (k, e) {
      var d = e.split("\n"); e = []; for (var h = 0, a = !1, b = !1; h < d.length && !/^@@/.test(d[h]);)h++; for (; h < d.length; h++)if ("@" === d[h][0]) { var f = d[h].split(/@@ -(\d+),(\d+) \+(\d+),(\d+) @@/); e.unshift({ start: f[3], oldlength: +f[2], removed: [], newlength: f[4], added: [] }) } else "+" === d[h][0] ? e[0].added.push(d[h].substr(1)) : "-" === d[h][0] ? e[0].removed.push(d[h].substr(1)) : " " === d[h][0] ? (e[0].added.push(d[h].substr(1)), e[0].removed.push(d[h].substr(1))) :
        "\\" === d[h][0] && ("+" === d[h - 1][0] ? a = !0 : "-" === d[h - 1][0] && (b = !0)); k = k.split("\n"); for (h = e.length - 1; 0 <= h; h--) { d = e[h]; for (f = 0; f < d.oldlength; f++)if (k[d.start - 1 + f] !== d.removed[f]) return !1; Array.prototype.splice.apply(k, [d.start - 1, d.oldlength].concat(d.added)) } if (a) for (; !k[k.length - 1];)k.pop(); else b && k.push(""); return k.join("\n")
    }
  }, function (g, c, k) {
    function e(b, f, l, m, t, q, n) {
      function r(C) { return a["default"](C, function (D) { return " " + D }) } n || (n = {}); void 0 === n.context && (n.context = 4); var w; n.timeout && (w = Date.now() +
        n.timeout); var x = h.patchDiff.diff(l, m, null, w); if (x) {
          x.push({ value: "", lines: [] }); var v = [], B = 0, u = 0, p = [], A = 1, y = 1; w = function (C) {
            var D = x[C], z = D.lines || D.value.replace(/\n$/, "").split("\n"); D.lines = z; if (D.added || D.removed) { if (!B) { var E = x[C - 1]; B = A; u = y; E && (p = 0 < n.context ? r(E.lines.slice(-n.context)) : [], B -= p.length, u -= p.length) } p.push.apply(p, a["default"](z, function (G) { return (D.added ? "+" : "-") + G })); D.added ? y += z.length : A += z.length } else {
              if (B) if (z.length <= 2 * n.context && C < x.length - 2) p.push.apply(p, r(z)); else {
                E = Math.min(z.length,
                  n.context); p.push.apply(p, r(z.slice(0, E))); E = { oldStart: B, oldLines: A - B + E, newStart: u, newLines: y - u + E, lines: p }; if (C >= x.length - 2 && z.length <= n.context) { C = /\n$/.test(l); var H = /\n$/.test(m); 0 != z.length || C ? C && H || p.push("\\ No newline at end of file") : p.splice(E.oldLines, 0, "\\ No newline at end of file") } v.push(E); u = B = 0; p = []
              } A += z.length; y += z.length
            }
          }; for (var F = 0; F < x.length; F++)w(F); return { oldFileName: b, newFileName: f, oldHeader: t, newHeader: q, hunks: v }
        }
    } function d(b, f, l, m, t, q, n) {
      l = e(b, f, l, m, t, q, n); m = []; b == f && m.push("Index: " +
        b); m.push("==================================================================="); m.push("--- " + l.oldFileName + ("undefined" === typeof l.oldHeader ? "" : "\t" + l.oldHeader)); m.push("+++ " + l.newFileName + ("undefined" === typeof l.newHeader ? "" : "\t" + l.newHeader)); for (b = 0; b < l.hunks.length; b++)f = l.hunks[b], m.push("@@ -" + f.oldStart + "," + f.oldLines + " +" + f.newStart + "," + f.newLines + " @@"), m.push.apply(m, f.lines); return m.join("\n") + "\n"
    } c.__esModule = !0; c.structuredPatch = e; c.createTwoFilesPatch = d; c.createPatch = function (b,
      f, l, m, t, q) { return d(b, b, f, l, m, t, q) }; var h = k(11), a = (g = k(2)) && g.__esModule ? g : { "default": g }
  }, function (g, c, k) { c.__esModule = !0; g = k(1); g = new (g && g.__esModule ? g : { "default": g })["default"]; c.patchDiff = g; g.tokenize = function (e) { var d = []; e = e.split(/(\n|\r\n)/); e[e.length - 1] || e.pop(); for (var h = 0; h < e.length; h++) { var a = e[h]; h % 2 ? d[d.length - 1] += a : d.push(a) } return d } }, function (g, c) {
    c.__esModule = !0; c.convertChangesToDMP = function (k) {
      for (var e = [], d, h, a = 0; a < k.length; a++)d = k[a], h = d.added ? 1 : d.removed ? -1 : 0, e.push([h, d.value]);
      return e
    }
  }, function (g, c) { function k(e) { e = e.replace(/&/g, "&amp;"); e = e.replace(/</g, "&lt;"); e = e.replace(/>/g, "&gt;"); return e = e.replace(/"/g, "&quot;") } c.__esModule = !0; c.convertChangesToXML = function (e) { for (var d = [], h = 0; h < e.length; h++) { var a = e[h]; a.added ? d.push("<ins>") : a.removed && d.push("<del>"); d.push(k(a.value)); a.added ? d.push("</ins>") : a.removed && d.push("</del>") } return d.join("") } }])
});
