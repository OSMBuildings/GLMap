
# GLMap

A very basic map engine. Mostly provicdes events and layer handling. This is used for OSM Buildings (http://osmbuildings.org/).

## Documentation

All geo coordinates are in EPSG:4326.

### Quick integration

Link all required libraries in your HTML head section. Files are provided in folder `/dist`.

~~~ html
<head>
  <link rel="stylesheet" href="GLMap/GLMap.css">
  <script src="GLMap/GLMap.js"></script>
</head>

<body>
  <div id="map"></div>
~~~

In a script section initialize the map and add a map tile layer.

~~~ javascript
  var map = new GLMap('map', {
    position: { latitude:52.52000, longitude:13.41000 },
    zoom: 16
  });
~~~

### GLMap Options

option | value | description
--- | --- | ---
position | object | geo position of map center
zoom | float | map zoom
rotation | float | map rotation
tilt | float | map tilt
bend | float | map bend
disabled | boolean | disables user input, default false
minZoom | float | minimum allowed zoom
maxZoom | float | maximum allowed zoom
attribution | string | attribution, optional
state | boolean | stores map position/rotation in url, default false
bounds | object | n, e, s, w coordinates of bounds where the map can be moved within

### GLMap methods

method | parameters | description
--- | --- | ---
on | type, function | add an event listener, types are: change, resize, pointerdown, pointermove, pointerup 
off | type, fn | remove event listener
setDisabled | boolean | disables any user input
isDisabled | | check wheether user input is disabled
project | latitude, longitude, worldSize | transforms geo coordinates to world pixel coordinates (tile size << zoom)
unproject | x, y, worldSize | transforms world (tile size << zoom) pixel coordinates to geo coordinates (EPSG:4326)
transform | latitude, longitude, elevation | transforms a geo coordinate + elevation to screen position
getBounds | | returns geocordinates of current map view, respects tilt and rotation but ignores perspective
setZoom | float | sets current zoom
getZoom | | gets current zoom
setPosition | object | sets current geo position of map center
getPosition | | gets current geo position of map center
setSize | object | {width,height} sets current map size in pixels
getSize |  | gets current map size in pixels
setRotation | float | sets current rotation
getRotation | | gets current rotation
setTilt | float | sets current tilt
getTilt | | gets current tilt
setBend | float | sets current bend
getBend | | gets current bend

## Examples

### Map control buttons

~~~ html
<div class="control tilt">
  <button class="dec">&#8601;</button>
  <button class="inc">&#8599;</button>
</div>

<div class="control rotation">
  <button class="inc">&#8630;</button>
  <button class="dec">&#8631;</button>
</div>

<div class="control zoom">
  <button class="dec">-</button>
  <button class="inc">+</button>
</div>

<div class="control bend">
  <button class="dec">B-</button>
  <button class="inc">B+</button>
</div>
~~~

~~~ javascript
var controlButtons = document.querySelectorAll('.control button');

for (var i = 0; i < controlButtons.length; i++) {
  controlButtons[i].addEventListener('click', function(e) {
    var button = this;
    var parentClassList = button.parentNode.classList;
    var direction = button.classList.contains('inc') ? 1 : -1;
    var increment;
    var property;

    if (parentClassList.contains('tilt')) {
      property = 'Tilt';
      increment = direction*10;
    }
    if (parentClassList.contains('rotation')) {
      property = 'Rotation';
      increment = direction*10;
    }
    if (parentClassList.contains('zoom')) {
      property = 'Zoom';
      increment = direction*1;
    }
    if (parentClassList.contains('bend')) {
      property = 'Bend';
      increment = direction*1;
    }
    if (property) {
      map['set'+ property](map['get'+ property]()+increment);
    }
  });
}
~~~
