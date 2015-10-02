
var baseURL = '../';

function loadFile(url) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, false);
  xhr.send(null);

  var s = xhr.status;
  if (s !== 0 && s !== 200 && s !== 1223) {
    var err = Error(xhr.status +' failed to load '+ url);
    err.status = xhr.status;
    err.responseText = xhr.responseText;
    throw err;
  }

  return xhr.responseText;
}

var config = JSON.parse(loadFile(baseURL +'config.json'));

var file, str, js = '';
var global = this;

for (var i = 0; i < config.lib.length; i++) {
  js += loadFile(baseURL + config.lib[i]) +'\n\n';
}

for (var i = 0; i < config.src.length; i++) {
  file = config.src[i];

  str = loadFile(baseURL + file);

  js += '//****** file: '+ file +' ******\n\n';
  js += str +'\n\n';
}

try {
  eval(js);
} catch (ex) {
  console.error(ex);
}
