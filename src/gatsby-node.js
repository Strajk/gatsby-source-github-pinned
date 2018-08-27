const crypto = require('crypto')
const fetch = require('node-fetch')

const query = {
  query: `query {
  viewer {
    pinnedRepositories(first: 5) {
      nodes {
        id
        name
        description
        isFork
        url
        updatedAt
        parent {
          nameWithOwner
          url
        }
      }
    }
  }}`,
}

exports.sourceNodes = (
  { boundActionCreators, createNodeId },
  configOptions
) => {
  const { createNode } = boundActionCreators

  // Gatsby adds a configOption that's not needed for this plugin, delete it
  delete configOptions.plugins

  // Helper function that processes a pinned repository to match Gatsby's node
  // structure
  const pinnedRepo = repo => {
    const nodeId = createNodeId(`pinned-repo-${repo.id}`)

    // Property parent is reserved for Gatsby nodes
    repo['forkedFrom'] = repo.parent !== null ? repo.parent.nameWithOwner : ''
    repo['forkedUrl'] = repo.parent !== null ? repo.parent.url : ''
    delete repo['parent']

    console.log(repo)

    const nodeContent = JSON.stringify(repo)
    const nodeContentDigest = crypto
      .createHash('md5')
      .update(nodeContent)
      .digest('hex')

    const nodeData = Object.assign({}, repo, {
      id: nodeId,
      parent: null,
      children: [],
      internal: {
        type: `PinnedRepo`,
        content: nodeContent,
        contentDigest: nodeContentDigest,
      },
    })

    console.log(nodeData)

    return nodeData
  }

  return fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${configOptions.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  })
    .then(res => res.json())
    .then(obj =>
      obj.data.viewer.pinnedRepositories.nodes.forEach(repo => {
        //console.log(JSON.stringify(repo))
        const nodeData = pinnedRepo(repo)
        createNode(nodeData)
      })
    )
}
