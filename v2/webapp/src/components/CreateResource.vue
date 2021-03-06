<template>
  	<v-card outlined style="min-height: 60vh">
    	<v-toolbar style="background: rgba(0,0,0,0)" flat>
    	  <v-toolbar-title class="overline">New <b>{{selectedResourceKind}}</b></v-toolbar-title>
    	  <v-spacer></v-spacer>
    	  <v-menu
    	    left
    	    bottom
    	  >
    	    <template v-slot:activator="{ on, attrs }">
    	      <v-btn
    	        text
    	        class="primary--text"
    	        v-bind="attrs"
    	        v-on="on"
    	      >
    	       {{selectedResourceKind}}
    	      <v-icon
    	        right
    	      >
    	        mdi-format-align-left
    	      </v-icon>
    	      </v-btn>
    	    </template>
	
    	    <v-list v-if="selectedMode == 'form'">
    	      <v-list-item 
    	        v-for="mode in ['Workload']"
    	        :key="mode"
    	        @click="selectedResourceKind = mode"
    	      >
    	        <v-list-item-title>{{ mode }}</v-list-item-title>
    	      </v-list-item>
    	    </v-list>
    	    <v-list v-if="selectedMode == 'yaml'">
    	      <v-list-item 
    	        v-for="mode in ['Workload', 'CPUWorkload', 'Volume', 'Storage', 'Group']"
    	        :key="mode"
    	        @click="selectedResourceKind = mode"
    	      >
    	        <v-list-item-title>{{ mode }}</v-list-item-title>
    	      </v-list-item>
    	    </v-list>
    	  </v-menu>
    	  <v-menu
    	    left
    	    bottom
    	  >
    	    <template v-slot:activator="{ on, attrs }">
    	      <v-btn
    	        text
    	        class="primary--text"
    	        v-bind="attrs"
    	        v-on="on"
    	      >
    	       {{selectedMode}}
    	      <v-icon
    	        right
    	      >
    	        mdi-format-align-left
    	      </v-icon>
    	      </v-btn>
    	    </template>
	
    	    <v-list>
    	      <v-list-item 
    	        v-for="mode in ['form', 'yaml']"
    	        :key="mode"
    	        @click="selectedMode = mode"
    	      >
    	        <v-list-item-title>{{ mode }}</v-list-item-title>
    	      </v-list-item>
    	    </v-list>
    	  </v-menu>
    	</v-toolbar>

      <!-- YAML -->
    	<v-card-text v-if="selectedMode == 'yaml'">
        <codemirror v-model="code" :options="cmOptions" @ready="onCmReady"/>
        <v-card flat class="elevation-0 pa-0">
          <v-card-actions class="pa-0 pt-2"">
            <v-spacer></v-spacer>
            <v-btn class="primary--text" text v-on:click="applyResource()"> Apply </v-btn>
          </v-card-actions>
        </v-card>
    	</v-card-text>

      <!-- FORM -->
    	<v-card-text v-if="selectedMode == 'form' && formResource._internal !== undefined && formResource._internal.toRender == true">
    		<v-card flat class="elevation-0 pa-0 pt-6">
    			<v-card-text class="pa-0"">
    				<div class="row">
    					<div class="col-lg-12 col-12 pa-0">
    						<v-card-title class="overline">
    							General
    						</v-card-title>
    					</div>
    					<div class="col-lg-6 col-12 pt-0">
    						<v-text-field
    						  	label="Workload name"
    						  	v-model="formResource.metadata.name"
    						  	hide-details="auto"
                    outlined
                    dense
    						></v-text-field>
    					</div>
    					<div class="col-lg-6 col-12 pt-0 pb-0">
        					<v-text-field
        					  v-model="formResource.spec.image.image"
        					  label="Base image"
                    outlined
                    dense
        					></v-text-field>
    					</div>
              <div class="col-lg-6 col-12 pt-0 pb-0">
                  <v-text-field
                    v-model="formResource.spec.replica.count"
                    label="Replica count"
                    outlined
                    dense
                  ></v-text-field>
              </div>
    				</div>
    			</v-card-text>
    		</v-card>
    		<v-card flat class="elevation-0 pa-0">

    			<v-card-text class="pa-0"">
    				<div class="row" v-if="formResource._internal.attachGPU == true">
    					<div class="col-lg-12 col-12 pa-0">
    						<v-card-title class="overline">
    							Resources
    						</v-card-title>
    					</div>
    					<div class="col-lg-4 col-12 pt-0 pb-0">
        					<v-select
        					  :items="['pwm.all'].concat(resources.gpus)"
        					  v-model="formResource.spec.selectors.gpu.product_name"
        					  label="GPU Model"
                    outlined
                    dense
        					></v-select>
        				</div>
        				<div class="col-lg-4 col-12 pt-0 pb-0">
    						<v-text-field
    						  	label="Count"
    						  	v-model="formResource.spec.selectors.gpu.count"
    						  	hide-details="auto"
                    outlined
                    dense
    						></v-text-field>
    					</div>
    					<div class="col-lg-4 col-12 mt-0" >
    						<v-switch
    						  v-model="formResource._internal.attachGPU"
    						  :label="`Attach GPU`"
                  dense
                  style="margin-top: -5px"
    						></v-switch>
    					</div>
    				</div>
    				<div class="row" v-else>
    					<div class="col-lg-12 col-12 pa-0">
    						<v-card-title class="overline">
    							Resources
    						</v-card-title>
    					</div>
    					<div class="col-lg-4 col-12 pt-0 pb-0">
        					<v-select
        					  :items="['pwm.all'].concat(resources.cpus)"
        					  v-model="formResource.spec.selectors.cpu.product_name"
        					  label="CPU Model"
                    outlined
                    dense
        					></v-select>
    					</div>
        				<div class="col-lg-4 col-12 pt-0 pb-0">
    						<v-text-field
    						  	label="Count"
    						  	v-model="formResource.spec.selectors.cpu.count"
    						  	hide-details="auto"
                    outlined
                    dense
    						></v-text-field>
    					</div>
    					<div class="col-lg-4 col-12 mt-0">
    						<v-switch
    						  v-model="formResource._internal.attachGPU"
    						  :label="`Attach GPU`"
                  style="margin-top: -5px"
                  dense
    						></v-switch>
    					</div>
    				</div>
    			</v-card-text>
    		</v-card>

    		<v-card flat class="elevation-0 pa-0">
    			<v-card-text class="pa-0"">
    				<div class="row">
    					<div class="col-lg-12 col-12 pa-0">
    						<v-card-title class="overline">
    							Disks
    						</v-card-title>
    					</div>
    					<div class="col-lg-12 col-12 pt-0 pb-0">
        					<v-select
        					  v-model="formResource.spec.volumes"
        					  :items="resources.volumes"
        					  item-text="name"
        					  :menu-props="{ maxHeight: '400' }"
        					  label="Volume"
        					  multiple
                    dense
                    outlined
        					  :hint="'Pick your desidered persistent volumes. E.g. mounts at ' + formResource.spec.volumes.map((vol) => { return '/' + vol}).toString()"
        					  persistent-hint
        					></v-select>
    					</div>
    				</div>
    			</v-card-text>
    		</v-card>

        <v-card flat class="elevation-0 pa-0">
          <v-card-text class="pa-0">
            <div class="row">
              <div class="col-12">
                <v-switch
                  v-model="formResource.spec.notify.byEmail"
                  :label="`Send me email at workload startup`"
                  :disabled="$store.state.userComplete !== null && $store.state.userComplete.spec !== undefined && $store.state.userComplete.spec.contact !== undefined && $store.state.userComplete.spec.contact.email !== undefined"
                  dense
                ></v-switch>
              </div>
            </div>
          </v-card-text>
        </v-card>

    		<v-card flat class="elevation-0 pa-0">
    			<v-card-text class="pa-0"">
    				<div class="row">
    					<div class="col-12">
    						<v-expansion-panels flat>
    							<v-expansion-panel>
    							  	<v-expansion-panel-header>
    									<v-card-title class="overline pa-0 ma-0 grey--text">
    										Advanced
    									</v-card-title>
    							  	</v-expansion-panel-header>
    							  	<v-expansion-panel-content>
    							  		<div class="row">
											<div class="col-6 col-lg-6">
    											<v-text-field
    											  	label="Command"
    											  	v-model="formResource.spec.config.cmd"
    											  	hide-details="auto"
                              outlined
                              dense
    											></v-text-field>
											</div>
											<div class="col-6 col-lg-6">
    											<v-text-field
    											  	label="Shared memory (bytes)"
    											  	v-model="formResource.spec.config.shmSize"
    											  	hide-details="auto"
                              outlined
                              dense
    											></v-text-field>
											</div>
    							  		</div>
    							  	</v-expansion-panel-content>
    							</v-expansion-panel>
    						</v-expansion-panels>
    					</div>
    				</div>
    			</v-card-text>
    		</v-card>

    		<v-card flat class="elevation-0 pa-0">
    			<v-card-actions class="pa-0"">
    				<v-spacer></v-spacer>
    				<v-btn class="primary--text" text v-on:click="applyResourceForm()"> Apply </v-btn>
    			</v-card-actions>
    		</v-card>

    	</v-card-text>
	</v-card>
