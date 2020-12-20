const swaggerUI = require('swagger-ui-express')
const yaml = require('yamljs')
const path = require('path')
const swaggerDocument = yaml.load(path.resolve( 'docs', 'swagger.yaml'))
const express = require('express')
const router = express.Router()

/**
 * @endpoint - Documents swagger
 */
router.get('/',swaggerUI.setup(swaggerDocument))

module.exports = router