
//function rad(deg) {
//  return deg * PI / 180;
//}

//function deg(rad) {
//  return rad / PI * 180;
//}

function distance2(a, b) {
  var
    dx = a[0]-b[0],
    dy = a[1]-b[1];
  return dx*dx + dy*dy;
}

//function normalize(value, min, max) {
//  var range = max-min;
//  return clamp((value-min)/range, 0, 1);
//}

//function unit(x, y, z) {
//  var m = Math.sqrt(x*x + y*y + z*z);
//
//  if (m === 0) {
//    m = 0.00001;
//  }
//
//  return [x/m, y/m, z/m];
//}

//function pattern(str, param) {
//  return str.replace(/\{(\w+)\}/g, function(tag, key) {
//    return param[key] || tag;
//  });
//}

function clamp(value, min, max) {
  return Math.min(max, Math.max(value, min));
}

function rotatePoint(x, y, angle) {
  return {
    x: Math.cos(angle)*x - Math.sin(angle)*y,
    y: Math.sin(angle)*x + Math.cos(angle)*y
   };
}

function addListener(target, type, fn) {
  target.addEventListener(type, fn, false);
}

function removeListener(target, type, fn) {
  target.removeEventListener(type, fn, false);
}

function cancelEvent(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.returnValue = false;
}
