#!/usr/bin/env node
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const HTMLParser = require('node-html-parser');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const packageJson = require(path.join(path.resolve(__dirname, '..'), 'package.json'));
const optionDefinition = [
  { name: 'sourceFile', alias: 's', type: String },
  { name: 'dry-run', type: Boolean },
  { name: 'inputYaml', alias: 'i', type: String },
  { name: 'help', alias: 'h', type: Boolean },
];
const section = [
  { header: packageJson.name, content: packageJson.description },
  { header: 'Options', optionList: optionDefinition },
]
const options = commandLineArgs(optionDefinition);

if (options.help) {
  console.log(commandLineUsage(section));
  process.exit(0);
}
if (!options.inputYaml) {
  console.error('ERROR: input yaml file not found');
  process.exit(1);
}
if (!options.sourceFile) {
  console.error('ERROR: source file not found');
  process.exit(1);
}

const inputFile = options.inputYaml;
const sourceFile = options.sourceFile;
const regDelimitter = /{{.*}}/g;

const deepFind = (obj, path) => {
  const paths = path.split('.');
  let current = obj;

  for (let i = 0; i < paths.length; i++) {
    if (current[paths[i]] === undefined) return undefined;
    else current = current[paths[i]];
  }
  return current;
};
try {
  const doc = yaml.safeLoad(fs.readFileSync(inputFile, 'utf8'));
  const source = HTMLParser.parse(fs.readFileSync(sourceFile, 'utf8'));
  doc.use_language.forEach((lang) => {
    const result = source.toString().replace(regDelimitter, (v, _idx, _input) => {
      const key = v.replace(/{{/, '').replace(/}}/, '').trim();
      if (key === 'use_language') return `"${lang}"`;
      const r = deepFind(doc, `${key}.${lang}`);
      return r;
    });
    const doctype = '<!DOCTYPE html>\n'
    if (options['dry-run']) console.log(doctype + result);
    else {
      const ext = path.extname(sourceFile);
      fs.writeFileSync(`docs/${path.basename(sourceFile, ext)}.${lang}${ext}`, doctype + result);
    }
  });
} catch(e) {
  console.error(`ERROR: ${e}`);
}
