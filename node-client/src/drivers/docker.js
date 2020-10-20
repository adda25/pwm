let Pipe = require('Piperunner').Pipe
let Runner = require('Piperunner').Runner
let shell = require('shelljs')
let shellescape = require('shell-escape')
let randomstring = require('randomstring')
let fs = require('fs')
let Docker = require('dockerode')
let docker = new Docker({socketPath: '/var/run/docker.sock'})

let socket = process.env.DOCKER_SOCKET || '/var/run/docker.sock'
let stats  = fs.statSync(socket)

if (!stats.isSocket()) {
  throw new Error('Are you sure the docker is running?')
}

let Pulls = {}

async function getContainerBatch (pipe, job) {
	let container = docker.getContainer(job.scheduler.container.id)
	if (container) {
		container.inspect(function (err, data) {
			if (err) {
				pipe.data[job.scheduler.container.name] = {
					name: job.scheduler.container.name,
					inspect: 'error',
					info: data
				}
		
			} else {
				pipe.data[job.scheduler.container.name] = {
					name: job.scheduler.container.name,
					inspect: 'done',
					info: data
				}
			}
			pipe.next()			
		})
	} else {
		pipe.data[job.scheduler.container.name] = {
			name: job.scheduler.container.name,
			inspect: 'notpresent',
		}
		pipe.next()
	}
}

async function pull (pipe, job) {
	let image = job.spec.image.registry == undefined ? job.spec.image.image : job.spec.image.registry + '/' + job.spec.image.image

	if (Pulls[job.scheduler.container.pullUid] == undefined) {
		console.log('creating pull for', image)
		Pulls[job.scheduler.container.pullUid] = {date: new Date(), status: 'start'}
	}
	docker.pull(image, async function (err, stream) {
		if (err) {
			console.log('pull err', err)
			pipe.data.pulled = false
			pipe.data.pullError = true
			pipe.data.pullError = err
			Pulls[job.scheduler.container.pullUid] = {date: new Date(), status: 'error', data: pullError}
			pipe.end()
		} else {
			let result = await new Promise((resolve, reject) => {
			  docker.modem.followProgress(stream, (err, res) => {
			  	console.log(err, res)
			  	err ? reject(err) : resolve(res)
			  })
			})
			pipe.data.pulled = true
			pipe.data.pullResult = result
			Pulls[job.scheduler.container.pullUid] = {date: new Date(), status: 'done', data: result}
			pipe.end()
		}
	})
}

async function remove (pipe, job) {
	shell.exec('docker stop ' + job.scheduler.container.name)
	shell.exec('docker rm ' + job.scheduler.container.name)
	pipe.next()
}

async function createVolume (pipe, job) {
	pipe.data.volume = {}
	pipe.data.volume.errors = []
	console.log('job.volume', job.scheduler.volume)
	if (job.scheduler.volume == undefined) {
		pipe.next()
		return
	}

	let cmd = ''
	let rootPathCmd = ''
	let data = {}
	for (var i = 0; i < job.scheduler.volume.length; i += 1) {
		let vol = job.scheduler.volume[i]
		let type = vol.kind
		if (type == 'nfs') {
			data = {
				name: vol.name,
				server: vol.storage._p.spec.nfs.server,
				rootPath: vol.storage._p.spec.nfs.path,
				subPath: vol.vol._p.spec.subPath
			}
			console.log(data)
			cmd = `docker volume create --driver local --opt type=nfs --opt o=addr=${data.server},rw --opt device=:${data.rootPath}/${data.name}/${data.subPath} ${data.name}`
			rootPathCmd = `docker volume create --driver local --opt type=nfs --opt o=addr=${data.server},rw --opt device=:${data.rootPath} ${data.name + '-root'}`
			let output = shell.exec(cmd)
			console.log('Cmd1', cmd)
			//console.log('Output1', output)
			if (output.code != 0) {
				pipe.data.volume.errors.push('error creating nfs volume')
			}
			if (data.subPath !== undefined) {
				let outputRoot = shell.exec(rootPathCmd)
				console.log('rootPathCmd', cmd)
				//console.log('outpturoot', outputRoot)
				if (outputRoot.code != 0) {
					pipe.data.volume.errors.push('error creating nfs root volume')
				}
				let busyboxName = randomstring.generate(24).toLowerCase()
				let createRootFolderCmd = `docker run -d --mount 'source=${data.name + '-root'},target=/mnt' --name ${busyboxName}  busybox /bin/mkdir -p /mnt/${data.name}/${data.subPath}`
				let out = shell.exec(createRootFolderCmd)
				console.log('rootPathCmd', createRootFolderCmd)
				//console.log('outpturoot', out)
				if (out.code != 0) {
					pipe.data.volume.errors.push('error creating nfs subpath volume')
				}
    			shell.exec(`docker stop ${busyboxName}`)
    			shell.exec(`docker rm ${busyboxName}`)
			} 
		} else {
			data = {
				name: vol.name,
			}
			cmd = `docker volume create ${data.name}`
			let output = shell.exec(cmd)
			if (output.code != 0) {
				pipe.data.volume.errors.push('error creating volume')
			}
		}		
	}
	console.log('pipe.data.volume', pipe.data.volume)
	pipe.next()
}

