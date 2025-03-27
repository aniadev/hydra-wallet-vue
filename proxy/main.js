/* eslint-disable @typescript-eslint/no-require-imports */

const { default: axios } = require('axios')
const express = require('express')
const cors = require('cors')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// allow cors from "*"
app.use(
  cors({
    origin: '*' // allow all
  })
)
/**
 *
 * @param {import('express').Request} req
 * @param {*} res
 * @param {*} next
 */
function handler(req, res, next) {
  console.log(req.path)
  next()
}

const PORT = process.env.PORT || 3002
const PROXY_HOST = 'localhost'

app.post('/', async (req, res) => {
  const bodyData = req.body
  const { method, proxyUrl, url, body, params } = bodyData

  if (!proxyUrl) {
    res.json({
      status: 'error',
      message: 'proxyUrl is required'
    })
  }

  try {
    const rs = await axios({
      method: method || 'GET',
      baseURL: proxyUrl,
      url,
      ...(body ? { data: body } : {}),
      ...(params ? { params: params } : {})
    })
    if (!rs.data) {
      throw new Error('No data')
    }
    console.log(rs.config)
    res.json({
      status: 'success',
      data: rs.data
    })
  } catch (err) {
    res.status(400)
    res.json({
      status: 'error',
      message: err
    })
  }
})

app.listen(PORT, () => {
  console.log('Proxy listening on port:', PORT, ', target: ', process.env.CARDANO_NODE_PROXY_URL)
})
