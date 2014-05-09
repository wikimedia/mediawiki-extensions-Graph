<?php
/**
 * JSON Schema Content Model
 *
 * @file
 * @ingroup Extensions
 * @ingroup EventLogging
 *
 * @author Ori Livneh <ori@wikimedia.org>
 */


/**
 * Represents the content of a JSON Schema article.
 */
class VizJSONContent extends TextContent {

	const DEFAULT_RECURSION_LIMIT = 3;

	function __construct( $text ) {
		parent::__construct( $text, 'VizJSON' );
	}

	/**
	 * Resolve a JSON reference to a schema.
	 * @param string $ref Schema reference with format 'Title/Revision'.
	 */
	static function resolve( $ref ) {
		list( $title, $revId ) = explode( '/', $ref );
		$rs = new RemoteSchema( $title, $revId );
		return $rs->get();
	}

	/**
	 * Recursively resolve references in a schema.
	 * @param array $schema Schema object to expand.
	 * @param int $recursionLimit Maximum recursion limit.
	 * @return array: Expanded schema object.
	 */
	static function expand( $schema, $recursionLimit = VizJSONContent::DEFAULT_RECURSION_LIMIT ) {
		return array_map( function ( $value ) {
			if ( is_array( $value ) && $recursionLimit > 0 ) {
				if ( isset( $value['$ref'] ) ) {
					$value = VizJSONContent::resolve( $value['$ref'] );
				}
				return VizJSONContent::expand( $value, $recursionLimit - 1 );
			} else {
				return $value;
			}
		}, $schema );
	}

	/**
	 * Decodes the JSON schema into a PHP associative array.
	 * @return array: Schema array.
	 */
	function getJsonData() {
		return FormatJson::decode( $this->getNativeData(), true );
	}

	/**
	 * @throws VizJSONException: If invalid.
	 * @return bool: True if valid.
	 */
	function validate() {
		$schema = $this->getJsonData();
		if ( !is_array( $schema ) ) {
			throw new VizJSONException( wfMessage( 'eventlogging-invalid-json' )->parse() );
		}
		return $schema;
	}

	/**
	 * @return bool: Whether content is valid JSON Schema.
	 */
	function isValid() {
		try {
			return $this->validate();
		} catch ( VizJSONException $e ) {
			return false;
		}
	}

	/**
	 * Beautifies JSON prior to save.
	 * @param Title $title Title
	 * @param User $user User
	 * @param ParserOptions $popts
	 * @return VizJSONContent
	 */
	function preSaveTransform( Title $title, User $user, ParserOptions $popts ) {
		return new VizJSONContent( efMapBeautifyJson( $this->getNativeData() ) );
	}

	/**
	 * Constructs an HTML representation of a JSON object.
	 * @param Array $mapping
	 * @return string: HTML.
	 */
	static function objectTable( $mapping ) {
		$rows = array();

		foreach ( $mapping as $key => $val ) {
			$rows[] = self::objectRow( $key, $val );
		}
		return Xml::tags( 'table', array( 'class' => 'mw-json-schema' ),
			Xml::tags( 'tbody', array(), join( "\n", $rows ) )
		);
	}

	/**
	 * Constructs HTML representation of a single key-value pair.
	 * @param string $key
	 * @param mixed $val
	 * @return string: HTML.
	 */
	static function objectRow( $key, $val ) {
		$th = Xml::elementClean( 'th', array(), $key );
		if ( is_array( $val ) ) {
			$td = Xml::tags( 'td', array(), self::objectTable( $val ) );
		} elseif ( $key === '$ref' ) {
			list( , $revId ) = explode( '/', $val );
			$title = Revision::newFromId( $revId )->getTitle();
			$link = Linker::link( $title, htmlspecialchars( $val ), array(),
				array( 'oldid' => $revId ) );
			$td = Xml::tags( 'td', array( 'class' => 'value' ), $link );
		} else {
			if ( is_string( $val ) ) {
				$val = '"' . $val . '"';
			} else {
				$val = FormatJson::encode( $val );
			}

			$td = Xml::elementClean( 'td', array( 'class' => 'value' ), $val );
		}

		return Xml::tags( 'tr', array(), $th . $td );
	}

	/**
	 * Generate generic PHP and JavaScript code strings showing how to
	 * use a schema.
	 * @param string $dbKey DB key of schema article
	 * @param int $revId Revision ID of schema article
	 * @return array: Nested array with each sub-array having a language, header
	 *  (message key), and code
	 */
	public function getCodeSamples( $dbKey, $revId ) {
		return array(
			array(
				'language' => 'php',
				'header' => 'eventlogging-code-sample-logging-on-server-side',
				'code' => "EventLogging::logEvent( '$dbKey', $revId, \$event );",
			),
			array(
				'language' => 'php',
				'header' => 'eventlogging-code-sample-module-setup',
				'code' => "\$wgEventLoggingSchemas[ '{$dbKey}' ] = {$revId};",
			),
			array(
				'language' => 'javascript',
				'header' => 'eventlogging-code-sample-logging-on-client-side',
				'code' => "mw.eventLog.logEvent( '{$dbKey}', { /* ... */ } );",
			),
		);
	}

	/**
	 * Wraps HTML representation of content.
	 *
	 * If the schema already exists and if the SyntaxHiglight GeSHi
	 * extension is installed, use it to render code snippets
	 * showing how to use schema.
	 *
	 * @see https://mediawiki.org/wiki/Extension:SyntaxHighlight_GeSHi
	 *
	 * @param Title $title
	 * @param int|null $revId Revision ID
	 * @param ParserOptions|null $options
	 * @param boolean $generateHtml Whether or not to generate HTML
	 * @return ParserOutput
	 */
	public function getParserOutput( Title $title, $revId = null,
		ParserOptions $options = null, $generateHtml = true ) {
		$out = parent::getParserOutput( $title, $revId, $options, $generateHtml );

		if ( $revId !== null && class_exists( 'SyntaxHighlight_GeSHi' ) ) {
			$html = '';
			$highlighter = new SyntaxHighlight_GeSHi();
			foreach( self::getCodeSamples( $title->getDBkey(), $revId ) as $sample ) {
				$lang = $sample['language'];
				$code = $sample['code'];
				$geshi = $highlighter->prepare( $code, $lang );
				$out->addHeadItem( $highlighter::buildHeadItem( $geshi ), "source-$lang" );
				$html .= Html::element( 'h2',
					array(),
					wfMessage( $sample['header'] )->text()
				) . $geshi->parse_code();
			}
			// The glyph is '< >' from the icon font 'Entypo' (see ../modules).
			$html = Xml::tags( 'div', array( 'class' => 'mw-json-schema-code-glyph' ), '&#xe714;' ) .
				Xml::tags( 'div', array( 'class' => 'mw-json-schema-code-samples' ), $html );
			$out->setText( $html . $out->mText );
		}

		return $out;
	}

	/**
	 * Generates HTML representation of content.
	 * @return string: HTML representation.
	 */
	function getHighlightHtml() {
		$schema = $this->getJsonData();
		return is_array( $schema ) ? self::objectTable( $schema ) : '';
	}
}
