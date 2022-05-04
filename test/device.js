const synthTest = !process.env.HOSTNAME;

const assert = require('assert');
const onvif = require('../lib/onvif');

describe('Device', () => {
	let cam = null;
	before((done) => {
		const options = {
			hostname: process.env.HOSTNAME || 'localhost',
			username: process.env.USERNAME || 'admin',
			password: process.env.PASSWORD || '9999',
			port: process.env.PORT ? parseInt(process.env.PORT) : 10101,
		};
		cam = new onvif.Cam(options, done);
	});

	describe('getNTP', () => {
		it('should return NTP settings', (done) => {
			cam.getNTP((err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('setNTP', () => {
		if (synthTest) {
			it('should set NTP with ipv4', (done) => {
				cam.setNTP({
					fromDHCP: false,
					type: 'IPv4',
					ipv4Address: 'localhost',
				}, (err) => {
					assert.strictEqual(err, null);
					done();
				});
			});
			it('should set NTP with ipv6', (done) => {
				cam.setNTP({
					fromDHCP: false,
					type: 'IPv6',
					ipv6Address: '::1/128',
					dnsName: '8.8.8.8',
				}, (err) => {
					assert.strictEqual(err, null);
					done();
				});
			});
			it('should set NTP from DHCP', (done) =>
				cam.setNTP({
					fromDHCP: true
				}, (err) => {
					assert.strictEqual(err, null);
					done();
				})
			);
			it('should set multiple NTPs', (done) => {
				cam.setNTP({
					fromDHCP: false,
					NTPManual: [
						{
							type: 'IPv4',
							ipv4Address: 'localhost',
						},
						{
							type: 'IPv6',
							ipv6Address: '::1/128',
							dnsName: '8.8.8.8',
						},
					]
				}, (err) => {
					assert.strictEqual(err, null);
					done();
				});
			});
		}
	});

	describe('getNetworkInterfaces', () => {
		it('should return a NetworkInterface', (done) => {
			cam.getNetworkInterfaces((err, networkInterfaces) => {
				assert.strictEqual(err, null);
				assert.strictEqual(networkInterfaces[0].$.token, 'eth0'); // Defined in serverMockup/device.GetNetworkInterfaces.xml)
				done();
			});
		});
	});

	describe('setNetworkInterfaces', () => {
		it('should set manual IPv4, update the Cam object with the new IP and return RebootNeeded', (done) => {
			const currentIP = cam.hostname;
			cam.setNetworkInterfaces({
				interfaceToken: 'interfaceToken',
				networkInterface: {
					enabled: true,
					IPv4: {
						enabled: true,
						DHCP: false,
						manual: {
							address: '127.0.0.1',
							prefixLength: 24,
						}
					}
				}
			}, (err, data) => {
				const newIP = cam.hostname; // Save the new IP
				cam.hostname = currentIP; // Then set the original one for other tests
				assert.strictEqual(newIP, '127.0.0.1');
				assert.strictEqual(err, null);
				assert.strictEqual(data.rebootNeeded, false); // Defined in serverMockup/device.SetNetworkInterfaces.xml)
				done();
			});
		});
		it('should set manual IPv6, update the Cam object with the new IP and return RebootNeeded', (done) => {
			const currentIP = cam.hostname;
			cam.setNetworkInterfaces({
				interfaceToken: 'interfaceToken',
				networkInterface: {
					enabled: true,
					IPv6: {
						enabled: true,
						DHCP: false,
						manual: {
							address: '::1',
							prefixLength: 24,
						}
					}
				}
			}, (err, data) => {
				const newIP = cam.hostname; // Save the new IP
				cam.hostname = currentIP; // Then set the original one for other tests
				assert.strictEqual(newIP, '::1');
				assert.strictEqual(err, null);
				assert.strictEqual(data.rebootNeeded, false); // Defined in serverMockup/device.SetNetworkInterfaces.xml)
				done();
			});
		});
	});

	describe('getNetworkDefaultGateway', () => {
		it('should return a NetworkGateway', (done) =>
			cam.getNetworkDefaultGateway((err, data) => {
				assert.strictEqual(err, null);
				assert.strictEqual(data.IPv4Address, '192.168.0.1');
				assert.strictEqual(data.IPv6Address, '');
				done();
			})
		);
	});

	describe('setNetworkDefaultGateway', () => {
		it('should set IPv4 address and return a NetworkGateway', (done) => {
			cam.setNetworkDefaultGateway({
				IPv4Address: '192.168.0.2',
			}, (err, data) => {
				assert.strictEqual(err, null);
				assert.strictEqual(typeof data.IPv4Address, 'string'); // Impossible to test the set values as the response is hard written in serverMockup/device.GetNetworkDefaultGateway.xml
				assert.strictEqual(typeof data.IPv6Address, 'string');
				done();
			});
		});
		it('should set IPv6 address and return a NetworkGateway', (done) => {
			cam.setNetworkDefaultGateway({
				IPv6Address: '::2',
			}, (err, data) => {
				assert.strictEqual(err, null);
				assert.strictEqual(typeof data.IPv4Address, 'string'); // Impossible to test the set values as the response is hard written in serverMockup/device.GetNetworkDefaultGateway.xml
				assert.strictEqual(typeof data.IPv6Address, 'string');
				done();
			});
		});
	});

	describe('getDNS', () => {
		it('should return a DNSInformation', (done) => {
			cam.getDNS((err, data) => {
				assert.strictEqual(err, null);
				assert.strictEqual(data.fromDHCP, false); // Values defined in serverMockup/device.GetDNS.xml
				assert.ok(Array.isArray(data.DNSManual));
				assert.strictEqual(data.DNSManual[0].type, 'IPv4');
				assert.strictEqual(data.DNSManual[0].IPv4Address, '4.4.4.4');
				assert.strictEqual(data.DNSManual[1].type, 'IPv4');
				assert.strictEqual(data.DNSManual[1].IPv4Address, '8.8.8.8');
				done();
			});
		});
	});

	describe('setDNS', () => {
		it('should set IPv4 address and return a DNSInformation', (done) => {
			cam.setDNS({
				fromDHCP: false,
				DNSManual: [
					{
						type: 'IPv4',
						IPv4Address: '5.5.5.5',
					},
					{
						type: 'IPv4',
						IPv4Address: '9.9.9.9',
					}
				]
			}, (err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(data.DNSManual)); // Impossible to test the set values as the response is hard written in serverMockup/device.GetNetworkDefaultGateway.xml
				done();
			});
		});
		it('should set IPv6 address and return a DNSInformation', (done) => {
			cam.setDNS({
				fromDHCP: false,
				DNSManual: [
					{
						type: 'IPv6',
						IPv6Address: '2001:4860:4860::8888',
					},
					{
						type: 'IPv6',
						IPv6Address: '2001:4860:4860::8844',
					}
				]
			}, (err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(data.DNSManual)); // Impossible to test the set values as the response is hard written in serverMockup/device.GetNetworkDefaultGateway.xml
				done();
			});
		});
	});

	describe('setSystemFactoryDefault', () => {
		it('should request a soft factory default', (done) => {
			cam.setSystemFactoryDefault((err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
		it('should request a hard factory default', (done) => {
			cam.setSystemFactoryDefault(true, (err) => {
				assert.strictEqual(err, null);
				done();
			});
		});
	});

	describe('getUsers', () => {
		it('should return a list of user', (done) => {
			cam.getUsers((err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(data));
				assert.strictEqual(data[0].username, 'admin');
				assert.strictEqual(data[0].password, 'admin');
				assert.strictEqual(data[0].userLevel, 'Administrator');
				done();
			});
		});
	});

	describe('createUsers', () => {
		it('should create users', (done) => {
			cam.createUsers([
				{
					username: 'username1',
					password: 'password1',
					userLevel: 'User',
				},
				{
					username: 'username2',
					password: 'password2',
					userLevel: 'User',
				},
			], (err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(data));
				done();
			});
		});
	});

	describe('setUsers', () => {
		it('should set users', (done) => {
			cam.setUsers([
				{
					username: 'username1',
					password: 'password1',
					userLevel: 'User',
				},
				{
					username: 'username2',
					password: 'password2',
					userLevel: 'User',
				},
			], (err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(data));
				done();
			});
		});
	});

	describe('deleteUsers', () => {
		it('should delete users', (done) => {
			cam.deleteUsers([
				{
					username: 'username1',
					password: 'password1',
					userLevel: 'User',
				},
				'username2',
			], (err, data) => {
				assert.strictEqual(err, null);
				assert.ok(Array.isArray(data));
				done();
			});
		});
	});
});
