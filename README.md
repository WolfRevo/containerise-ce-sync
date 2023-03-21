# Private fork to enable FF sync on the latest release from nwg. Use on your own Risk!

# Transistion from nwg/containerise-ce

Please do a manual transition, means: export your rules you created in nwg/containerise-ce (using copy&paste) and import it to this addon as they don't know each others store (by intention).

# Firefox sync

If you switch between local storage and Firefox sync in the addon settings it will automatically take over from that one you switch from, e.g. if you have sync enabled and create rules and you switch off sync the rules will be taken over into the local storage. 

# Important: please restart Firefox first after you changed the sync setting!

Firefox extension to automatically open websites in a container

|![](https://raw.githubusercontent.com/kintesh/containerise/master/static/screenshots/1.png)  |  ![](https://raw.githubusercontent.com/kintesh/containerise/master/static/screenshots/2.png)  |  ![](https://raw.githubusercontent.com/kintesh/containerise/master/static/screenshots/3.png)  |  ![](https://raw.githubusercontent.com/kintesh/containerise/master/static/screenshots/4.png)|
| --- | --- | --- | --- |
|Select your container and add a domain to always open all visits in the chosen container. | Add many domains as you wish. | Special `No Container` option to break out of a container. | Simple CSV based mapping of a domain to a container by name for easy backup and bulk editing. |


# Installation
Install the latest release for Firefox from [AMO](https://addons.mozilla.org/de/firefox/addon/containerise-ce-sync/)



# Usage

## Basic mapping

`amazon.co.uk, Shopping` will open all amazon.co.uk (not subdomains) links in Shopping container.

## Glob
`!*.amazon.co.uk, Shopping`  will be treated as `*.amazon.co.uk` glob pattern. (suitable to subdomains)

## Regex

`@.+\.amazon\.co\.uk, Shopping` will be treated as `.+\.amazon\.co\.uk` regex. (suitable to subdomains and complex paths)



# Development

## Available Scripts
In the project directory, you can run:

#### `npm ci`
Installs required dependencies. 

#### `npm run webpack`
Starts webpack with `--watch` option and outputs to `./build` directory.
 
#### `npm run build`
Builds the extension for production use.<br>

#### `npm run test`
Runs test specs using jest.
Use `test:watch` to watch for edits and re-run the tests.

#### `npm run lint`
Lint using eslint.

#### `npm run web-ext`
Runs web-ext process to debug the extension on Firefox. See [web-ext docs](https://github.com/mozilla/web-ext) <br/>
To live reload the extension, start this process in a new tab after starting `npm run webpack` process.
