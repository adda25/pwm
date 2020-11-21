'use strict'

let _ = require('lodash')
const GE = require('./events/global')
let jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const { Schema } = mongoose
let db = require('./models/mongo')

let logger = require('./logs/log')

logger.pwmapi.info('SYSSTART')

db.init({
	host: process.env.mongohost || 'localhost',  
	port: process.env.mongoport || 27017,  
	database: process.env.mongodb || 'pwm-01',  
}, (r) => {})

let model = require('./models/models')

/**
*	API routes that, given a valid token,
*	doesn't require access control
*/
let AlwaysAllowedRoutes =  {
	api: ['compatibility', 'version'],
	user: ['defaultgroup'],
	batch: ['apply', 'cancel', 'delete']
} 

function smartCompare (nn, o) {
	let n = JSON.parse(JSON.stringify(nn))
	delete n['_id']
	delete n['__v']
	delete o['__v']
	delete o['_id']
	return _.isEqual(n, o)
}

function isValidToken (req, token) {
	try {
		let decoded = jwt.verify(token, process.env.secret)
		req.session.user = decoded.data.user
		req.session.userGroup = decoded.data.userGroup
		req.session.defaultGroup = decoded.data.defaultGroup
		return true
	} catch (err) {
		return false
	}
}

function userDefaultGroup (req) {
	return req.session.defaultGroup
}

module.exports.apply = async function (args, cb)  {
	if (model[args.kind] == undefined) {
		cb(true, 'Resource kind', args.kind, 'not exist')
		return
	}
	let resource = new model[args.kind](args)
	let res = await resource.model().findOne({metadata: args.metadata}).lean(true)
	if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object)) {
		resource.validate()
		if (resource._valid.global == false) {
			cb(false, `Resource ${args.kind}/${args.metadata.name} not created, not valid`)		
		} else {
			cb(false, `Resource ${args.kind}/${args.metadata.name} created`)
			await resource.create(resource[args.kind])
		}
	} else if (!smartCompare(args, res, 'spec')) {
		if (res.locked == true) {
			cb(false, `Resource ${args.kind}/${args.metadata.name} locked`)
			return		
		}
		let m = new model[args.kind](args)
		m.validate()
		if (m._valid.global == false) {
			cb(false, `Resource ${args.kind}/${args.metadata.name} not configured, not valid`)		
		} else {
			cb(false, `Resource ${args.kind}/${args.metadata.name} configured`)	
			m._p = args
			await m.update()
		}
	} else {
		cb(false, `Resource ${args.kind}/${args.metadata.name} not changed`)	
	}
}

module.exports.get = async function (args, cb) {
	let resource = new model[args.kind](args)
	let res = await resource.find(args)
	cb(false, res)
}

module.exports.describe = async function (args, cb)  {
	let resource = new model[args.kind](args)
	let res = await resource.describeOne(args)
	cb(false, res)
}

module.exports.getOne = async function (args, cb)  {
	let resource = new model[args.kind](args)
	let res = await resource.getOne(args)
	cb(false, res)
}

/**
*	Insert the Bind Loop
*/
module.exports.OLDdelete = async function (args, cb)  {
	let resource = new model[args.kind]()
	let res = await resource.findOneAsResource(args, model[args.kind]) 
	if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object) || res._p == null) {
		cb(false, `Resource ${args.kind}/${args.metadata.name} not present`)	
	} else {
		if (res._p.locked == undefined || res._p.locked == false) {
			cb(false, `Resource ${args.kind}/${args.metadata.name} deleted`)
			await res.delete()
		} else {
			if (args.force || res.canCancelIfLocked()) {
				cb(false, `Resource ${args.kind}/${args.metadata.name} deleted`)
				await res.delete()
			} else {
				cb(false, `Resource ${args.kind}/${args.metadata.name} locked`)	
			}
		}
	}
}

module.exports.OLDcancel = async function (args, cb)  {
	if (cb == null) {
		cb = () => {}
	}
	let resource, res = null
	switch (args.kind) {
		case 'Workload':
			resource = new model[args.kind]()
			res = await resource.findOneAsResource(args, model[args.kind]) 
			if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object) || res._p == null) {
				cb(false, `Resource ${args.kind}/${args.metadata.name} not present`)	
			} else {
				res.cancel()
				await res.update()
				cb(false, `Resource ${args.kind}/${args.metadata.name} request cancel accepted`)
			}
			break

		default:
			cb(false, `Cancel action for resource ${args.kind}/${args.metadata.name} is not implemented`)
	}
}

module.exports.delete = async function (args, cb)  {
	let resource = new model[args.kind]()
	let res = await resource.findOneAsResource(args, model[args.kind]) 
	if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object) || res._p == null) {
		cb(false, `Resource ${args.kind}/${args.metadata.name} not present`)	
	} else {
		if (args.kind == 'Bind') {
			await res.delete()
			cb(false, `Resource ${args.kind}/${args.metadata.name} deleted`)
			return
		}
		await res.drain(model['Bind'])
		await res.update()
		cb(false, `Resource ${args.kind}/${args.metadata.name} deleted`)
	}
}

module.exports.cancel = async function (args, cb)  {
	let resource = new model[args.kind]()
	let res = await resource.findOneAsResource(args, model[args.kind]) 
	if ( (res === undefined || res == null) || (Object.keys(res).length === 0 && res.constructor === Object) || res._p == null) {
		cb(false, `Resource ${args.kind}/${args.metadata.name} not present`)	
	} else {
		if (args.kind == 'Bind') {
			await res.delete()
			cb(false, `Resource ${args.kind}/${args.metadata.name} deleted`)
			return
		}
		await res.drain(model['Bind'])
		await res.update()
		cb(false, `Resource ${args.kind}/${args.metadata.name} deleted`)
	}
}

