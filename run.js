'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const request = require('request-promise');
const fs = require('fs');

const MAX_REQUESTS_PER_PROXY = 10;

const instagramHandles = fs.readFileSync('./instagram-handles.csv').toString().trim().split(',').map(h => _.trim(h, '"'));
const proxiesAvailable = fs.readFileSync('./proxies.csv').toString().trim().split("\n").map(h => h.trim());

const querySingle = (username, proxy) => {
  return request({ url: `http://www.instagram.com/${username}/?__a=1`, proxy })
    .catch(error => {
      // skip if user is not found
      if (error.statusCode !== 404) {
        throw error;
      }
    });
};

const queryChunk = chunk => {
  const proxyPicked = proxiesAvailable.pop();
  if (!proxyPicked) {
    return Promise.reject(new Error('out of proxies'));
  }

  return Promise.all(chunk.map(instagramHandle => querySingle(instagramHandle, proxyPicked)))
    .then(results => {
      return results.filter(r => !!r);
    })
};

const handlesToProcess = instagramHandles.slice(0, MAX_REQUESTS_PER_PROXY * proxiesAvailable.length);
Promise.map(_.chunk(handlesToProcess, MAX_REQUESTS_PER_PROXY), queryChunk)
  .then(_.flattenDeep)
  .then(results => console.log(`successfully fetched ${results.length} results`))
  .catch(console.error.bind(console));
