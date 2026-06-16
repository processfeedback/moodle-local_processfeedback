module.exports = function(grunt) {
    const path = require('path');

    const toAmd = (source) => {
        const imports = [];
        let body = source.replace(
            /^import\s+(.+?)\s+from\s+['"]([^'"]+)['"];\s*$/gm,
            (line, specifier, dependency) => {
                const argName = `__dep${imports.length}`;
                const trimmed = specifier.trim();
                const bindings = [];

                if (trimmed.startsWith('{')) {
                    trimmed.slice(1, -1)
                        .split(',')
                        .map((name) => name.trim())
                        .filter(Boolean)
                        .forEach((name) => {
                            const aliasParts = name.split(/\s+as\s+/);
                            const importedName = aliasParts[0].trim();
                            const localName = (aliasParts[1] || aliasParts[0]).trim();
                            bindings.push(`const ${localName} = ${argName}.${importedName};`);
                        });
                } else {
                    bindings.push(`const ${trimmed} = ${argName};`);
                }

                imports.push({dependency, argName, bindings});
                return '';
            }
        );

        const exportedNames = [];
        body = body.replace(
            /^export\s+const\s+([A-Za-z0-9_$]+)\s*=/gm,
            (line, exportName) => {
                exportedNames.push(exportName);
                return `const ${exportName} =`;
            }
        );

        if (!exportedNames.length) {
            throw new Error('Unsupported ESM source: no named exports were found.');
        }

        return [
            `define([${imports.map((item) => `'${item.dependency}'`).join(', ')}], ` +
                `function(${imports.map((item) => item.argName).join(', ')}) {`,
            imports.flatMap((item) => item.bindings).join('\n'),
            body.trim(),
            '',
            `return { ${exportedNames.join(', ')} };`,
            '});',
            '',
        ].filter(Boolean).join('\n');
    };

    const buildAmdFile = (sourcePath) => {
        const source = grunt.file.read(sourcePath);
        const destinationPath = sourcePath
            .replace(/(^|[\\/])src([\\/])/, '$1build$2')
            .replace(/\.js$/, '.min.js');

        grunt.file.write(
            destinationPath,
            /^\s*(import|export)\s+/m.test(source) ? toAmd(source) : source
        );
        grunt.log.writeln(`Built ${path.relative(process.cwd(), destinationPath)}`);
    };

    grunt.registerTask('amd', 'Build Moodle AMD artifacts from amd/src into amd/build.', function() {
        const files = grunt.file.expand({filter: 'isFile'}, 'amd/src/**/*.js');

        if (!files.length) {
            grunt.fail.warn('No AMD source files were found under amd/src/.');
        }

        files.forEach(buildAmdFile);
    });

    grunt.registerTask('default', ['amd']);
};
