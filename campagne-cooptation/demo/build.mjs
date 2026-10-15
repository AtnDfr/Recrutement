/**
 * Construit la démo navigable dans demo/dist (index.html + app.js + carte-cooptation.json).
 * Prérequis : `heft build` (la démo réutilise lib/, sortie compilée de la web part).
 *   node demo/build.mjs           construit
 *   node demo/build.mjs --serve   construit et sert sur http://localhost:8080
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(ici, 'dist');
fs.mkdirSync(dist, { recursive: true });

// Les feuilles SCSS de la web part sont compilées par heft en *.module.scss.css.
// Hors SharePoint, on remplace les jetons de thème par leur valeur par défaut.
const scssModules = {
  name: 'scss-modules',
  setup(build) {
    build.onResolve({ filter: /\.module\.scss$/ }, args => ({
      path: path.join(args.resolveDir, `${args.path}.css`),
      namespace: 'scss-module'
    }));
    build.onLoad({ filter: /.*/, namespace: 'scss-module' }, args => {
      const css = fs.readFileSync(args.path, 'utf8').replace(/"\[theme:[^,\]]+,\s*default:\s*([^\]]+)\]"/g, '$1')
        // Sélecteurs :global des modules CSS (gérés par webpack dans SPFx).
        .replace(/:global\(([^)]+)\)/g, '$1')
        .replace(/:global\s+/g, '');
      return {
        contents:
          `const s = document.createElement('style'); s.textContent = ${JSON.stringify(css)}; document.head.appendChild(s);\n` +
          'export default new Proxy({}, { get: (_, nom) => nom });',
        loader: 'js'
      };
    });
  }
};

const options = {
  entryPoints: [path.join(ici, 'main.tsx')],
  bundle: true,
  minify: true,
  outfile: path.join(dist, 'app.js'),
  plugins: [scssModules],
  jsx: 'transform',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info'
};

// Le modèle unique de carte est publié à côté de la page et lu à l'exécution, comme dans SharePoint.
fs.copyFileSync(path.join(ici, '..', 'modeles', 'carte-cooptation.json'), path.join(dist, 'carte-cooptation.json'));

const page = fs.readFileSync(path.join(ici, 'index.html'), 'utf8');
fs.writeFileSync(
  path.join(dist, 'index.html'),
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n${page}\n</head></html>\n`
);

if (process.argv.includes('--serve')) {
  const ctx = await esbuild.context(options);
  const { port } = await ctx.serve({ servedir: dist, port: 8080 });
  console.log(`Démo : http://localhost:${port}`);
} else {
  await esbuild.build(options);
}
