Color
=====

A very basic color tool for adjusting hue, saturation, lightning and alpha of a given RGB color.

## Documentation is outdated!

Usage:

~~~ js
var col = new Color('#ffcc00');
col.H = 120; // hue, 0..360
col.S = 0.5; // saturation, 0..1
col.L = 0.5; // lightness, 0..1
col.A = 0.5; // alpha, 0..1
~~~

Parameter for new Color(...) can be in any of these:

 * #0099ffAA
 * #09fA
 * #0099ff
 * #09f
 * rgb(64, 128, 255)
 * rgba(64, 128, 255, 0.5)

Note: if you pass hex values to it, toString() will return hex values too. If you do rgba(), it'll return rgba() accordingly.
