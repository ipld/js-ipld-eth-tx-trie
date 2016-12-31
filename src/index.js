'use strict'
const async = require('async')
const util = require('ipld-eth-trie/src/util.js')
const resolver = require('ipld-eth-trie/src/resolver.js')
const isExternalLink = require('ipld-eth-trie/src/common').isExternalLink
const IpldEthAccountSnapshotResolver = require('ipld-eth-account-snapshot').resolver
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
  tree: tree,
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
    IpldEthAccountSnapshotResolver.resolve(block, result.remainderPath, callback)
  })
}

function tree(block, options, callback){
  exports.util.deserialize(block.data, (err, trieNode) => {
    if (err) return callback(err)
    // leaf node
    if (trieNode.type === 'leaf') {
      let block = new IpfsBlock(trieNode.getValue())
      IpldEthAccountSnapshotResolver.tree(block, options, (err, paths) => {
        if (err) return next(err)
        callback(null, paths)
      })
      return
    }
    // non-leaf node
    resolver.treeFromObject(trieIpldFormat, trieNode, options, (err, result) => {
      if (err) return callback(err)
      let paths = []
      async.each(result, (child, next) => {
        if (Buffer.isBuffer(child.value)) {
          // node is leaf - continue to tree
          let key = child.key
          let block = new IpfsBlock(child.value)
          IpldEthAccountSnapshotResolver.tree(block, options, (err, subpaths) => {
            if (err) return next(err)
            subpaths.forEach((path) => path.path = key + '/' + path.path)
            paths = paths.concat(subpaths)
          })
        } else {
          // node is non-leaf - add as is
          paths.push(child)
          next()
        }
      }, (err) => {
        if (err) return callback(err)
        callback(null, paths)
      })
    })
  })
}