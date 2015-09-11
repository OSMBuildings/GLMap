
module.exports = function(grunt) {

  grunt.initConfig({
    product: 'GLMap',

    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        separator: '\n',
        banner: "var GLMap = (function(global) {",
        footer: "\
  return GLMap;\
}(this));\
\
if (typeof define === 'function') {\
  define([], GLMap);\
} else if (typeof exports === 'object') {\
  module.exports = GLMap;\
} else {\
  global.GLMap = GLMap;\
}\
"
      },
      dist: {
        src: [grunt.file.readJSON('config.json').lib, grunt.file.readJSON('config.json').src],
        dest:  'dist/<%=product%>.debug.js'
      }
    },

    uglify: {
      options: {},
      build: {
        src: 'dist/<%=product%>.debug.js',
        dest: 'dist/<%=product%>.js'
      }
    },

    jshint: {
      options: {
         globals: {
           Map: true
         },
         multistr: true
       },
      all: grunt.file.readJSON('config.json').src
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', 'Development build', function() {
    grunt.log.writeln('\033[1;36m'+ grunt.template.date(new Date(), 'yyyy-mm-dd HH:MM:ss') +'\033[0m');
    grunt.task.run('concat');
    grunt.task.run('uglify');
  });

  grunt.registerTask('release', 'Release', function() {
    grunt.log.writeln('\033[1;36m'+ grunt.template.date(new Date(), 'yyyy-mm-dd HH:MM:ss') +'\033[0m');
    grunt.task.run('jshint');
    grunt.task.run('default');
  });
};