</template>
<script type="text/javascript">

import anifunny from 'anifunny'
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
import yaml from 'js-yaml'
import _ from 'lodash'
import { codemirror } from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/yaml-frontmatter/yaml-frontmatter.js'
import 'codemirror/theme/base16-dark.css'
import 'codemirror/theme/base16-light.css'

function generateName () {
  //return anifunny.generate()
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors ], 
    length: 2,
    separator: '.'
  })
}

let examples = {
  CPUWorkload: `
apiVersion: v1
kind: Workload
metadata:
  name: ` + generateName() + `
spec:
  driver: Docker
  replica:
    count: 1
  notify:
    byEmail: false
  selectors:
    node:
      name: All
    cpu:
      product_name: All
      count: 1
  image: 
    image: ubuntu
  config: 
    cmd: /bin/bash
  volumes:
    - name: home
      storage: pwmzfs01
      target: /home
   `,
  Workload: `
apiVersion: v1
kind: Workload
metadata:
  name: ` + generateName() + `
spec:
  driver: Docker
  replica:
    count: 1
  notify:
    byEmail: false
  selectors:
    node:
      name: All
    gpu:
      product_name: All
      count: 1
  image: 
    image: ubuntu
  config: 
    cmd: /bin/bash
  volumes:
    - name: home
      storage: pwmzfs01
      target: /home
   `,
  Volume: `
apiVersion: v1
kind: Volume
metadata:
  name: home
spec:
  storage: pwmzfs01
  subPath: /home
   `,
  Storage: `
apiVersion: v1
kind: Storage
metadata:
  name: example-storage
spec:
  accessModes: ReadWriteMany 
  capacity: 
    storage: 30Gi 
  kind: nfs
  nfs:
    server: <IP_ADDRESS>
    path: /<MOUNT_PATH>
   `,
  Group: `
apiVersion: v1
kind: Group
metadata:
  name: <GROUP_NAME>
   `
}


