const mapSchema = require( '../../../modules/ext.graph.lite/mapSchema.js' );
const $SCHEMA = 'https://vega.github.io/schema/vega/v5.json';
const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 500;

describe( 'mapSchema', () => {
	test( 'version 5 schemas do not get mapped', () => {
		const schema = {
			$schema: $SCHEMA
		};
		const newSchema = mapSchema( schema );
		expect( schema ).toStrictEqual( newSchema );
	} );

	test( 'refuse to render graphs using version 1 of spec', () => {
		const schema = {
			version: 1
		};
		expect( () => mapSchema( schema ) ).toThrowError();
	} );

	test( 'refuse to render old graphs using signals', () => {
		const schema = {
			version: 2,
			signals: {}
		};
		expect( () => mapSchema( schema ) ).toThrowError();
	} );

	test( 'schemas default to version 5 schema if not specified with width and height', () => {
		const schema = mapSchema( {} );
		expect( schema ).toStrictEqual( {
			$schema: $SCHEMA,
			width: DEFAULT_WIDTH,
			height: DEFAULT_HEIGHT
		} );
	} );

	test( '[data] integer types are mapped to number', () => {
		const schema = mapSchema( {
			data: {
				format: {
					parse: {
						x: 'integer',
						y: 'string'
					}
				}
			}
		} );
		expect( schema.data.format.parse ).toStrictEqual( {
			x: 'number',
			y: 'string'
		} );
	} );

	test( '[data] integer types are mapped to number in array type', () => {
		const schema = mapSchema( {
			data: [ {
				name: 'chart',
				format: {
					parse: {
						x: 'integer'
					}
				}
			} ]
		} );
		expect( schema.data[ 0 ].name ).toStrictEqual( 'chart' );
		expect( schema.data[ 0 ].format.parse ).toStrictEqual( {
			x: 'number'
		} );
	} );

	test( '[legends][width][height] no change', () => {
		const schema = mapSchema( {
			legends: [],
			height: 200,
			width: 200
		} );
		expect( schema ).toStrictEqual( {
			$schema: $SCHEMA,
			legends: [],
			height: 200,
			width: 200
		} );
	} );

	test( '[marks] properties are renamed', () => {
		const properties = {
			hover: {
				fill: {
					value: 'red'
				}
			}
		};
		const schema = mapSchema( { marks: [ { properties } ] } );
		expect( schema.marks[ 0 ].encode ).toStrictEqual( properties );
	} );

	test( '[scales] range is mapped to scheme', () => {
		const domain = {
			data: 'chart',
			field: 'series'
		};
		const name = 'color';
		const scales = [
			{
				domain,
				type: 'ordinal',
				name,
				range: 'category10'
			}
		];
		const schema = mapSchema( { scales } );
		expect( schema.scales[ 0 ] ).toStrictEqual( {
			type: 'ordinal',
			domain,
			name,
			range: {
				scheme: 'category10'
			}
		} );
	} );

	test( '[scales] use "band" for spatial ordinal scales', () => {
		const scales = [
			{
				type: 'ordinal',
				range: 'height'
			},
			{
				type: 'ordinal',
				range: 'width'
			}
		];
		const schema = mapSchema( { scales } );
		expect( schema.scales[ 0 ] ).toStrictEqual( {
			type: 'band',
			range: 'height'
		} );
		expect( schema.scales[ 1 ] ).toStrictEqual( {
			type: 'band',
			range: 'width'
		} );
	} );

	test( '[scales] use "point" instead of point', () => {
		const scales = [
			{
				type: 'ordinal',
				range: 'width',
				point: true
			}
		];
		const schema = mapSchema( { scales } );
		expect( schema.scales[ 0 ] ).toStrictEqual( {
			type: 'point',
			range: 'width'
		} );
	} );

	test( '[scales] use ordinal for strict lookup tables', () => {
		const scales = [
			{
				type: 'ordinal'
			}
		];
		const schema = mapSchema( { scales } );
		expect( schema.scales[ 0 ].type ).toStrictEqual( 'ordinal' );
	} );

	test( '[version] ignored field', () => {
		const schema = mapSchema( { version: '1' } );
		expect( schema.version ).toBe( undefined );
	} );

	test( '[axes] type is mapped to orient and properties to encode', () => {
		const title = {
			fill: {
				value: '#54595d'
			}
		};
		const grid = {
			stroke: {
				value: '#54595d'
			}
		};
		const ticks = {
			stroke: {
				value: '#54595d'
			}
		};
		const axis = {
			strokeWidth: {
				value: 2
			},
			stroke: {
				value: '#54595d'
			}
		};
		const labels = {
			fill: {
				value: '#54595d'
			}
		};
		const properties = {
			title, grid, ticks,
			axis, labels
		};
		const encode = {
			grid: {
				update: grid
			},
			title: {
				update: title
			},
			ticks: {
				update: ticks
			},
			axis: {
				update: axis
			},
			labels: {
				update: labels
			}
		};
		const schema = mapSchema( {
			axes: [
				{
					type: 'x',
					title: 'X',
					scale: 'x',
					format: 'd',
					properties,
					grid: false
				},
				{
					type: 'y',
					title: 'Y',
					scale: 'y',
					format: 'd',
					properties,
					grid: false
				}
			]
		} );
		expect( schema.axes[ 0 ] ).toStrictEqual( {
			orient: 'bottom',
			title: 'X',
			scale: 'x',
			format: 'd',
			grid: false,
			encode

		} );
		expect( schema.axes[ 1 ] ).toStrictEqual( {
			orient: 'left',
			title: 'Y',
			scale: 'y',
			format: 'd',
			grid: false,
			encode
		} );
	} );
} );
