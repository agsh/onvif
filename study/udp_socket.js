/**
 * WS-Discovery 학습을 위한 UDP 송신 예제
 * 멀티캐스트 주소 239.255.255.250:3702로 "hello" 메시지를 전송한다.
 */

const dgram = require('dgram');
const os = require('os');
const { guid, parseSOAPString, linerase } = require('../lib/utils');

const MULTICAST_ADDRESS = '239.255.255.250';
const DISCOVERY_PORT = 3702;

// Windows NIC display name to use (as shown in ipconfig, without the "Ethernet adapter" prefix)
// Example: "이더넷 4"
const TARGET_INTERFACE_NAME = '이더넷 4';

function getIPv4FromInterface(name) {
  const ifaces = os.networkInterfaces();
  if (!ifaces || !ifaces[name]) return null;
  const entry = ifaces[name].find((a) => a.family === 'IPv4' && !a.internal);
  return entry ? entry.address : null;
}

/**
 * WS-Discovery Probe SOAP 메시지를 생성한다.
 * @param {string} [messageId] 커스텀 MessageID (기본값: GUID)
 * @returns {Buffer}
 */
function buildProbeMessage(messageId = guid()) {
	const body =
		'<Envelope xmlns="http://www.w3.org/2003/05/soap-envelope" xmlns:dn="http://www.onvif.org/ver10/network/wsdl">' +
		'<Header>' +
		'<wsa:MessageID xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:uuid:' + messageId + '</wsa:MessageID>' +
		'<wsa:To xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>' +
		'<wsa:Action xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>' +
		'</Header>' +
		'<Body>' +
		'<Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
		'<Types>dn:NetworkVideoTransmitter</Types>' +
		'<Scopes />' +
		'</Probe>' +
		'</Body>' +
		'</Envelope>';
	return Buffer.from(body, 'utf8');
}

const RECEIVE_TIMEOUT = 5000; // ms

const socket = dgram.createSocket('udp4');

// Try to find the IPv4 address for the target NIC
const LOCAL_BIND_ADDRESS = getIPv4FromInterface(TARGET_INTERFACE_NAME);

// Deduplication store keyed by URN
const RESULTS = new Map();

socket.on('message', (msg, rinfo) => {
	const xml = msg.toString();
    // console.log(`xml: ${xml}`);
	parseSOAPString(xml, (err, body) => {
		if (err || !body || !body[0] || !body[0].probeMatches) {
			return; // 무시: 잘못된 SOAP 또는 ProbeMatches 없음
		}
		try {
			const data = linerase(body);
			const match = data.probeMatches.probeMatch;
			const urn = match.endpointReference.address;
			const xaddrsStr = match.XAddrs || '';
			// NOTE: parseSOAPString lowercases tag names when the 2nd letter is lowercase,
			// so 'Scopes' becomes 'scopes' here.
			const scopesStr = match.scopes || '';
			let name = '';
			let hardware = '';
			if (typeof scopesStr === 'string') {                
				const scopes = scopesStr.split(' ');
				for (const s of scopes) {
					if (s.includes('onvif://www.onvif.org/name')) name = decodeURI(s.substring(27));
					if (s.includes('onvif://www.onvif.org/hardware')) hardware = decodeURI(s.substring(31));
				}
			}

			const existing = RESULTS.get(urn);
			if (!existing) {
				RESULTS.set(urn, {
					urn,
					ip: rinfo.address,
					xaddrs: new Set(xaddrsStr ? xaddrsStr.split(' ') : []),
					name,
					hardware
				});
			} else {
				existing.ip = rinfo.address; // 최신 IP 갱신
				if (xaddrsStr) {
					for (const xa of xaddrsStr.split(' ')) existing.xaddrs.add(xa);
				}
				if (!existing.name && name) existing.name = name;
				if (!existing.hardware && hardware) existing.hardware = hardware;
			}
		} catch {}
	}, 200);
});

socket.on('error', (err) => {
	console.error('socket error:', err);
	socket.close();
});

socket.on('close', () => {
	console.log('socket closed');
});

const onBound = () => {
	const {address, port} = socket.address();
	console.log(`UDP socket bound on ${address}:${port}`);

  // Ensure multicast egress uses the same NIC on Windows
  if (LOCAL_BIND_ADDRESS) {
    try {
      socket.setMulticastInterface(LOCAL_BIND_ADDRESS);
      // TTL 1 is typical for WS-Discovery on local subnet
      socket.setMulticastTTL(1);
      console.log(`Multicast interface set to ${LOCAL_BIND_ADDRESS}`);
    } catch (e) {
      console.warn('Failed to set multicast interface:', e.message);
    }
  }

	const message = buildProbeMessage();
	socket.send(message, 0, message.length, DISCOVERY_PORT, MULTICAST_ADDRESS, (err) => {
		if (err) {
			console.error('send error:', err);
		} else {
			console.log(`sent WS-Discovery Probe (${message.length} bytes) to ${MULTICAST_ADDRESS}:${DISCOVERY_PORT}`);
			console.log(`listening for responses for ${RECEIVE_TIMEOUT}ms...`);
			setTimeout(() => {
				// Print final deduplicated results
				const items = Array.from(RESULTS.values());
				console.log('--- WS-Discovery Results ---');
				console.log(`Total devices: ${items.length}`);
				items.forEach((it, idx) => {
					const xaddrsStr = Array.from(it.xaddrs || []).join(' ');
					console.log(`#${idx + 1}`);
					console.log(`  IP      : ${it.ip}`);
					console.log(`  URN     : ${it.urn}`);
					if (it.name) console.log(`  Name    : ${it.name}`);
					if (it.hardware) console.log(`  Hardware: ${it.hardware}`);
					console.log(`  XAddrs  : ${xaddrsStr}`);
				});
				socket.close();
			}, RECEIVE_TIMEOUT);
		}
	});
};

if (LOCAL_BIND_ADDRESS) {
  console.log(`Binding to interface "${TARGET_INTERFACE_NAME}" at ${LOCAL_BIND_ADDRESS}`);
  socket.bind(0, LOCAL_BIND_ADDRESS, onBound);
} else {
  console.warn(`Interface "${TARGET_INTERFACE_NAME}" not found. Binding to default route.`);
  // Bind to wildcard and let OS select default interface
  socket.bind(0, onBound);
}
