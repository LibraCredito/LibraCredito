import { readFile, writeFile } from 'fs/promises';
import Critters from 'critters';

const critters = new Critters({
  path: 'dist'
});

const html = await readFile('dist/index.html', 'utf8');
const moduleScripts = html.match(/<script[^>]*type="module"[^>]*><\/script>/g) ?? [];

let processed = await critters.process(html);

// O Critters pode remover indevidamente o script de entrada em alguns cenários.
// Se isso acontecer, restauramos os scripts module originais para garantir o boot da aplicação SPA.
if (moduleScripts.length > 0 && !/type="module"/.test(processed)) {
  const scriptsToRestore = moduleScripts.join('\n');
  processed = processed.replace('</body>', `${scriptsToRestore}\n</body>`);
}

await writeFile('dist/index.html', processed);
