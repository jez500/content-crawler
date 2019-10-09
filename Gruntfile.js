module.exports = function(grunt) {

  grunt.initConfig({
    browserify: {
      dist: {
        files: {
          'public/bundle.js': ['src/*.js'],
          'public/ui.js': ['ui/*.js'],
        },
        options: {
          browserifyOptions: {
            debug: true
          },
          ignore: ['tedious', 'mysql2', 'pg', 'pg-hstore', 'pg-native', 'hiredis']
        }
      }
    },
    jshint: {
      files: ['src/*.js', 'ui/*.js'],
      options: {
        "globals": {
	  "console": true
	},
        'esversion': 6
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint', 'browserify']
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          globals: [
            'window', 'console'
          ],
          require: [
            'jsdom-global/register',
            'public/bundle.js',
            'public/ui.js',
          ],
        },
        src: ['test/*.js']
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.registerTask('default', ['jshint', 'browserify', 'mochaTest']);

};
