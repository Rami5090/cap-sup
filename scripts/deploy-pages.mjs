// Construit l'application et publie dist/ sur la branche gh-pages du dépôt (GitHub Pages).
// Usage : npm run deploy
import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

// Pas de shell (les arguments contiennent des espaces), sauf pour npm qui est un script .cmd sous Windows.
function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: opts.capture ? 'pipe' : 'inherit', encoding: 'utf8', shell: false, ...opts });
  if (res.status !== 0) {
    if (opts.allowFail) return null;
    throw new Error(`Échec : ${cmd} ${args.join(' ')}`);
  }
  return (res.stdout ?? '').trim();
}

const remote = run('git', ['remote', 'get-url', 'origin'], { cwd: ROOT, capture: true });
const sha = run('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, capture: true });

console.log('1/3 Construction de la version de production…');
run('npm run build', [], { cwd: ROOT, shell: true });
writeFileSync(join(DIST, '.nojekyll'), ''); // fichiers servis tels quels par GitHub Pages

console.log('2/3 Préparation de la branche gh-pages…');
rmSync(join(DIST, '.git'), { recursive: true, force: true });
run('git', ['init', '-q', '-b', 'gh-pages'], { cwd: DIST });
run('git', ['add', '-A'], { cwd: DIST });
const name = run('git', ['config', 'user.name'], { cwd: ROOT, capture: true, allowFail: true }) || 'Cap Sup';
const email = run('git', ['config', 'user.email'], { cwd: ROOT, capture: true, allowFail: true }) || 'cap-sup@users.noreply.github.com';
run('git', ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-q', '-m', `Déploiement de ${sha}`], { cwd: DIST });

console.log('3/3 Envoi vers GitHub Pages…');
// Si GitHub CLI est installé et connecté, il fournit les identifiants pour cet envoi uniquement.
const hasGh = run('gh', ['auth', 'status'], { capture: true, allowFail: true }) !== null;
const auth = hasGh ? ['-c', 'credential.helper=', '-c', 'credential.helper=!gh auth git-credential'] : [];
run('git', [...auth, 'push', '-q', '--force', remote, 'gh-pages'], { cwd: DIST });
rmSync(join(DIST, '.git'), { recursive: true, force: true });

console.log('Terminé : la branche gh-pages est à jour. Le site se met à jour en une à deux minutes.');
