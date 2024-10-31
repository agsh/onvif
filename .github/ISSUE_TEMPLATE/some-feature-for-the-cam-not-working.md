---
name: Some feature for the cam not working
about: Create a report to help us improve
title: ''
labels: ''
assignees: ''

---

**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Simplified source code.

**Debug SOAP-messages for request and response**
For getting logs you can use this template:
```js
const onvif = require('onvif/promises');
const cam = new onvif.Cam({...connect_options});

(async() => {
	await cam.connect();
	cam.on('rawRequest', console.log);
	cam.on('rawResponse', console.log);
	await cam['called_method']({...method_options});
})().catch(console.error);
```

**Capabilities information:**
JSON that you can get by running GetServiceCapabilities: 
```js 
console.log(await cam.getServiceCapabilities());
```

**Information (please complete the following information):**
 - Device manufacturer
 - Device model
 - Firmware version
 - Node.js version 

**Additional context**
Add any other context about the problem here.
