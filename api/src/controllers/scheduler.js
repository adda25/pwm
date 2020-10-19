'use strict'

const GE = require('../events/global')
let Piperunner = require('piperunner')
let scheduler = new Piperunner.Scheduler()

scheduler.emitter(GE.Emitter)

scheduler.run({
	name: 'fetchdb', 
	pipeline: require('./pipelines/fetchdb').getPipeline('fetchdb'),
	run: {
		everyMs: 2000,
		onEvents: [GE.SystemStarted]
	},
	on: {
		end: {
			exec: [
				async (scheduler, pipeline) => {		
					await GE.LOCK.API.acquireAsync()
					//scheduler.assignData('fetchNodes', 'nodes', pipeline.data().nodes)
					scheduler.assignData('assignWorkload', 'nodes', pipeline.data().nodes)
					scheduler.assignData('assignWorkload', 'volumes', pipeline.data().volumes)
					scheduler.assignData('assignWorkload', 'storages', pipeline.data().storages)
					scheduler.assignData('assignWorkload', 'workingdir', pipeline.data().workingdir)
					scheduler.assignData('assignWorkload', 'alreadyAssignedGpu', pipeline.data().alreadyAssignedGpu)
					scheduler.assignData('assignWorkload', 'alreadyAssignedCpu', pipeline.data().alreadyAssignedCpu)
					
					//scheduler.feed({
					//	name: 'fetchNodes',
					//	data: pipeline.data().nodes
					//})

					scheduler.feed({
						name: 'assignWorkload',
						data: pipeline.data().workloads
					})

					// To batch
					scheduler.assignData('pullWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'pullWorkload',
						data: pipeline.data().workloads
					})

					scheduler.assignData('checkPullBatch', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'checkPullBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => {
							return workload._p.currentStatus == GE.WORKLOAD.REQUESTED_PULLING
						}) }]
					})

					scheduler.assignData('launchWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'launchWorkload',
						data: pipeline.data().workloads
					})

					scheduler.assignData('checkLaunch', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'checkLaunch',
						data: pipeline.data().workloads
					})

					scheduler.assignData('statusWorkloadBatch', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'statusWorkloadBatch',
						data: [{workloads: pipeline.data().workloads.filter((workload) => {
							return workload._p.currentStatus == GE.WORKLOAD.RUNNING 
								|| workload._p.currentStatus == GE.WORKLOAD.UNKNOWN
						}) }]
					})

					// To batch
					scheduler.assignData('cancelWorkload', 'nodes', pipeline.data().nodes)
					scheduler.feed({
						name: 'cancelWorkload',
						data: pipeline.data().workloads
					})

					scheduler.emit('fetchdbEnd')
					GE.LOCK.API.release()
				}
			]
		}
	}
})

scheduler.run({
	name: 'fetchNodes', 
	pipeline: require('./pipelines/fetchnodes').getPipeline('fetchNodes'),
	run: {
		everyMs: 5000,
	},
	on: {
		end: {
			exec: [
				async (scheduler, pipeline) => {
					await GE.LOCK.API.acquireAsync()
					scheduler.assignData('assignWorkload', 'nodes', pipeline.data().nodes)
					scheduler.assignData('assignWorkload', 'availableGpu', pipeline.data().availableGpu)
					scheduler.assignData('assignWorkload', 'availableCpu', pipeline.data().availableCpu)
					scheduler.emit('fetchNodesEnd')
					GE.LOCK.API.release()
				}
			]
		}
	}
})

scheduler.run({
	name: 'assignWorkload', 
	pipeline: require('./pipelines/assignWorkload').getPipeline('assignWorkload'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'pullWorkload', 
	pipeline: require('./pipelines/pullWorkload').getPipeline('pullWorkload'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'checkPullBatch', 
	pipeline: require('./pipelines/checkPullBatch').getPipeline('checkPullBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'launchWorkload', 
	pipeline: require('./pipelines/launchWorkload').getPipeline('launchWorkload'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'checkLaunch', 
	pipeline: require('./pipelines/checkLaunch').getPipeline('checkLaunch'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.run({
	name: 'statusWorkloadBatch', 
	pipeline: require('./pipelines/statusWorkloadBatch').getPipeline('statusWorkloadBatch'),
	run: {
		onEvent: 'fetchdbEnd'
	},
	on: {
		end: {
			exec: [
				(scheduler, pipeline) => {
					scheduler.emit('endStatusBatch')
				}
			]
		}
	}
})

scheduler.run({
	name: 'cancelWorkload', 
	pipeline: require('./pipelines/cancelWorkload').getPipeline('cancelWorkload'),
	run: {
		onEvent: 'fetchdbEnd'
	}
})

scheduler.log(false)