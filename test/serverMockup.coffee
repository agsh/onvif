http = require 'http'
dgram = require 'dgram'
xml2js = require 'xml2js'
fs = require 'fs'
Buffer = (require 'buffer').Buffer
template = (require 'dot').template
reBody = /<s:Body xmlns:xsi="http:\/\/www.w3.org\/2001\/XMLSchema-instance" xmlns:xsd="http:\/\/www.w3.org\/2001\/XMLSchema">(.*)<\/s:Body>/
reCommand = /<(\S*) /
reNS = /xmlns="http:\/\/www.onvif.org\/\S*\/(\S*)\/wsdl"/
__xmldir = __dirname + '/serverMockup/'
conf = {
  port: process.env.PORT || 10101 # server port
  hostname: process.env.HOSTNAME || 'localhost'
  pullPointUrl: '/onvif/subscription?Idx=6'
}

verbose = process.env.VERBOSE || false

listener = (req, res) ->
  req.setEncoding('utf8')
  buf = []
  req.on 'data', (chunk) ->
    buf.push chunk
  req.on 'end', () ->
    if (Buffer.isBuffer(buf)) # Node.js > 0.12 fix when `data` event produces strings instead of Buffer
      request = Buffer.concat buf
    else
      request = buf.join('')
    # Find body and command name
    body = reBody.exec(request)
    return res.end() if !body
    body = body[1]
    command = reCommand.exec(body)[1]
    return res.end() if !command
    # Look for ONVIF namespaces
    onvifNamespaces = reNS.exec(body)
    ns = ''
    if (onvifNamespaces)
      ns = onvifNamespaces[1]
    if verbose
      console.log 'received', ns, command
    switch
      when fs.existsSync(__xmldir + ns + '.' + command + '.xml') then command = ns + '.' + command
      when not fs.existsSync(__xmldir + command + '.xml') then command = 'Error'
    fileName = __xmldir + command + '.xml'
    if verbose
      console.log 'serving', fileName
    #fs.createReadStream(__dirname + '/serverMockup/' + command + '.xml').pipe(res)
    res.setHeader('Content-Type', 'application/soap+xml;charset=UTF-8')
    res.end(template(fs.readFileSync(fileName))(conf))

# Discovery service
discoverReply = dgram.createSocket('udp4')
discover = dgram.createSocket('udp4')
discover.on 'error', (err) -> throw err
discover.on 'message', (msg, rinfo) ->
  if verbose
    console.log 'Discovery received'
  #Extract MessageTo from the XML. xml2ns options remove the namespace tags and ensure element character content is accessed with '_'
  xml2js.parseString msg.toString(), { explicitCharkey:true, tagNameProcessors: [xml2js.processors.stripPrefix]}, (err, result) ->
    msgId = result.Envelope.Header[0].MessageID[0]._
    discoverMsg = Buffer.from(fs
       .readFileSync __xmldir + 'Probe.xml'
       .toString()
       .replace 'RELATES_TO', msgId
       .replace 'SERVICE_URI', 'http://' + conf.hostname + ':' + conf.port + '/onvif/device_service'
    )
    switch msgId
      # Wrong message test
      when 'urn:uuid:e7707'
        discoverReply.send (Buffer.from 'lollipop'), 0, 8, rinfo.port, rinfo.address
      # Double sending test
      when 'urn:uuid:d0-61e'
        discoverReply.send discoverMsg, 0, discoverMsg.length, rinfo.port, rinfo.address
        discoverReply.send discoverMsg, 0, discoverMsg.length, rinfo.port, rinfo.address
      # Discovery test
      else
        discoverReply.send discoverMsg, 0, discoverMsg.length, rinfo.port, rinfo.address

if process.platform != 'win32'
  if verbose
    console.log 'Listening for Discovery Messages on Port 3702'
  discover.bind 3702, () ->
    discover.addMembership '239.255.255.250'

server = http
  .createServer listener
  .listen conf.port

close = () ->
  discover.close()
  discoverReply.close()
  server.close()
  if verbose
    console.log 'Closing ServerMockup'


module.exports = {
  server: server
  , conf: conf
  , discover: discover
  , close: close
}
