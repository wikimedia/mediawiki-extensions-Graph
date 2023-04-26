const autosize = {
	type: 'fit',
	resize: false,
	contains: 'padding'
};
const sanitizeUrl = require( './sanitizeUrl.js' );

/**
 * @param {Object} dataFormat
 * @return {Object}
 */
const dataFormatToVega5 = ( dataFormat ) => {
	const parse = {};
	Object.keys( dataFormat.parse ).forEach( ( key ) => {
		const val = dataFormat.parse[ key ];
		if ( val === 'integer' ) {
			parse[ key ] = 'number';
		} else {
			parse[ key ] = val;
		}
	} );
	return Object.assign( {}, dataFormat, { parse } );
};

/**
 * @param {Object|Array} data
 * @return {Object|Array}
 */
const dataToVega5 = ( data ) => {
	if ( Array.isArray( data ) ) {
		return data.map( dataToVega5 );
	} else {
		const newData = {};
		Object.keys( data ).forEach( ( key ) => {
			const val = data[ key ];
			switch ( key ) {
				case 'format':
					newData[ key ] = dataFormatToVega5( val );
					break;
				default:
					newData[ key ] = val;
					break;
			}
		} );
		return newData;
	}
};

/**
 * @param {Object} props
 * @return {Object}
 */
const propertiesToVega5 = ( props ) => {
	const encode = {};
	Object.keys( props ).forEach( ( key ) => {
		const val = props[ key ];
		encode[ key ] = {
			update: Object.assign( {}, val )
		};
	} );
	return { encode };
};

/**
 * @param {Array} axes
 * @return {Array}
 */
const axesToVega5 = ( axes ) => {
	return axes.map( ( axis ) => {
		const props = axis.properties || {};
		const newAxis = Object.assign(
			propertiesToVega5( props ),
			axis, {
				orient: axis.type === 'x' ? 'bottom' : 'left'
			}
		);
		delete newAxis.properties;
		delete newAxis.ticks;
		delete newAxis.type;
		return newAxis;
	} );
};

/**
 * @param {Array} scales
 * @return {Array}
 */
const scaleToVega5 = ( scales ) => {
	return scales.map( ( scale ) => {
		// https://vega.github.io/vega/docs/porting-guide/#scales
		scale = Object.assign( {}, scale );
		if ( scale.range === 'category10' || scale.range === 'category20' ) {
			const scheme = scale.range;
			scale.range = { scheme };
			return scale;
		}
		const domain = scale.domain;
		if ( domain && domain.field ) {
			const fields = [ domain.field ];
			scale.domain = Object.assign( {}, domain, {
				fields
			} );
			delete scale.domain.field;
		}
		const isSpatial = scale.range === 'width' || scale.range === 'height';
		const isPoint = scale.point;
		if ( scale.type === 'ordinal' ) {
			if ( isSpatial ) {
				scale.type = isPoint ? 'point' : 'band';
			}
		}

		delete scale.nice;
		delete scale.zero;
		delete scale.point;
		return scale;
	} );
};

/**
 * @param {Array} marks
 * @throws {Error} if unsupported format
 * @return {Array}
 */
const markToVega5 = ( marks ) => {
	return marks.map( ( mark ) => {
		mark = Object.assign( {}, mark );
		mark.encode = Object.assign( {}, mark.properties );
		delete mark.properties;
		return mark;
	} );
};

/**
 * @param {Object|Array} data
 * @throws {Error} if unsupported format
 * @return {Object|Array}
 */
const sanitizeData = ( data ) => {
	if ( Array.isArray( data ) ) {
		return data.map( sanitizeData );
	} else if ( data.url ) {
		data.url = sanitizeUrl( data.url );
	}
	return data;
};

/**
 * @param {Object} spec
 * @throws {Error} if unsupported format
 * @return {Object}
 */
const sanitize = ( spec ) => {
	if ( spec.data ) {
		return Object.assign( {}, spec, {
			data: sanitizeData( spec.data )
		} );
	}
	return Object.assign( {}, spec );
};

/**
 * Maps a vega2 graph spec to vega 5
 * using https://vega.github.io/vega/docs/porting-guide
 *
 * @param {Object} spec
 * @throws {Error} if the spec is not supported.
 * @return {Object}
 */
const mapSchema = ( spec ) => {
	// eslint-disable-next-line no-jquery/variable-pattern
	const schema = spec.$schema;
	// Check versioning.
	const isNewSchema = schema && schema.indexOf( 'v5.json' ) > -1;
	// No modifications for new schemas
	if ( isNewSchema ) {
		return sanitize( Object.assign( { autosize }, spec ) );
	}
	const newSpec = {};
	// Map versions < 5 to 5
	Object.keys( spec ).forEach( ( key ) => {
		const val = spec[ key ];
		switch ( key ) {
			case 'signals':
				throw new Error( 'Graph uses older schema where signals key are not currently supported.' );
			case 'axes':
				newSpec[ key ] = axesToVega5( val );
				break;
			case 'scales':
				newSpec[ key ] = scaleToVega5( val );
				break;
			case 'marks':
				newSpec[ key ] = markToVega5( val );
				break;
			case 'data':
				newSpec[ key ] = dataToVega5( val );
				break;
			// Do not copy these ones
			case 'version':
				if ( val === 1 ) {
					throw new Error( 'Unsupported schema ( T260542 )' );
				}
				break;
			// Any other field remains unchanged.
			default:
				newSpec[ key ] = val;
				break;
		}
	} );
	return sanitize(
		Object.assign( {
			$schema: 'https://vega.github.io/schema/vega/v5.json',
			// Make sure width and height defined if not.
			width: 500,
			height: 500,
			// Ensure we keep within the dimensions specified
			autosize
		}, newSpec )
	);
};

module.exports = mapSchema;
