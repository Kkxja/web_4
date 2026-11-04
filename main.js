import { Command } from 'commander';
import fs from 'node:fs';
import http from 'node:http';

const program = new Command();

program.helpOption('--help', 'показати довідку');

program
  .requiredOption('-i, --input <path>', 'шлях до файлу даних')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .option('-o, --output <path>', 'файл, у який записується остання надіслана відповідь');

program.parse();

const options = program.opts();

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, JSON.stringify({ error: message }));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname !== '/') {
    sendError(res, 404, 'Маршрут не знайдено');
    return;
  }

  fs.readFile(options.input, 'utf-8', (err, raw) => {
    if (err) {
      sendError(res, 500, 'Не вдалося прочитати файл даних');
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      sendError(res, 500, 'Файл даних пошкоджено: некоректний JSON');
      return;
    }

    sendJson(res, 200, JSON.stringify(data));
  });
});



fs.access(options.input, fs.constants.F_OK, (err) => {
  if (err) {
    console.error('Cannot find input file');
    process.exit(1);
  }

  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);
  });
});