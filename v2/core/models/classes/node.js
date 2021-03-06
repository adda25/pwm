'use strict'

let BaseResource = require('./base')

class Node extends BaseResource {
	static Kind = BaseResource.Interface.Kind.Node

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

	observed () {
		return (this._p.observed == undefined || this._p.observed == null) ? {
			cpus: [],
			gpus: [],
		} : this._p.observed
	}

	async freeGpusCount (ContainerClass) {
		let observed = this.observed()
		let containers = await ContainerClass.Get({
			zone: this.zone(),
			node_id: this.id(),
		})

		let assignedGpus = 0
		containers.data.forEach((c) => {
			let cc = new ContainerClass(c)
			assignedGpus += cc.assignedGpuCount()
		})		
		return observed.gpus.length - assignedGpus
	}

	async freeCpusCount (ContainerClass) {
		let observed = this.observed()
		let containers = await ContainerClass.Get({
			zone: this.zone(),
			node_id: this.id(),
		})

		let assignedCpus = 0
		containers.data.forEach((c) => {
			let cc = new ContainerClass(c)
			assignedCpus += cc.assignedCpuCount()
		})		
		return observed.cpus.length - assignedCpus
	}

	async computeResourceToAssign (Class, container) {
		let observed = this.observed()
		let computed = this.computed()
		let toAssignCpu = container.requiredCpuCount()
		let toAssignGpu = container.requiredGpuCount()
		let computedResources = {
			cpus: [], 
			volumes: [], 
			gpus: null, 
			gpuKind: observed.gpuKind,
			mem: null, 
			nodecpus: observed.cpuCount, 
			nodegpus: observed.gpus.length,
			nodememory: observed.mem.total
		}

		// VOLUMES
		if (container.requireVolumes()) {
			let volumes = container.requiredVolumes()	
			for (var vol = 0; vol < volumes.length; vol += 1) {
				let _vol = await Class.Volume.Get({
					zone: this.zone(),
					workspace: volumes[vol].workspace || container.workspace(),
					name: volumes[vol].name
				})
				if (_vol.err == null && _vol.data.length == 1) {

					// TODO: Add hostpath
					if (_vol.data[0].resource.storage !== 'Local') {
						let _storage = await Class.Storage.Get({
							zone: this.zone(),
							name: _vol.data[0].resource.storage
						})
						if (_storage.err == null && _storage.data.length == 1) {
							computedResources.volumes.push({
								name: 'dora.volume.' + container.workspace() + '.' + volumes[vol].name,
								target: volumes[vol].target,
								workspace: _vol.data[0].workspace,
								storageName: _storage.data[0].name, 
								storage: _storage.data[0].resource,
								resource: volumes[vol],
								policy: _vol.data[0].resource.policy || 'rw'
							})							
						}
					} else {
						computedResources.volumes.push({
							name: 'dora.volume.' + container.workspace() + '.' + volumes[vol].name,
							target: volumes[vol].target,
							workspace: _vol.data[0].workspace,
							storageName: 'local',
							storage: _storage.data[0].resource,
							resource: volumes[vol],
							policy: _vol.data[0].resource.policy || 'rw'
						})	
					}
				}
			}
		}

		// CPUS
		if (isNaN(toAssignCpu) == true) {
			computedResources.cpus = toAssignCpu
			return computedResources
		}
		let assignedCpuIndex = []
		let assignedGpuIndex = []
		
		let containers = await Class.Container.Get({
			zone: this.zone(),
			node_id: this.id(),
		})

		let nodeAssignedCpusIndex = []
		let nodeAssignedGpusIndex = []
		containers.data.forEach((c) => {
			let cc = new Class.Container(c)
			nodeAssignedCpusIndex = nodeAssignedCpusIndex.concat(cc.assignedCpu())
			nodeAssignedGpusIndex = nodeAssignedGpusIndex.concat(cc.assignedGpu())
		})

		for (var cpuIndex = 0; cpuIndex < observed.cpus.length; cpuIndex += 1) {
			if (!nodeAssignedCpusIndex.includes(cpuIndex)) {
				assignedCpuIndex.push(cpuIndex)
			}
			if (toAssignCpu === assignedCpuIndex.length) {
				break
			}
		} 
		computedResources.cpus = assignedCpuIndex

		// GPUS
		if (toAssignGpu !== 0) {
			for (var gpuIndex = 0; gpuIndex < observed.gpus.length; gpuIndex += 1) {
				if (!nodeAssignedGpusIndex.includes(observed.gpus[gpuIndex].minor_number)) {
					assignedGpuIndex.push(observed.gpus[gpuIndex].minor_number)
					nodeAssignedGpusIndex.push(observed.gpus[gpuIndex].minor_number)
				}
				if (parseInt(toAssignGpu) == parseInt(assignedGpuIndex.length)) {
					break
				}
			} 
			computedResources.gpus = assignedGpuIndex
		}
		return computedResources
	}

