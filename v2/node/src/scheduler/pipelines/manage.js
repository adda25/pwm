'use strict'

const { StaticPool } = require('node-worker-threads-pool')
let axios = require('axios')
let fs = require('fs')
let Docker = require('dockerode')
let DockerEvents = require('docker-events')
let shell = require ('shelljs')
let parseString = require ('xml2js').parseString

let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()
let Pipe = new Piperunner.Pipeline()
let pipeline = scheduler.pipeline('manage')

let DockerDriver = require('../../../../core/index').Driver.Docker
let DockerDb = require('../../../../core/index').Driver.DockerDb

let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)

if (!stats.isSocket()) {
  throw new Error('Docker is not running on this socket:', socket)
}

const MAX_STARTUP = 3

let docker = new Docker({socketPath: socket})

let dockerEmitter = new DockerEvents({
  docker: docker,
})

dockerEmitter.start()

dockerEmitter.on('start', async function (message) {
	let containerName = message.Actor.Attributes.name
	console.log(containerName, message)
	DockerDb.set(containerName, null, 'running', null)
	DockerDb.setId(containerName, message.id)
})

dockerEmitter.on('stop', async function (message) {
	let containerName = message.Actor.Attributes.name
	DockerDb.set(containerName, null, 'deleted', null)
})

dockerEmitter.on('die', async function (message) {
	let containerName = message.Actor.Attributes.name
	DockerDb.set(containerName, null, 'exited', null)
})

pipeline.step('fetch-status', async (pipe, job) => {
	if (job == undefined) {
		console.log('ENDING no job')
		pipe.next()
		return
	}
	try {
		let containerName = 'dora.' + job.workspace + '.' + job.name
		let container = job
		let desired = job.desired
		
		let containerDb = DockerDb.get(containerName) 
		if (containerDb == undefined) {
			// Check
			let c = await DockerDriver.get(containerName)
			if (c.err == null && c.data !== null && c.data !== undefined) {
				DockerDb.set(containerName, container, c.data.State.Status, c.err)
				DockerDb.setId(containerName, c.data.Id)
				if (desired == 'drain') {
					DockerDb.set(containerName, container, 'draining', null)
					DockerDb.setId(containerName, c.data.Id)
					await DockerDriver.drain(containerName)
				}
			} else {
				if (desired == 'run') {
					
					DockerDb.set(containerName, container, 'creating', null)
					let res = await DockerDriver.create(containerName, container)	
					if (res.err !== null) {
						console.log(res.err.toString())
						DockerDb.set(containerName, container, 'not_created', res.err.toString())
						DockerDb.incrementFailedCreationCount(containerName)
					}
				}
				if (desired == 'drain') {
					DockerDb.set(containerName, container, 'deleted', null)
				}
			}
		} else {
			if (desired == 'drain' && containerDb.status == 'deleted') {
				DockerDb.delete(containerName)
			} else if (desired == 'run' && containerDb.status != 'creating' && containerDb.status != 'running') {
				if (containerDb.failedStartup < MAX_STARTUP) {
					DockerDb.set(containerName, container, 'creating', null)
					let res = await DockerDriver.create(containerName, container)	
					if (res.err !== null) {
						console.log(res.err)
						DockerDb.set(containerName, container, 'not_created', res.err.toString())
						DockerDb.incrementFailedCreationCount(containerName)
					}
				} else if (containerDb.status !== 'failed') {
					DockerDb.set(containerName, container, 'failed', 'reached max failed startup with error: ' + containerDb.reason)
				}
			} else if (desired == 'drain' && containerDb.status !== 'deleted' && containerDb.status !== 'exited' && containerDb.status !== 'draining') {
				DockerDb.set(containerName, container, 'draining', null)
				let res = await DockerDriver.drain(containerName)
				if (res.err !== null) {
					DockerDb.set(containerName, container, 'deleted', res.err)
				}

			}
		}
		
		pipe.next()
	} catch (err) {
		console.log(err)
		pipe.next()
	}
})

module.exports.getScheduler = () => { return scheduler }