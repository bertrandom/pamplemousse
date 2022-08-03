# pamplemousse

## Introduction

This is a port of [node-config](https://github.com/node-config/node-config) that does hierarchical configuration. It allows you define a set of default values and extend them for different environments. It does not contain all the features of `node-config` but feel free to submit a PR or suggest one to implement.

Features supported:
* JSON and JSON5 parsing formats (JSON5 allows comments)
* [deployments](https://github.com/node-config/node-config/wiki/Configuration-Files#file-load-order), deployment name sourced from NODE_ENV or NODE_CONFIG_ENV
* [custom environment variables](https://github.com/node-config/node-config/wiki/Environment-Variables#custom-environment-variables)
* config.has() and config.get()

Features not supported:
* recursion detection
* YAML, JS, XML, etc. parsing formats
* instance names
* hostnames

## Usage

If you would like to use the default options, simply import your configuration like this:

```
import config from "https://deno.land/x/pamplemousse/mod.ts";
```

And access the config variables using `config.has()` and `config.get()`. Optionally, you can use the shorthand, `config.varname` or `config.nested.varname` but this has no protection for typos.

If you'd like to pass in environment variables via code, for example, if you want to set the NODE_ENV in code, you can do something like this:
```
import config, { loadConfig } from "https://deno.land/x/pamplemousse/mod.ts";
await loadConfig({
    env: {
        "NODE_ENV": "dev",
    }
});
```

When running your app, you must allow read access, like so:

```
deno run --allow-read app.ts
```

If you fail to do so, Deno will prompt you to allow access in the CLI:

```
$ deno run app.ts
⚠️  ️Deno requests read access to <CWD>. Run again with --allow-read to bypass this prompt.
   Allow? [y/n (y = yes allow, n = no deny)]
```

If you don't want to grant access to the whole filesystem, you must at least grant access to `.` so that it can determine the current working directory:
```
deno run --allow-read=. app.ts
```

If you pass in environment variables, you should add `--allow-env` to correctly read them.

You can allow all environment variables:
```
NODE_ENV=staging PORT=8080 deno run --allow-env --allow-read app.ts
```

Or specific ones:
```
NODE_ENV=staging deno run --allow-env=NODE_ENV --allow-read app.ts
```