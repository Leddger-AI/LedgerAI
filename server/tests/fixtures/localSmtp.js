const net = require('node:net');

const server = net.createServer(socket => {
  socket.write('220 localhost ESMTP\r\n');
  let buffer = '';
  let inData = false;
  let recipient = '';
  socket.on('data', chunk => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    for (const line of lines) {
      const command = line.toUpperCase();
      if (inData) {
        if (line === '.') {
          inData = false;
          console.log(`Accepted local test message for ${recipient}`);
          socket.write('250 accepted\r\n');
        }
      } else if (command.startsWith('EHLO') || command.startsWith('HELO')) socket.write('250-localhost\r\n250-AUTH PLAIN LOGIN\r\n250 SIZE 10000000\r\n');
      else if (command.startsWith('AUTH PLAIN')) socket.write('235 authenticated\r\n');
      else if (command.startsWith('AUTH LOGIN')) socket.write('334 VXNlcm5hbWU6\r\n');
      else if (command.startsWith('MAIL FROM')) socket.write('250 ok\r\n');
      else if (command.startsWith('RCPT TO')) { recipient = line.slice(8).trim(); socket.write('250 ok\r\n'); }
      else if (command === 'DATA') { inData = true; socket.write('354 End data\r\n'); }
      else if (command === 'QUIT') { socket.write('221 bye\r\n'); socket.end(); }
      else socket.write('235 authenticated\r\n');
    }
  });
});

server.listen(2525, '127.0.0.1', () => console.log('Fake SMTP listening on 127.0.0.1:2525'));