let Workload = {
	defaults: {
		apiVersion: 'v1',
		kind: 'Workload',
		metadata: {},
		spec: {config: {}},
	},
	defaultFields: [
		{text: 'Workload name', target: 'metadata.name', kind: 'text', default: generateName()},
		{text: 'Base image', target: 'spec.image.image', kind: 'text', default: 'ubuntu'},
    {text: 'Replica count', target: 'spec.replica.count', kind: 'number', default: 1},
		{text: 'GPU/CPU', target: 'spec.selectors.gpu.product_name', kind: 'switch', values: ['gpu', 'cpu'], default: 'pwm.all'},
		{text: 'GPU/CPU', target: 'spec.selectors.cpu.product_name', kind: 'switch', values: ['gpu', 'cpu'], default: 'pwm.all'},
		{text: 'Quantity', target: 'spec.selectors.gpu.count', kind: 'number', default: 1},
		{text: 'Quantity', target: 'spec.selectors.cpu.count', kind: 'string', default: 1},
		{text: 'Disks', target: 'spec.volumes', kind: 'array', default: ['home'], template: 'volumeItem' },
    {text: 'Notify', target: 'spec.notify.byEmail', kind: 'switch', values: [false, true], default: false},
	],
	advancedFields: [
		{text: 'Driver', target: 'spec.driver', kind: 'select', default: 'pwm.docker', selectedIn: ['pwm.docker']},
		{text: 'Command', target: 'spec.config.cmd', kind: 'text', default: '/bin/bash'},
		{optional: true, text: 'Shared memory (bytes)', target: 'spec.config.shmSize', kind: 'number', default: '64000000'},
	],
	templates: {
		volumeItem: [
			{text: 'Volume name', kind: 'text'},
			{text: 'Storage', kind: 'text'},
			{text: 'Target', kind: 'text'},
		]
	},
	internal: {
		toRender: false,
		attachGPU: true
	}
}

examples[Workload] = Workload

function getExample(kind, user) {
  	return examples[kind]
}

