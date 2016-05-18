/*!
 * Grunt file
 *
 * @package Graph
 */

/*jshint node:true */
module.exports = function ( grunt ) {
	var conf = grunt.file.readJSON( 'extension.json' );

	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-jsonlint' );
	grunt.loadNpmTasks( 'grunt-jscs' );
	grunt.loadNpmTasks( 'grunt-stylelint' );

	grunt.initConfig( {
		jshint: {
			options: {
				jshintrc: true
			},
			all: [
				'*.js',
				'**/*.js',
				'!lib/**',
				'!node_modules/**'
			]
		},
		jscs: {
			src: '<%= jshint.all %>'
		},
		stylelint: {
			options: {
				syntax: 'less'
			},
			all: [
				'**/*.css',
				'**/*.less',
				'!lib/**',
				'!node_modules/**'
			]
		},
		watch: {
			files: [
				'.{stylelintrc,jscsrc,jshintignore,jshintrc}',
				'<%= jshint.all %>',
				'<%= stylelint.all %>'
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

	grunt.registerTask( 'lint', [ 'jshint', 'jscs', 'jsonlint', 'stylelint', 'banana' ] );
	grunt.registerTask( 'test', 'lint' );
	grunt.registerTask( 'default', 'test' );
};
