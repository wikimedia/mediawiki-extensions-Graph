<?php
namespace Graph\Tests\Unit;

use Graph\ParserTag;
use MediaWiki\Parser\Parser;
use MediaWiki\Parser\ParserOutput;
use ParserOptions;

/**
 * Class ParserTagTestt
 * @package Graph\Tests\Unit
 * @coversDefaultClass \Graph\ParserTag
 * @group Graph
 * @group Extensions
 */
class ParserTagTest extends \MediaWikiUnitTestCase {
	private function mockParserOutput() {
		$mockParserOutput = $this->getMockBuilder( ParserOutput::class )
			->disableOriginalConstructor()
			->onlyMethods( [ 'setExtensionData', 'getExtensionData' ] )
			->getMock();

		$parameters = [];
		$mockParserOutput->expects( $this->any() )->method( 'setExtensionData' )
			->willReturnCallback( static function ( $key, $value ) use ( &$parameters ) {
				$parameters[$key] = $value;
			} );
		$mockParserOutput->expects( $this->any() )->method( 'getExtensionData' )
			->willReturnCallback( static function ( $key ) use ( &$parameters ) {
				return $parameters[$key] ?? null;
			} );
		return $mockParserOutput;
	}

	private function mockParserOptions() {
		return $this->getMockBuilder( ParserOptions::class )
			->disableOriginalConstructor()
			->getMock();
	}

	private function mockParser() {
		return $this->getMockBuilder( Parser::class )
			->disableOriginalConstructor()
			->getMock();
	}

	/**
	 * @covers ::buildHtml
	 */
	public function testBuildHtmlLogsObsoleteGraphs() {
		$mockParser = $this->mockParser();
		$mockParserOptions = $this->mockParserOptions();
		$mockParserOutput = $this->mockParserOutput();
		$parser = new ParserTag( $mockParser, $mockParserOptions, $mockParserOutput );
		$json = '{ "version": 2 }';
		$str = $parser->buildHtml( $json, 1 );
		$this->assertTrue( $mockParserOutput->getExtensionData( 'graph_vega2' ) );
		$this->assertTrue( $mockParserOutput->getExtensionData( 'graph_specs_obsolete' ) );
	}

	/**
	 * @covers ::buildHtml
	 */
	public function testBuildHtmlValidGraph() {
		$mockParser = $this->mockParser();
		$mockParserOptions = $this->mockParserOptions();
		$mockParserOutput = $this->mockParserOutput();

		$parser = new ParserTag( $mockParser, $mockParserOptions, $mockParserOutput );
		$json = '{ "version": 5 }';
		$str = $parser->buildHtml( $json, 1 );
		$this->assertTrue( $mockParserOutput->getExtensionData( 'graph_vega5' ) );

		// create new parser with cleared parser output
		$mockParserOutput = $this->mockParserOutput();
		$parser = new ParserTag( $mockParser, $mockParserOptions, $mockParserOutput );
		$json = '{ "$schema": "https://vega.github.io/schema/vega/v5.json" }';
		$str = $parser->buildHtml( $json, 1 );
		$this->assertTrue( $mockParserOutput->getExtensionData( 'graph_vega5' ) );
	}
}