	static isReady (data) {
		let lastSeen = 'never'
		let milliLastSeen = '-'
		if (data.observed !== undefined && data.observed !== null) {
			lastSeen = new Date() - new Date(data.observed.lastSeen)
			milliLastSeen = lastSeen
			if (lastSeen <= 20000) {
				lastSeen = 'now'
			} else if (lastSeen > 20000 && lastSeen <= 120000) {
				lastSeen = Math.floor(lastSeen / 1000) + 's ago'
			} else if (lastSeen > 120000 && lastSeen <= 3600000) {
				lastSeen = Math.floor(lastSeen / 1000 / 60) + 'm ago'
			} else if (lastSeen > 3600000 && lastSeen < 86400000) {
				lastSeen = Math.floor(lastSeen / 1000 / 60 / 60) + 'h ago'
			} else {
				lastSeen = Math.floor(lastSeen / 1000 / 60 / 60 / 24) + 'd ago'
			}			
		}
		return {
			lastSeen: lastSeen,
			status: (lastSeen !== 'never' && milliLastSeen < 20000 && data.desired == 'run') ? 'READY' : 'NOT_READY' 
		}
	}

	isReady () {
		return this.constructor.isReady(this._p)
	}

	static hasCpuKind (node, cpuKind) {
		if (node.observed !== undefined && node.observed !== null) {
			return node.observed.cpuKind == cpuKind
		} else {
			return false
		}
	}

	static hasGpuKind (node, gpuKind) {
		if (node.observed !== undefined && node.observed !== null) {
			return node.observed.gpuKind == gpuKind
		} else {
			return false
		}
	}

	static hasGpus (node) {
		if (node.observed !== undefined && node.observed !== null) {
			return node.observed.gpus !== undefined & node.observed.gpus.length > 0
		} else {
			return false
		}
	}

	static hasCpus (node) {
		if (node.observed !== undefined && node.observed !== null) {
			return node.observed.cpus !== undefined & node.observed.cpus.length > 0
		} else {
			return false
		}
	}

	static allowCpuWorkload (node) {

		return node.resource !== undefined && node.resource.allow !== undefined && node.resource.allow.includes('CPUWorkload')
	}	

	static allowGpuWorkload (node) {
		return node.resource !== undefined && node.resource.allow !== undefined && node.resource.allow.includes('GPUWorkload')
	}

	static _FormatOne (data) {
		let cpuKind = '-' 
		let gpuKind = '-'
		let cpuCount = '-'
		let gpuCount = '-'
		if (data.observed !== undefined && data.observed !== null) {
			if (data.observed.cpuKind !== undefined && data.observed.cpuKind !== null) {
				cpuKind = data.observed.cpuKind	
				cpuCount = data.observed.cpuCount
			}
			if (data.observed.gpus.length !== 0) {
				gpuKind = data.observed.gpus[0].product_name	
				gpuCount = data.observed.gpus.length
			}
		}

		let {lastSeen, status} = this.isReady(data) 

		return {
			kind: data.kind,
			zone: data.zone,
			name: data.name,
			endpoint: data.resource.endpoint,
			cpu: cpuKind !== '-' ? cpuCount + 'x' + cpuKind : cpuKind,
			gpu: gpuKind !== '-' ? gpuCount + 'x' + gpuKind : gpuKind,
			lastSeen: lastSeen,
			desired: data.desired,
			status: status
		}
	}
}

module.exports = Node