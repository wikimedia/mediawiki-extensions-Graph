// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
	// Automatically clear mock calls and instances between every test
	clearMocks: true,

	// Indicates whether the coverage information should be collected while executing the test
	collectCoverage: true,

	// An array of glob patterns indicating a set of files fo
	//  which coverage information should be collected
	collectCoverageFrom: [
		'modules/**/*.(js)'
	],

	// The directory where Jest should output its coverage files
	coverageDirectory: 'coverage',

	// An array of regexp pattern strings used to skip coverage collection
	coveragePathIgnorePatterns: [
		// Covered by QUnit.
		'modules/ve-graph/*',
		'/node_modules/'
	],

	// An object that configures minimum threshold enforcement for coverage results
	coverageThreshold: {
		global: {
			branches: 25,
			functions: 25,
			lines: 25,
			statements: 25
		}
	},

	// An array of file extensions your modules use
	moduleFileExtensions: [
		'js'
	],

	testEnvironment: 'jsdom'
};
