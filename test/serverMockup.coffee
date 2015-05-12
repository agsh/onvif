http = require 'http'
dgram = require 'dgram'
fs = require 'fs'
Buffer = (require 'buffer').Buffer
reBody = /<s:Body xmlns:xsi="http:\/\/www.w3.org\/2001\/XMLSchema-instance" xmlns:xsd="http:\/\/www.w3.org\/2001\/XMLSchema">(.*)<\/s:Body>/
reCommand = /<(\S*) /
reNS = /xmlns="http:\/\/www.onvif.org\/\S*\/(\S*)\/wsdl"/

listener = (req, res) ->
  req.setEncoding('utf8')
  buf = []
  req.on 'data', (chunk) ->
    buf.push chunk
  req.on 'end', () ->
    request = Buffer.concat buf
    body = reBody.exec(request)
    return res.end() if !body
    body = body[1]
    command = reCommand.exec(body)[1]
    ns = reNS.exec(body)[1]
    return res.end() if !command
    switch
      when fs.existsSync(__dirname + '/serverMockup/' + ns + '.' + command + '.xml') then command = ns + '.' + command
      when not fs.existsSync(__dirname + '/serverMockup/' + command + '.xml') then command = 'Error'
    fs.createReadStream(__dirname + '/serverMockup/' + command + '.xml').pipe(res)

discover = dgram.createSocket('udp4')
discover.msg =
  new Buffer(fs
    .readFileSync __dirname + '/serverMockup/Probe.xml'
    .toString()
    .replace 'SERVICE_URI', 'http://localhost:' + (process.env.PORT || 10101) + '/onvif/device_service'
  )
discover.on 'error', (err) -> throw err
discover.on 'message', (msg, rinfo) ->
  msgId = /urn:uuid:([0-9a-f\-]+)</.exec(msg.toString())[1]
  if msgId
    switch msgId
      when 'e7707' then discover.send (new Buffer 'lollipop'), 0, 8, rinfo.port, rinfo.address
      when 'd0-61e'
        discover.send discover.msg, 0, discover.msg.length, rinfo.port, rinfo.address
        discover.send discover.msg, 0, discover.msg.length, rinfo.port, rinfo.address
      else
        discover.send discover.msg, 0, discover.msg.length, rinfo.port, rinfo.address

discover.bind 3702, () ->
  discover.addMembership '239.255.255.250'

module.exports = http
  .createServer listener
  .listen process.env.PORT || 10101
