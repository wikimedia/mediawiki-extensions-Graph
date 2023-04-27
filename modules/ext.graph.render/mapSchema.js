const autosize = {
	type: 'fit',
	resize: false,
	contains: 'padding'
};
const sanitizeUrl = require( './sanitizeUrl.js' );

// Generate unique data names with our reserved prefix
const newDataName = ( dataSets ) => {
	// Store the last index tried in a custom property of the array
	if ( dataSets.lastIndex === undefined ) {
		dataSets.lastIndex = 0;
	}
	while ( true ) {
		// Generate a candidate name.
		const uniqName = 'data_' + ( dataSets.lastIndex++ );
		// Ensure it is not already used.
		if ( dataSets.every( ( data ) => data.name !== uniqName ) ) {
			return uniqName;
		}
	}
};

/**
 * @param {Object} dataFormat
 * @return {Object}
 */
const dataFormatToVega5 = ( dataFormat ) => {
	if ( dataFormat.parse ) {
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
	} else {
		return dataFormat;
	}
};

/**
 * @param {Object} dataTransform
 * @return {Object}
 */
const dataTransformSortbyToVega5 = ( dataTransform ) => {
	if ( dataTransform.sortby ) {
		const sortby = Array.isArray( dataTransform.sortby ) ?
			dataTransform.sortby : [ dataTransform.sortby ];
		const field = sortby.map( ( f ) => {
			return f.startsWith( '-' ) ? f.slice( 1 ) : f;
		} );
		const order = sortby.map( ( f ) => {
			return f.startsWith( '-' ) ? 'descending' : 'ascending';
		} );
		dataTransform = Object.assign( {
			sort: { field, order }
		}, dataTransform );
		delete dataTransform.sortby;
	}
	return dataTransform;
};

/**
 * @param {Object} dataTransform
 * @return {Object}
 */
const dataTransformToVega5 = ( dataTransform ) => {
	if ( Array.isArray( dataTransform ) ) {
		return dataTransform.map( dataTransformToVega5 );
	}
	switch ( dataTransform.type ) {
		case 'aggregate':
			if ( dataTransform.summarize ) {
				const fields = Object.keys( dataTransform.summarize );
				const ops = fields.map( ( f ) => dataTransform.summarize[ f ] );
				const as = fields.map( ( _, idx ) => ops[ idx ] + '_' + fields[ idx ] );
				dataTransform = Object.assign( {}, dataTransform, {
					fields, ops, as
				} );
				delete dataTransform.summarize;
			}
			break;
		case 'stack':
			dataTransform = Object.assign( {}, dataTransform, {
			// "layout_mid" not yet supported
				as: [ 'layout_start', 'layout_end' ]
			} );
			dataTransform = dataTransformSortbyToVega5( dataTransform );
			break;
		default:
			throw new Error( 'Graph transform ' + dataTransform.type + ' not yet supported.' );
	}
	return dataTransform;
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
				case 'transform':
					newData[ key ] = dataTransformToVega5( val );
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
 * @param {Object} markFrom
 * @param {Array} dataSets
 * @return {Object}
 */
const markFromToVega5 = ( markFrom, dataSets ) => {
	markFrom = Object.assign( {}, markFrom );
	if ( markFrom.transform ) {
		const newFrom = {
			data: newDataName( dataSets )
		};
		dataSets.push( dataToVega5( {
			name: newFrom.data,
			source: markFrom.data,
			transform: markFrom.transform
		} ) );
		return newFrom;
	}
	return markFrom;
};

/**
 * @param {Array} marks
 * @param {Array} dataSets
 * @throws {Error} if unsupported format
 * @return {Array}
 */
const markToVega5 = ( marks, dataSets ) => {
	return marks.map( ( mark ) => {
		mark = Object.assign( {}, mark );
		if ( mark.properties !== undefined ) {
			mark.encode = Object.assign( {}, mark.properties );
			delete mark.properties;
		}
		// Recursively convert marks if necessary.
		if ( Array.isArray( mark.marks ) ) {
			mark.marks = markToVega5( mark.marks, dataSets );
		}
		// Mark groups with facet transforms get handled specially.
		if (
			mark.type === 'group' &&
			mark.from &&
			Array.isArray( mark.from.transform ) &&
			mark.from.transform.length >= 1 &&
			mark.from.transform[ mark.from.transform.length - 1 ].type === 'facet'
		) {
			// Remove the facet transform from the end of the transform list
			const newTransform = mark.from.transform.slice();
			const oldFacet = newTransform.pop();
			// Make a new from clause with the shorter transform list
			const oldFrom = mark.from;
			const newFrom = newTransform.length > 0 ?
				// Call markFromToVega5 to hoist any transforms in newFrom
				markFromToVega5( Object.assign( {}, oldFrom, {
					transform: newTransform
				} ), dataSets ) : oldFrom;
			// Create a new unique name for this facet
			const dataName = newDataName( dataSets );
			mark.from = {
				facet: {
					name: dataName,
					data: newFrom.data,
					groupby: oldFacet.groupby
				}
			};
			// All of the child marks now refer to this new data name
			mark.marks.forEach( ( m ) => {
				m.from = m.from || { data: dataName };
			} );
		} else if ( mark.from ) {
			mark.from = markFromToVega5( mark.from, dataSets );
		}
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
	const dataSets = (
		Array.isArray( spec.data ) ? spec.data : ( spec.data ? [ spec.data ] : [] )
	).map( dataToVega5 );

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
				newSpec[ key ] = markToVega5( val, dataSets );
				break;
			// Do not copy these ones
			case 'data':
				break; // Already handled above.
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
		}, newSpec, {
			data: dataSets
		} )
	);
};

module.exports = mapSchema;
