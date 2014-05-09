<?php
/**
 * JSON Schema Content Handler
 *
 * @file
 * @ingroup Extensions
 * @ingroup EventLogging
 *
 * @author Ori Livneh <ori@wikimedia.org>
 */

class VizJSONContentHandler extends TextContentHandler {

	public function __construct( $modelId = 'VizJSON' ) {
		parent::__construct( $modelId, array( CONTENT_FORMAT_JSON ) );
	}

	/**
	 * Unserializes a VizJSONContent object.
	 *
	 * @param string $text Serialized form of the content
	 * @param null|string $format The format used for serialization
	 *
	 * @return Content the VizJSONContent object wrapping $text
	 */
	public function unserializeContent( $text, $format = null ) {
		$this->checkFormat( $format );
		return new VizJSONContent( $text );
	}

	/**
	 * Creates an empty VizJSONContent object.
	 *
	 * @return Content
	 */
	public function makeEmptyContent() {
		return new VizJSONContent( '' );
	}

	/** JSON Schema is English **/
	public function getPageLanguage( Title $title, Content $content = null ) {
		return wfGetLangObj( 'en' );
	}

	/** JSON Schema is English **/
	public function getPageViewLanguage( Title $title, Content $content = null ) {
		return wfGetLangObj( 'en' );
	}
}
