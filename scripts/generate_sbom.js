import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const allDeps = {
  ...pkg.dependencies,
  ...pkg.devDependencies
};

const components = Object.entries(allDeps).map(([name, version]) => ({
  type: 'library',
  name,
  version: version.replace(/^[\^~]/, ''),
  purl: `pkg:npm/${name}@${version.replace(/^[\^~]/, '')}`,
  scope: pkg.dependencies[name] ? 'required' : 'optional'
}));

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: `urn:uuid:portal-mecatronique-${Date.now()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    component: {
      type: 'application',
      name: 'portail-mecatronique',
      version: '1.0.0',
      description: 'Portail Mécatronique & Espace Habilités'
    },
    tools: [
      {
        vendor: 'Portail DevOps',
        name: 'SBOM Generator',
        version: '1.0.0'
      }
    ]
  },
  components
};

fs.writeFileSync(path.resolve(process.cwd(), 'sbom.json'), JSON.stringify(sbom, null, 2));
console.log(`✓ SBOM généré avec succès dans sbom.json (${components.length} composants inventoriés)`);
