http = require 'http'
fs = require 'fs'
Buffer = (require 'buffer').Buffer
reBody = /<s:Body xmlns:xsi="http:\/\/www.w3.org\/2001\/XMLSchema-instance" xmlns:xsd="http:\/\/www.w3.org\/2001\/XMLSchema">(.*)<\/s:Body>/
reCommand = /<(\S*) /

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
    return res.end() if !command
    fs.createReadStream(__dirname + '/serverMockup/' + command + '.xml').pipe(res)

module.exports = http
  .createServer listener
  .listen process.env.PORT || 10101
