
module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        separator: '\n',
        banner: "(function(global) {",
        footer: "}(this));"
      },
      dist: {
        src: grunt.file.readJSON('config.json'),
        dest: 'dist/GLMap/<%=pkg.name%>.debug.js'
      }
    },

    uglify: {
      options: {},
      build: {
        src: 'dist/GLMap/<%=pkg.name%>.debug.js',
        dest: 'dist/GLMap/<%=pkg.name%>.js'
      }
    },

    copy: {
      dist: [{
        src: 'src/style.css',
        dest: 'dist/GLMap/GLMap.css'
      }]
    },

    shaders: {
      dist: {
        src: 'src/shaders',
        dest: 'src/Shaders.min.js'
      }
    },

    jshint: {
      options: {
         globals: {
           Map: true
         }
       },
      all: grunt.file.readJSON('config.json')
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerMultiTask('copy', 'Copy Files', function() {
    var fs = require('fs');
    var config = grunt.config.data.copy.dist;
    for (var i = 0; i < config.length; i++) {
      fs.writeFileSync(config[i].dest, fs.readFileSync(config[i].src));
    }
  });

  grunt.registerTask('default', 'Development build', function() {
    grunt.log.writeln('\033[1;36m'+ grunt.template.date(new Date(), 'yyyy-mm-dd HH:MM:ss') +'\033[0m');
    grunt.task.run('copy');
    grunt.task.run('concat');
    grunt.task.run('uglify');
  });

  grunt.registerTask('release', 'Release', function() {
    grunt.log.writeln('\033[1;36m'+ grunt.template.date(new Date(), 'yyyy-mm-dd HH:MM:ss') +'\033[0m');
    grunt.task.run('jshint');
    grunt.task.run('default');
  });
};
