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

function toNumber(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }
    return null;
}

function buildResult(records, showPayment, minValue) {
    const result = [];

    for (const record of records) {
        const value = toNumber(record?.Booking_Value);

        if (minValue !== null && !(value !== null && value > minValue)) {
            continue;
        }

        const item = {
            booking_id: record?.Booking_ID ?? null,
            vehicle_type: record?.Vehicle_Type ?? null,
            booking_value: value,
        };

        if (showPayment) {
            item.payment_method = record?.Payment_Method ?? null;
        }

        result.push(item);
    }

     return result;
}

const server = http.createServer((req, res) => {
    let url;
    try {
        url = new URL(req.url, 'http://localhost');
    } catch {
        sendError(res, 400, 'Некоректна адреса запиту');
        return;
    }

    if (url.pathname !== '/') {
    sendError(res, 404, 'Маршрут не знайдено');
    return;
    }

    const showPayment = url.searchParams.get('payment') === 'true';

    let minValue = null;
    if (url.searchParams.has('min_value')) {
    minValue = toNumber(url.searchParams.get('min_value'));
        if (minValue === null) {
        sendError(res, 400, 'Параметр min_value має бути числом');
        return;
        }
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

    if (!Array.isArray(data)) {
        sendError(res, 500, 'Файл даних має містити масив записів');
        return;
    }

    const body = JSON.stringify(buildResult(data, showPayment, minValue));

    if (!options.output) {
        sendJson(res, 200, body);
        return;
    }

    fs.writeFile(options.output, body, 'utf-8', (writeErr) => {
        if (writeErr) {
            sendError(res, 500, 'Не вдалося записати у вихідний файл');
            return;
        }
        sendJson(res, 200, body);
    });
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