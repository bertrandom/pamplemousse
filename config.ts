import isObject from 'https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/isObject.js';
import cloneDeep from 'https://raw.githubusercontent.com/lodash/lodash/4.17.21-es/cloneDeep.js';
import JSON5 from "https://deno.land/x/json5@v1.0.0/mod.ts";

interface ConfigOptions {
	env?: Env;
}

interface Env {
	[index: string]: string;
}

const isPromise = function(obj: unknown) {
	return Object.prototype.toString.call(obj) === '[object Promise]';
}

/**
 * Extend an object, and any object it contains.
 *
 * This does not replace deep objects, but dives into them
 * replacing individual elements instead.
 *
 * @protected
 * @method extendDeep
 * @param mergeInto {object} The object to merge into
 * @param mergeFrom... {object...} - Any number of objects to merge from
 * @return {object} The altered mergeInto object is returned
 */

// deno-lint-ignore no-explicit-any
const extendDeep = function(mergeInto: any, mergeFrom: any): any {
	for (const prop in mergeFrom) {

		// Extend recursively if both elements are objects
		if (mergeFrom[prop] instanceof Date) {
			mergeInto[prop] = mergeFrom[prop];
		} else if (mergeFrom[prop] instanceof RegExp) {
			mergeInto[prop] = mergeFrom[prop];
		} else if (isObject(mergeInto[prop]) && isObject(mergeFrom[prop])) {
			extendDeep(mergeInto[prop], mergeFrom[prop]);
		} else if (isPromise(mergeFrom[prop])) {
			mergeInto[prop] = mergeFrom[prop];
		}

		// Copy recursively if the mergeFrom element is an object (or array or fn)
		else if (mergeFrom[prop] && typeof mergeFrom[prop] === 'object') {
			mergeInto[prop] = cloneDeep(mergeFrom[prop]);
		} else {
			mergeInto[prop] = mergeFrom[prop];
		}

	}

	return mergeInto;

}

/**
 * Set objects given a path as a string list
 *
 * @protected
 * @method setPath
 * @param object {object} - Object to set the property on
 * @param path {array[string]} - Array path to the property
 * @param value {*} - value to set, ignoring null
 */

// deno-lint-ignore no-explicit-any
const setPath = function (object: any, path: string[], value: any) {
	let nextKey = null;
	if (value === null || path.length === 0) {
	  return;
	}
	else if (path.length === 1) { // no more keys to make, so set the value
	  object[path.shift() || ""] = value;
	}
	else {
	  nextKey = path.shift() || "";
	  if (!Object.hasOwnProperty.call(object, nextKey)) {
		object[nextKey] = {};
	  }
	  setPath(object[nextKey], path, value);
	}
  };

/**
 * Create a new object patterned after substitutionMap, where:
 * 1. Terminal string values in substitutionMap are used as keys
 * 2. To look up values in a key-value store, variables
 * 3. And parent keys are created as necessary to retain the structure of substitutionMap.
 *
 * @protected
 * @method substituteDeep
 * @param substitutionMap {object} - an object whose terminal (non-subobject) values are strings
 * @param variables {object[string:value]} - usually process.env, a flat object used to transform
 *      terminal values in a copy of substitutionMap.
 * @returns {object} - deep copy of substitutionMap with only those paths whose terminal values
 *      corresponded to a key in `variables`
 */

// deno-lint-ignore no-explicit-any
const substituteDeep = function (substitutionMap: any, variables: any) {
	const result = {};
  
	// deno-lint-ignore no-explicit-any
	function _substituteVars(map: any, vars: any, pathTo: string[]) {
	  for (const prop in map) {
		const value = map[prop];
		if (typeof(value) === 'string') { // We found a leaf variable name
		  if (vars[value] !== undefined && vars[value] !== '') { // if the vars provide a value set the value in the result map
			setPath(result, pathTo.concat(prop), vars[value]);
		  }
		}
		else if (isObject(value)) { // work on the subtree, giving it a clone of the pathTo
		  if ('__name' in value && '__format' in value && vars[value.__name] !== undefined && vars[value.__name] !== '') {
			let parsedValue = null;
			try {

				if (value.__format === "json") {
					parsedValue = JSON.parse(vars[value.__name]);
				} else if (value.__format === "json5") {
					parsedValue = JSON5.parse(vars[value.__name]);
				} else {
					throw new Error("Unknown format: " + value.__format);
				}

			} catch(err) {
			  err.message = '__format parser error in ' + value.__name + ': ' + err.message;
			  throw err;
			}
			setPath(result, pathTo.concat(prop), parsedValue);
		  } else {
			_substituteVars(value, vars, pathTo.concat(prop));
		  }
		}
		else {
		  const msg = "Illegal key type for substitution map at " + pathTo.join('.') + ': ' + typeof(value);
		  throw Error(msg);
		}
	  }
	}
  
	_substituteVars(substitutionMap, variables, []);
	return result;
  
  };

