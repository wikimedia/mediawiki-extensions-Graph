/*!
 * Grunt file
 *
 * @package Graph
 */

/*jshint node:true */
module.exports = function ( grunt ) {
	var conf = grunt.file.readJSON( 'extension.json' );

	grunt.loadNpmTasks( 'grunt-contrib-csslint' );
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-jsonlint' );
	grunt.loadNpmTasks( 'grunt-jscs' );

	grunt.initConfig( {
		jshint: {
			options: {
				jshintrc: true
			},
			all: [
				'*.js',
				'js/*.js',
				'modules/ve-graph/**/*.js'
			]
		},
		jscs: {
			src: '<%= jshint.all %>'
		},
		csslint: {
			options: {
				csslintrc: '.csslintrc'
			},
			all: 'modules/ve-graph/**/*.css'
		},
		watch: {
			files: [
				'.{jscsrc,jshintignore,jshintrc}',
				'<%= jshint.all %>'
			],
			tasks: 'lint'
		},
		banana: {
			all: conf.MessagesDirs.Graph
		},
		jsonlint: {
			all: [
				'**/*.json',
				'!node_modules/**'
			]
		}
	} );

	grunt.registerTask( 'lint', [ 'jshint', 'jscs', 'jsonlint', 'csslint', 'banana' ] );
	grunt.registerTask( 'test', 'lint' );
	grunt.registerTask( 'default', 'test' );
};
