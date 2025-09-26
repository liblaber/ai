// Automatically generates a NOTICE.md file with license information for third-party dependencies.
// Uses the package.json and node_modules to gather license info.
// Note: This only includes production dependencies (no devDependencies) since others are not necessary.
import * as checker from 'license-checker';

interface InitOpts {
  start: string;
  production?: boolean;
  direct?: boolean;
  customFormat?: Record<string, any>;
}

interface ModuleInfo {
  name?: string;
  version?: string;
  licenses?: string | string[];
  licenseText?: string;
}

interface ModuleInfos {
  [packageName: string]: ModuleInfo;
}

const options: InitOpts = {
  start: './',
  production: true,
  direct: true,
  customFormat: {
    name: '',
    version: '',
    licenses: '',
    licenseText: '',
  },
};

checker.init(options, (err: Error, packages: ModuleInfos) => {
  if (err) {
    console.error('Error checking licenses:', err);
    process.exit(1);
  }

  console.log('# NOTICE\n');
  console.log('This software contains components from the following third-party libraries:\n');

  Object.entries(packages).forEach(([pkg, info]) => {
    // Trim the package name at the last '@'
    const trimmedPkg = pkg.lastIndexOf('@') > 0 ? pkg.substring(0, pkg.lastIndexOf('@')) : pkg;

    // Check if there is any license text (there should be)
    if (info.licenseText) {
      // Extract only the line starting with "Copyright"
      const copyrightLine = info.licenseText.split('\n').find((line) => line.startsWith('Copyright'));

      // For BSD-x licenses, we need to include the full license text
      const licensesStr = Array.isArray(info.licenses) ? info.licenses.join(', ') : info.licenses || 'Unknown';

      if (licensesStr.startsWith('BSD')) {
        console.log(`**${trimmedPkg}:** (BSD License)`);
        console.log(`${info.licenseText}\n`);
      } else if (licensesStr.startsWith('Apache')) {
        console.log(`**${trimmedPkg}** (Apache License)`);

        // Remove copyright line if it was just part of the template (it would have 'yyyy' in the template)
        if (copyrightLine && copyrightLine.search('yyyy') === -1) {
          // Add other licenses like || licensesStr.startsWith('MIT') if needed
          console.log(`${copyrightLine || '\n'}\n`);
        }
      }
    }
  });

  // Add on notices

  // Iconsax icons (free license unless commercial use)
  console.log('\nThis project utilizes icons provided by Iconsax https://iconsax.io (Proprietary Free License).\n');
});