// deno-lint-ignore no-explicit-any
const getImpl = function(object: any, property: any): any {
	const elems = Array.isArray(property) ? property : property.split('.'),
		name = elems[0],
		value = object[name];

	if (elems.length <= 1) {
	  return value;
	}
	// Note that typeof null === 'object'

	if (value === null || typeof value !== 'object') {
	  return undefined;
	}

	return getImpl(value, elems.slice(1));
};

export class Config {

	__passedEnv: Env | null = null;

	constructor(options?: ConfigOptions) {

		Object.defineProperty(this, "__passedEnv", {
			enumerable : false
		});

		if (options && options.env) {
			this.__passedEnv = options.env;
		}

		return (async (): Promise<Config> => {
			return await this.loadFileConfigs() as unknown as Config;
		})() as unknown as Config;
	}
	async loadFileConfigs() {

		const configPathReadDesc = { name: "read", path: "config" } as const;
		let configPathReadPerms = await Deno.permissions.query(configPathReadDesc);

		if (configPathReadPerms.state !== "granted") {
			configPathReadPerms = await Deno.permissions.request(configPathReadDesc);
			if (configPathReadPerms.state !== "granted") {
				return this;
			}
		}

		const nodeEnvVarNames = ['NODE_CONFIG_ENV', 'NODE_ENV'];

		let nodeEnv = null;

		for (const nodeEnvVarName of nodeEnvVarNames) {

			if (this.__passedEnv && this.__passedEnv[nodeEnvVarName]) {
				nodeEnv = this.__passedEnv[nodeEnvVarName];
				break;
			}

			const nodeEnvDesc = { name: "env", variable: nodeEnvVarName } as const;
			const nodeEnvPerms = await Deno.permissions.query(nodeEnvDesc);
	
			if (nodeEnvPerms.state === "granted") {
				const nodeEnvValue = Deno.env.get(nodeEnvDesc.variable);
				if (nodeEnvValue) {
					nodeEnv = nodeEnvValue;
					break;
				}
			}
	
		}

		if (!nodeEnv) {
			nodeEnv = "development";
		}

		const baseNames = ["default", nodeEnv];
		baseNames.push("local", "local-" + nodeEnv);

		const extNames = ["json", "json5"];

		let allowedFiles = [];

		for (const baseName of baseNames) {
			for (const extName of extNames) {
				allowedFiles.push({
					fileName: baseName + "." + extName,
					ext: extName,
				});
			}
		}

		for (const allowedFile of allowedFiles) {

			const filePath = `./config/${allowedFile.fileName}`;

			try {
				const rawFileContents = await Deno.readTextFile(filePath);

				let configObj = null;

				if (allowedFile.ext === "json") {
					configObj = JSON.parse(rawFileContents);
				} else if (allowedFile.ext === "json5") {
					configObj = JSON5.parse(rawFileContents);
				}

				extendDeep(this, configObj);

			} catch (_e) {
				continue;
			}

		}

		let env = null;

		const nodeEnvDesc = { name: "env" } as const;
		const nodeEnvPerms = await Deno.permissions.query(nodeEnvDesc);

		if (nodeEnvPerms.state === "granted") {
			env = Deno.env.toObject();
		}

		if (this.__passedEnv) {
			if (!env) {
				env = {};
			}
			for (const key in this.__passedEnv) {
				env[key] = this.__passedEnv[key];
			}
		}

		if (env) {

			allowedFiles = [];
			for (const extName of extNames) {
				allowedFiles.push({
					fileName: "custom-environment-variables." + extName,
					ext: extName,
				});
			}

			for (const allowedFile of allowedFiles) {

				const filePath = `./config/${allowedFile.fileName}`;

				try {
					const rawFileContents = await Deno.readTextFile(filePath);

					let configObj = null;

					if (allowedFile.ext === "json") {
						configObj = JSON.parse(rawFileContents);
					} else if (allowedFile.ext === "json5") {
						configObj = JSON5.parse(rawFileContents);
					}

					if (configObj) {
						const environmentSubstitutions = substituteDeep(configObj, env);
						extendDeep(this, environmentSubstitutions);
					}

				} catch (_e) {
					continue;
				}

			}

		}

		return this;
	}
	get (property: string) {
		const value = getImpl(this, property);

		// Produce an exception if the property doesn't exist
		if (value === undefined) {
			throw new Error('Configuration property "' + property + '" is not defined');
		}

		// Return the value
		return value;
	}
	has (property: string) {
		return (getImpl(this, property) !== undefined);
	}
	
}