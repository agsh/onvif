const { Cam } = require('../lib/cam');

const promisifiedMethods = [];

for (const fun in Cam.prototype) {
	// eslint-disable-next-line no-prototype-builtins
	if (Cam.prototype.hasOwnProperty(fun)) {
		promisifiedMethods.push(fun);
	}
}

class CamPromise {
	/**
	 * @param {Cam~Options} options
	 */
	constructor(options) {
		this._cam = new Cam({...options, autoconnect: false});
		return new Proxy(this, {
			get(target, name) {
				return promisify(target, name);
			},
			set(target, name, value) {
				target._cam[name] = value;
			}
		});
	}
}

function promisify(target, name) {
	const method = target._cam[name];
	if (typeof method == 'function') {
		if (promisifiedMethods.includes(name)) {
			target._cam.emit('promisify', name);
			const promise = (...args) => new Promise((resolve, reject) =>
				method.apply(target._cam, [...args, (err, ...data) => {
					if (err) {
						reject(err);
					} else {
						resolve(...data);
					}
				}])
			);
			return promise;
		} else {
			return (...args) => method.apply(target._cam, args);
		}
	}
	return method;
}

module.exports = {
	Cam: CamPromise,
	promisifiedMethods
};
