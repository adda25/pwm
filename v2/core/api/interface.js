'use strict'

let Class = require('../index').Model.Class

/**
*	TODO:
*	- resource validation, against schema and against dependencies
*	- dependencies binds
*
*	- GE (run, drain etc)
*	- Defined Response text
*/

module.exports.apply = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
		let resource = new ResourceKindClass(translatedArgs)
		let exist = await resource.$exist()
		if (exist == true) {
			let validate = resource.$validate(resource.$check())
			if (validate.err !== null) { 
				cb(null, 'Resource ' + translatedArgs.name + ' not updated, failed test: \n !-> ' + validate.data.join('\n !-> '))
				return		
			}
			let validateDependecies = await resource.$checkDependencies()
			if (validateDependecies.err !== null) { 
				cb(null, 'Resource ' + translatedArgs.name + ' not updated, failed dependencies test')
				return		
			}
			resource.properties().desired = 'run'
			let resultDes = await resource.updateDesired()
			let result = await resource.updateResource()
			if (result.err == null) {
				cb(null, 'Resource ' + translatedArgs.kind + ' ' + translatedArgs.name + ' updated')		
			} else {
				cb(null, err)		
			}
			return
		} else {
			let validate = resource.$validate(resource.$check())
			if (validate.err !== null) { 
				cb(null, 'Resource ' + translatedArgs.name + ' not created, failed test: \n !-> ' + validate.data.join('\n !-> '))
				return		
			}
			let validateDependecies = await resource.$checkDependencies()
			if (validateDependecies.err !== null) { 
				cb(null, 'Resource ' + translatedArgs.name + ' not created, failed dependencies test')
				return		
			}
	
			let result = await resource.apply()
			cb(result.err, 'Resource ' + translatedArgs.name + ' created')
		}
	} catch (err) {
		cb(true, err)
	}
}

module.exports.delete = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
		let resource = new ResourceKindClass(translatedArgs)
		let exist = await resource.$exist()
		if (exist == true) {
			resource.properties().desired = "drain"
			let resultDes = await resource.updateDesired()
			if (resultDes.err == null) {
				cb(null, 'Resource ' + translatedArgs.name + ' drained')		
			} else {
				cb(null, err)		
			}
			return
		} else {
			let result = await resource.apply()
			cb(result.err, 'Resource not exist')
		}
	} catch (err) {
		cb(true, err)
	}
}

module.exports.get = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
		let partition = ResourceKindClass._PartitionKeyFromArgs(translatedArgs)
		// console.log(translatedArgs, partition)
		let result = await ResourceKindClass.Get(partition, true)
		// console.log(result)
		cb(result.err, result.data)
	} catch (err) {
		cb(true, err)
	}
}	

module.exports.describe = async (apiVersion, args, cb) => {
	try {
		let ResourceKindClass = Class[args.kind]
		if (ResourceKindClass == undefined) {
			cb(true, 'Kind ' + args.kind + ' not exist')
			return
		}
		let translatedArgs = ResourceKindClass.$Translate(apiVersion, args)
		let partition = ResourceKindClass._PartitionKeyFromArgs(translatedArgs)
		let result = await ResourceKindClass.Get(partition)
		cb(result.err, result.data)
	} catch (err) {
		cb(true, err)
	}
}
