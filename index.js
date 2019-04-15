var http = require('http');
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer({});
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

var serve = serveStatic('build', {'index': ['index.html', 'index.htm']})

proxy.on('error', function (err, req, res) {
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });

  res.end('Something went wrong');
});

proxy.on('proxyRes', function(proxyRes, req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With");
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
});

http.createServer(function(req, res) {
  if(req.url.match(/^\/census/g)) {
    proxy.web(req, res, { target: 'http://localhost:9631', proxyTimeout: 1000, timeout: 1000 });
    return
  }
  var done = finalhandler(req, res);
  serve(req, res, done);
}).listen(process.env.PORT || 3000);
