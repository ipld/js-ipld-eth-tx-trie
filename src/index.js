'use strict'
const util = require('ipld-eth-trie/src/util.js')
const resolver = require('ipld-eth-trie/src/resolver.js')
const isExternalLink = require('ipld-eth-trie/src/common').isExternalLink
const ipldEthAccountSnapshotResolver = require('ipld-eth-account-snapshot').resolver
const IpfsBlock = require('ipfs-block')

const trieIpldFormat = 'eth-state-trie'
const leafIpldFormat = 'eth-account-snapshot'


exports.util = {
  deserialize: util.deserialize,
  serialize: util.serialize,
  cid: util.cid.bind(null, trieIpldFormat)
}

exports.resolver = {
  multicodec: trieIpldFormat,
  tree: resolver.tree.bind(null, trieIpldFormat),
  resolve: resolve
}

function resolve(block, path, callback){
  resolver.resolve(trieIpldFormat, block, path, (err, result) => {
    if (err) return callback(err)
    if (isExternalLink(result.value) || result.remainderPath.length === 0) {
      return callback(null, result)
    }
    // continue to resolve on node
    let block = new IpfsBlock(result.value)
    ipldEthAccountSnapshotResolver.resolve(block, result.remainderPath, callback)
  })
}