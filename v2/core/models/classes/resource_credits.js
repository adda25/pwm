'use strict'

let BaseResource = require('./base')

class Resourcecredit extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Resourcecredit
	static IsZoned = true

	static _PartitionKeyFromArgs (args) {
		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _PartitionKeyFromArgsForRead (args) {

		let pargs = {}
		pargs.kind = args.kind || this.Kind.toLowerCase()
		pargs.zone = args.zone || (process.env.ZONE || 'dora-dev')
		if (args.name !== undefined) {
			pargs.name = args.name
		}
		return pargs
	}

	static _FormatOne (data) {
		return {
			kind: data.kind,
			zone: data.zone,
			name: data.name,
			'credits/hour': data.resource.credit.per.hour,
		}
	}

	static async _FormatOne (data) {
		return {
			kind: data.kind,
			zone: data.zone,
			name: data.name,
			'credits/hour': data.resource.credit.per.hour,

		}
	}
}

module.exports = Resourcecredit