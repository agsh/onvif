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
    body = reBody.exec(request)[1]
    return res.end() if !body
    command = reCommand.exec(body)[1]
    return res.end() if !command
    switch (command)
      when 'GetCapabilities' then fs.createReadStream(__dirname + '/serverMockup/getCapabilities.xml').pipe(res)
      when 'GetVideoSources' then fs.createReadStream(__dirname + '/serverMockup/getVideoSources.xml').pipe(res)
      when 'GetProfiles' then fs.createReadStream(__dirname + '/serverMockup/getProfiles.xml').pipe(res)
    #res.end(xml)

http
  .createServer listener
  .listen 10101