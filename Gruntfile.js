/*!
 * Grunt file
 *
 * @package Graph
 */

'use strict';

module.exports = function ( grunt ) {
	const conf = grunt.file.readJSON( 'extension.json' );

	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-eslint' );
	grunt.loadNpmTasks( 'grunt-stylelint' );

	grunt.initConfig( {
		eslint: {
			options: {
				cache: true,
				fix: grunt.option( 'fix' )
			},
			all: [
				'**/*.{js,json}',
				'!lib/**',
				'!{node_modules,vendor}/**'
			]
		},
		stylelint: {
			options: {
				cache: true
			},
			all: [
				'**/*.{css,less}',
				'!lib/**',
				'!{node_modules,vendor}/**'
			]
		},
		banana: conf.MessagesDirs
	} );

	grunt.registerTask( 'lint', [ 'eslint', 'banana', 'stylelint' ] );
	grunt.registerTask( 'test', 'lint' );
	grunt.registerTask( 'default', 'test' );
};