export default {
  name: 'NewResource',
  components: { codemirror },
  data: function () {
    return {
      formResource: {}, 	
      resourceModel: {Workload: Workload},
      examples: examples,
      selectedMode: 'form',
      selectedResourceKind: 'Workload',
      resources: {nodes: [], gpus: [], storages: [], cpus: [], volumes: []},
      code: '',
      cmOptions: {
        tabSize: 2,
        mode: 'text/yaml',
        lineNumbers: true,
        styleActiveLine: true,
        theme: this.$vuetify.theme.dark == true ? 'base16-dark' : 'base16-light',
        line: true,
      },        
    }
  },
  watch: {
    '$vuetify.theme.dark' (to, from) {
      this.cmOptions.theme = this.$vuetify.theme.dark == true ? 'base16-dark' : 'base16-light'
    },
    selectedResourceKind (to, from) { 
      this.code = `${getExample(this.selectedResourceKind || 'Workload', this.$store.state.user.name)}`
      this.setFormResource()
    },
    selectedMode (to, from) {
    	if (this.selectedResourceKind !== 'Workload') {
    		this.selectedResourceKind = 'Workload'
    	} else {
    		this.setFormResource()		
    	}
    }
  },
  computed: {
    codemirror() {
      return this.$refs.cmEditor.codemirror
    },
  },
  methods: {
  	setFormResource () {
  		if (this.selectedMode !== 'form') {
  			return
  		}
  		this.formResource = {}
  		Object.keys(this.resourceModel[this.selectedResourceKind].defaults).forEach(function (key) {
  			this.formResource[key] = this.resourceModel[this.selectedResourceKind].defaults[key]
  		}.bind(this))
  		this.resourceModel[this.selectedResourceKind].defaultFields.forEach(function (item) {
  			_.set(this.formResource, item.target, item.default)
  		}.bind(this))
  		this.resourceModel[this.selectedResourceKind].advancedFields.forEach(function (item) {
  			if (item.optional == undefined || item.optional == false) {
  				_.set(this.formResource, item.target, item.default)	
  			}
  		}.bind(this))
  		this.formResource._internal = this.resourceModel[this.selectedResourceKind].internal
  		this.formResource._internal.toRender = true
  	},
    formatResource (inData) {
      if (inData instanceof Array) {
        return inData
      }  else {
        return [inData]
      }
    },
    applyResource () {
      if (this.selectedMode == 'form') {
        this.applyResourceForm()
        return
      }
      let jsonData = yaml.safeLoadAll(this.code)
      this.formatResource(jsonData).forEach(function (_resource) {
        this.$store.dispatch('apply', _resource)
      }.bind(this))
    },
    applyResourceForm () {
      	let workloadData = {}
      	workloadData.apiVersion = this.formResource.apiVersion
      	workloadData.kind = this.formResource.kind
      	workloadData.metadata = this.formResource.metadata
      	workloadData.spec = {selectors: {}, image: {image: ''}, notify: {byEmail: false}, replica: {count: 1}}
      	if (this.formResource._internal.attachGPU) {
          this.formResource.spec.selectors.gpu.count = parseInt(this.formResource.spec.selectors.gpu.count)
      		workloadData.spec.selectors.gpu = this.formResource.spec.selectors.gpu
      	} else {
          this.formResource.spec.selectors.cpu.count = this.formResource.spec.selectors.cpu.count
      		workloadData.spec.selectors.cpu = this.formResource.spec.selectors.cpu
      	}
      	workloadData.spec.image.image = this.formResource.spec.image.image
        workloadData.spec.image.pullPolicy = this.formResource.spec.image.pullPolicy || 'IfNotPresent'
        workloadData.spec.replica.count = this.formResource.spec.replica.count
      	workloadData.spec.driver = this.formResource.spec.driver
        workloadData.spec.notify.byEmail = this.formResource.spec.notify.byEmail
      	if (this.formResource.spec.volumes.length > 0) {
      		workloadData.spec.volumes = []
      		this.formResource.spec.volumes.forEach((volumeName) => {
      			this.resources.volumes.some((volume) => {
      				if (volume.name == volumeName) {
      					workloadData.spec.volumes.push({name: volume.name, storage: volume.storage, target: '/' + volume.name, group: volume.group})
      					return true
      				}
      			})
      		})
      	}
      	if (this.formResource.spec.config !== undefined) {
      		workloadData.spec.config = this.formResource.spec.config
      	}
      	this.formatResource(workloadData).forEach(function (_resource) {
      	  this.$store.dispatch('apply', _resource)
      	}.bind(this))
    },

    onCmReady(cm) {
      setTimeout(function (argument) {
        this.code = `${getExample(this.selectedResourceKind, this.$store.state.user.name)}`
      }.bind(this), 500)
    },
    onCmCodeChange(newCode) {
      this.code = newCode
    },
    fetch () {
      this.$store.dispatch('resource', {name: 'GPU', cb: function (data) {
        this.resources.gpus = [...new Set(data.map((gpu) => { return gpu.product_name}) )]
      }.bind(this)})  
      this.$store.dispatch('resource', {name: 'CPU', cb: function (data) {
        this.resources.cpus = [...new Set(data.map((cpu) => { return cpu.product_name}) )]
      }.bind(this)})  
 
      this.$store.dispatch('resource', {name: 'Storage', cb: function (data) {
        this.resources.storages = data.map((storage) => {return storage.name})
      }.bind(this)})
      this.$store.dispatch('resource', {name: 'Volume', cb: function (data) {
        this.resources.volumes = data.map((volume) => {return {name: volume.name, storage: volume.storage, target: '/' + volume.name, group: volume.group}})
      }.bind(this)})
    },

  },
  mounted () {
  	this.setFormResource()	
    this.fetch() 
  }
}
</script>
<style>
.CodeMirror {
  min-height: 60vh;
  height: auto;
}
</style>