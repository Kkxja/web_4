import { Command } from 'commander';

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'шлях до файлу даних')
  .requiredOption('-H, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .option('-o, --output <path>', 'файл, у який записується остання надіслана відповідь');

program.parse();

const options = program.opts();
console.log(options);