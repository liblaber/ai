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
    return;
  }

  console.log('# NOTICE\n');
  console.log(
    'This project incorporates third-party software components that are distributed under various open source licenses.\n',
  );
  console.log('## Third-Party Dependencies:');
  console.log('This software contains components from the following third-party libraries:\n');

  Object.entries(packages).forEach(([pkg, info]) => {
    // Trim the package name at the last '@'
    const trimmedPkg = pkg.lastIndexOf('@') > 0 ? pkg.substring(0, pkg.lastIndexOf('@')) : pkg;

    // Check if there is any license text (there should be)
    if (info.licenseText) {
      // Extract only the line starting with "Copyright"
      const copyrightLine = info.licenseText.split('\n').find((line) => line.match(/Copyright|©/i));

      // For BSD-x licenses, we need to include the full license text
      const licensesStr = Array.isArray(info.licenses) ? info.licenses.join(', ') : info.licenses || 'Unknown';

      if (licensesStr.substring(0, 3) === 'BSD') {
        console.log(`### ${trimmedPkg}:`);
        console.log(`${licensesStr} LICENSE:\n${info.licenseText}\n`);
      } else {
        console.log(`### ${trimmedPkg}\nLicense: ${licensesStr} - ${copyrightLine || 'No copyright found'}\n`);
      }
    }
  });
});