module.exports._get = async function (args, cb) {
	let resource = new model[args.kind](args)
	let res = await resource.model().find().lean()	
	cb(false, res)
}

module.exports._getOne = async function (args, cb) {
	let resource = new model[args.kind](args)
	let res = await resource.model().findOne(args).lean()	
	cb(false, res)
}

module.exports._getOneModel = async function (args, cb) {
	let resource = new model[args.kind](args)
	let _model = await resource.model().findOne({metadata: args.metadata}).lean(true)
	cb(false, new model[args.kind](_model))
}

module.exports.passRoute = function (req, res, next, securityCallback) {
	if (!isValidToken(req, req.token)) {
		securityCallback(req)
		logger.pwmapi.error('401', GE.LOG.AUTH.NOT_VALID_TOKEN, null, GE.ipFromReq(req))
		console.log('401', req.url)
		res.sendStatus(401)
		return
	}
	let {apiVersion, group, resourceKind, operation} = req.params 
	const user = req.session.user 
	const userGroup = req.session.userGroup 
	let data = req.body.data
	if (group == '-') {
		group = user
		req.url = req.url.replace('-', userDefaultGroup(req))
	}
	let getOneUser = self._getOneModel({
		apiVersion: apiVersion,
		kind: 'User',
		metadata: {
			name: user,
			group: userGroup
		}
	}, (err, User) => {
		
		if (err == true) {
			logger.pwmapi.error('401', GE.LOG.AUTH.USER_NOT_EXIST, null, GE.ipFromReq(req))
			res.sendStatus(401)
			return
		}
		if (User._p == null) {
			logger.pwmapi.warn('401', GE.LOG.AUTH.EMPTY_USER, null, GE.ipFromReq(req))
			res.sendStatus(401)
			return
		}

		if (!User.hasGroup(group)) {
			logger.pwmapi.warn('401', GE.LOG.AUTH.NOT_OWN_GROUP, User._p.metadata.name, group, GE.ipFromReq(req))
			res.sendStatus(401)
			return	
		}
		let userProperties = User._p
		if (userProperties.active !== true) {
			logger.pwmapi.warn('401', GE.LOG.AUTH.USER_NOT_ACTIVE, userProperties.metadata.name, GE.ipFromReq(req))
			res.sendStatus(401)
			return	
		}

		// Verify route match
		let policy = User.policyForGroup(group) 
		if (AlwaysAllowedRoutes[resourceKind] == undefined || !AlwaysAllowedRoutes[resourceKind].includes(operation)) {
			if (policy !== GE.LABEL.PWM_ALL && (policy[resourceKind] == undefined || !policy[resourceKind].includes(operation))) {
				logger.pwmapi.warn('401', GE.LOG.AUTH.POLICY_CHECK_FAIL, userProperties.metadata.name, resourceKind, operation, GE.ipFromReq(req))
				res.sendStatus(401)
				return	
			}
		}

		// Set resource group if not specify in the resource
		// and if the result is by definition group related
		if (group !== GE.LABEL.PWM_ALL && data !== undefined) {
			if (resourceKind == 'batch') {
				data.forEach((singleData) => {
					if (model[singleData.kind] !== undefined && (new model[singleData.kind]().isGroupRelated())) {
						if (data.metadata == undefined) {
							data.metadata = {} 
						}
						if (singleData.metadata.group == undefined) {
							singleData.metadata.group = group
						}
					}
				})
			} else {
				if (model[data.kind] !== undefined && (new model[data.kind]().isGroupRelated()) ) {
					if (data.metadata == undefined) {
						data.metadata = {} 
					}
					if (data.metadata.group == undefined) {
						data.metadata.group = group
					}
				}
			}
		}
		// Verify body content
		if (group !== GE.LABEL.PWM_ALL && data !== undefined && Object.keys(model).includes(resourceKind)) {
			if (resourceKind == 'batch') {
				let authForResources = true
				let groups = userProperties.spec.groups.map((group) => {
					return group.name
				})
				data.some((singleResource) => {
					if (groups.includes(singleResource.metadata.group)) {
						let policyForGroup = User.policyForGroup(singleResource.metadata.group)
						if (policyForGroup[resourceKind] == undefined || !policyForGroup[resourceKind].includes(operation)) {
							authForResources = false
							return true
						}
					} else {
						authForResources = false
						return true
					}
				})
				if (authForResources == false) {
					logger.pwmapi.warn('401', GE.LOG.AUTH.NOT_AUTH_RESOURCE, userProperties.metadata.name, resourceKind, operation, GE.ipFromReq(req))
					res.sendStatus(401)
					return	
				}
			} else {
				let groups = userProperties.spec.groups.map((group) => {
					return group.name
				})
				if (groups.includes(data.metadata.group)) {
					let policyForGroup = User.policyForGroup(data.metadata.group)
					if (policyForGroup[resourceKind] == undefined || !policyForGroup[resourceKind].includes(operation)) {
						logger.pwmapi.warn('401', GE.LOG.AUTH.NOT_AUTH_RESOURCE, userProperties.metadata.name, resourceKind, operation, GE.ipFromReq(req))
						res.sendStatus(401)
						return	
					}
				} else {
					logger.pwmapi.warn('401', GE.LOG.AUTH.NOT_AUTH_RESOURCE, userProperties.metadata.name, resourceKind, operation, GE.ipFromReq(req))
					res.sendStatus(401)
					return	
				}
			}
		}
		req.session._userDoc = User 
		next()
	})
}

module.exports.userDefaultGroup = userDefaultGroup

var self = module.exports