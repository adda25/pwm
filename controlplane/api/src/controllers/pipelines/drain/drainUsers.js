'use strict'

const GE = require('../../../events/global')
let Pipe = require('piperunner').Pipeline

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let pipe = scheduler.pipeline('drainUsers')
let request = require('../../fn/request')

/**
*	In future we will also delete data on physical nodes
*/
pipe.step('drainUsers', async function (pipe, data) {
	let users = data.users
	for (var userIndex = 0; userIndex < users.length; userIndex += 1) {
		await users[userIndex].delete()
	}
	pipe.end()
})

module.exports = scheduler 