async function start (pipe, job) {
	if (pipe.data.volume.errors.length !== 0) {
		console.log('Exiting becuse volume err')
		pipe.data.started = false
		pipe.data.container = {}
		pipe.next()
		return
	}
	let image = job.spec.image.registry == undefined ? job.spec.image.image : job.spec.image.registry + '/' + job.spec.image.image
	let output = ''
	let startMode = (job.spec.config !== undefined && job.spec.config.startMode !== undefined) ? job.spec.config.startMode : '-itd'
	let cmd = (job.spec.config !== undefined && job.spec.config.cmd !== undefined) ? job.spec.config.cmd : ''
	//let cpus = (job.config !== undefined && job.config.cpus !== undefined) ? job.config.cpus : '1'
	//let memory = (job.config !== undefined && job.config.memory !== undefined) ? job.config.memory : '512m'
	let volume = (job.scheduler.volume !== undefined) ? job.scheduler.volume : null
	let shellCommand = ''

	let calcGpus = function (gpuAry) {
		let gpus = ''
		gpuAry.forEach((gpu) => {
			gpus += gpu.minor_number + ','
		})
		gpus = gpus.slice(0, -1)
		return gpus
	}
	console.log(job)
	if (job.gpu == undefined || process.env.mode == 'dummy') {
		//  '--cpus=' + cpus
		shellCommand = ['docker', 'run', '--name', job.scheduler.container.name]
		if (volume !== null) {
			volume.forEach((vol) => {
				shellCommand.push('--mount')
				shellCommand.push('source=' + vol.name + ',target=' + vol.target)
			})
		}
		shellCommand = shellCommand.concat([startMode, image, cmd])
	} else { //
		let GPU__RES = calcGpus(job.scheduler.gpu) // '--cpus=' + cpus
		shellCommand = ['docker', 'run', '--name', job.scheduler.container.name, '--gpus', '"device=' + GPU__RES +'"']
		if (volume !== null) {
			volume.forEach((vol) => {
				shellCommand.push('--mount')
				shellCommand.push('source=' + vol.name + ',target=' + vol.target)
			})
		}
		shellCommand = shellCommand.concat([startMode, image, cmd])
	}

	console.log('Cmd start:', shellescape(shellCommand))
	output = shell.exec(shellescape(shellCommand))
	console.log('->', output)
	pipe.data.started = true
	pipe.data.container = {}
	pipe.data.container.id = output.trim()
	pipe.data.stderr = output.stderr
	pipe.data.stdout = output.stdout 
	pipe.next()	
}

async function stop (pipe, job) {
	let container = docker.getContainer(job.scheduler.container.id)
	if (container) {
		container.stop(function (err) {
			if (err) {
				pipe.data.stopError = true
				pipe.data.stopErrorSpec = err
				pipe.next()
			} else {
				pipe.data.stop = true
				pipe.next()
			}
		})
	}
}

async function deleteContainer (pipe, job) {
	let container = docker.getContainer(job.scheduler.container.id)
	if (container) {
		container.remove(function (err, data) {
			if (err) {
		  		pipe.data.remove = 'error'
		  		pipe.data.info = data
		  		console.log(err)
		  		pipe.next()				
			} else {
				pipe.data.remove = 'done'
		  		pipe.data.info = data
		  		pipe.next()			
			}
		})		
	} else {
		pipe.data.remove = 'notpresent'
		pipe.end()
	}
}

module.exports.pull = (body, cb) => {
	//console.log('Pull', body)
	let pipe = new Pipe()
	pipe.step('pull', (pipe, job) => {
		pull(pipe, job)
	})
	pipe._pipeEndCallback = () => {
		cb(pipe.data)
	}
	pipe.setJob(body)
	pipe.run()
}

// Batch
module.exports.pullstatus = (body, cb) => {
	let results = {}
	body.forEach((workload) => {
		results[workload.metadata.name] = {}
		results[workload.metadata.name] = Pulls[workload.scheduler.container.pullUid]
		results[workload.metadata.name].name = workload.metadata.name
	})
	cb(results)
}

module.exports.workloadcreate = (body, cb) => {
	let pipe = new Pipe()

	pipe.step('remove', (pipe, job) => {
		remove(pipe, job)
	})
	pipe.step('createVolume', (pipe, job) => {
		createVolume(pipe, job)
	})
	pipe.step('start', (pipe, job) => {
		start(pipe, job)
	})
	pipe._pipeEndCallback = () => {
		cb(pipe.data)
	}
	pipe.setJob(body)
	pipe.run()
}

module.exports.workloadstatus = (body, cb) => {
	let pipe = new Pipe()
	pipe.data = {}
	pipe.step('getcontainer', (pipe, job) => {
		getContainerBatch(pipe, job)
	})
	let runner = new Runner(body, pipe, () => {
		cb(pipe.data)
	})
}

module.exports.workloaddelete = (body, cb) => {
	let pipe = new Pipe()
	pipe.step('stopcontainer', (pipe, job) => {
		stop(pipe, job)
	})
	pipe.step('deletecontainer', (pipe, job) => {
		deleteContainer(pipe, job)
	})
	pipe._pipeEndCallback = () => {
		cb(pipe.data)
	}
	pipe.setJob(body)
	pipe.run()
}
