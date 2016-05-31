import Node from '../Node.js';

const IS_DATA_ATTRIBUTE = /-/;

export default class JSXAttribute extends Node {
	transpile ( code, transforms ) {
		code.overwrite( this.name.end, this.value.start, ': ' );

		if ( IS_DATA_ATTRIBUTE.test( this.name.name ) ) {
			code.overwrite( this.name.start, this.name.end, `'${this.name.name}'` );
		}

		super.transpile( code, transforms );
	}
}
