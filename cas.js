"use strict";

const path  = require('path');
const fs    = require('fs');

const md5   = require('nyks/crypto/md5');
const mkdirpSync = require('nyks/fs/mkdirpSync');

const {stringify} = require('yaml');
const yamlStyle = {singleQuote : false, lineWidth : 0};


class Cas {

  constructor(wd = null) {
    this.store = {};
    this.wd    = wd;
  }

  write() {
    mkdirpSync(this.wd);

    for(let [cas_path, cas_content] of Object.entries(this.store)) {
      if(!fs.existsSync(cas_path))
        fs.writeFileSync(cas_path, cas_content);
    }
  }


  feed(contents) {
    let hash     = md5(contents);
    let cas_path = path.posix.join(this.wd, hash);
    this.store[cas_path] = contents;
    return {hash, cas_path};
  }

  async env(env_file, source_file) {
    let wd = path.dirname(source_file);
    let file_path = path.join(wd, env_file);
    let body = fs.readFileSync(file_path, 'utf-8');
    let {cas_path} = this.feed(body);
    return cas_path;
  }



  // import
  async config(config_name, config, source_file) {
    let config_body;
    let {file, contents, format, 'x-trace' : trace = true} = config;

    if(file) {
      let wd = path.dirname(source_file);
      let file_path = path.join(wd, file);
      config_body = fs.readFileSync(file_path, 'utf-8');
      if(trace)
        trace = config_body;
    }

    if(contents) {
      if(format == "json")
        config_body = JSON.stringify(contents, null, 2);
      else if(format == "yaml")
        config_body = stringify(contents, yamlStyle);
      else
        config_body = String(contents);

      if(trace)
        trace = contents;
    }

    if(config_body == undefined)
      throw `No body for config '${config_name}'`;


    let {hash, cas_path} = this.feed(config_body);
    let cas_name = config_name + '-' + hash.substr(0, 5);

    return {hash, cas_path, cas_name, trace};
  }

}

module.exports = Cas;
