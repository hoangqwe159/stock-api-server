var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken')

/**
 * @endpoint - /stocks/symbols
 * Get all symbols
 */
const getSymbols = (req, res, next) => {
    let query = req.query
    if(Object.keys(query).length === 0){
        req.db.from('stocks').select('name', 'symbol', 'industry').distinct()
        .then((rows) => {
            res.status(200).json(rows)
        })
        .catch((err) => {
            res.status(404).json({"error" : true, "message": "Error in MySQL query"})
        })
    } else {
        if((Object.keys(query).length === 1) && query.industry !== undefined && query.industry.trim() !== ''){
            req.db.from('stocks').select('name','symbol','industry').where('industry', 'rlike', query.industry).distinct()
                .then((rows) => {
                if(rows.length === 0){
                    res.status(404).json({"error" : true, "message": "Industry not found"})
                }else{
                    res.status(200).json(rows)
                }
                })
                .catch((err) => {
                    res.status(404).json({"error" : true, "message": "Error in MySQL query"})
                })    
        } else {
            res.status(400).json({"error" : true, "message": "Invalid query parameter: only 'industry' is permitted"})
        }
    }
}

/**
 * @endpoint - /stocks/{symbol}, /stocks/auth/{symbol}
 * Check if symbol is valid
 */
const checkSymbol = (req, res, next) => {
    let params = req.params;
    if(Object.keys(params).length === 0){ 
        res.status(404).json({"error": true, "message": "Not found"})
    }else{      
        let symbolSize = params.symbol.length;
        if(params.symbol !== params.symbol.toUpperCase() || symbolSize < 1 || symbolSize > 5){
            res.status(400).json({"error" : true, "message": "Stock symbol incorrect format - must be 1-5 capital letters"})
        }else{
            next()
        }
    }
      
}

/**
 * 
 * @endpoint - /stocks/{symbol}
 * Get the most recent symbol
 */
const getSymbol = (req, res, next) => {
    let query = req.query;    
    if(query["from"] !== undefined || query["to"] !== undefined ){
        res.status(400).json({"error" : true, "message": "Date parameters only available on authenticated route /stocks/authed"})
    }else{
        const symbol = req.params.symbol
        req.db.from('stocks').select('*').where({symbol: symbol}).orderBy('timestamp', 'desc').limit(1)
        .then((rows) => {
            if(rows.length === 0){
                res.status(404).json({"error" : true, "message": "No entry for symbol in stocks database"})
            }else{
            res.status(200).json(rows[0])
            }
        })
        .catch((err) => {
            res.status(404).json({"error" : true, "message": "Error in MySQL query"})
        })
    }
}

/**
 * @endpoint - /stocks/auth/{symbol}
 * Authorize token 
 */
const authorizeToken = (req, res, next) => {
    const authorization = req.headers.authorization   
    
    

    if(authorization && authorization.split(' ').length === 2){
               
        try{
            const token = authorization.split(' ')[1] 
          const secretKey = process.env.SECRET_KEY;
          const decoded = jwt.verify(token, secretKey);
          if(decoded.exp > Date.now()){
            res.status(403).json({"error": true, "message": "Token has expired"})
          }else{
            next()
          }
        }catch(e){            
            res.status(403).json({"error": true, "message": "jwt malformed"})
        }
    }else{
        res.status(403).json({"error": true, "message": "Authorization header not found"})        
    }
}

/**
 * @endpoint - /stocks/auth/{symbol}
 * Check if query is valid 
 */
const checkQuery = (req, res, next) => {
    let query = req.query;
    let queryLength = Object.keys(query).length;    
    if(queryLength === 0){
        next()
    } else if (!('from' in query) && !('to' in query)) {                
        res.status(400).json({"error" : true, "message": "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15"})
    } else {
        /*Validate date */        
        const {from, to} = query     
        if (from !== undefined) {
            if (to !== undefined) {
                if(isNaN(Date.parse(to))) {
                    res.status(400).json({"error":true, "message": "To date cannot be parsed by Date.parse()"})
                } else if (isNaN(Date.parse(from))) {
                    res.status(400).json({"error":true, "message": "From date cannot be parsed by Date.parse()"})
                } else {
                    next()
                }
            } else {
                if (isNaN(Date.parse(from))) {
                    res.status(400).json({"error":true, "message": "From date cannot be parsed by Date.parse()"})
                } else {
                    next()
                }        
            }            
        } else {
            if(isNaN(Date.parse(to))) {
                res.status(400).json({"error":true, "message": "To date cannot be parsed by Date.parse()"})
            } else {
                next()
            }
        }
    }
}

/**
 * @endpoint - /stocks/auth/{symbol}
 * Get price history of the symbol 
 */
const getPriceHistory = (req, res, next) => {
  const {from, to} = req.query
  const symbol = req.params.symbol    
  req.db.from('stocks').select('*').where({symbol: symbol}).orderBy('timestamp', 'desc')
   .then((rows) => {
     if(rows.length === 0){
      res.status(404).json({"error": true, "message": "No entry for symbol in stocks database"})
     }else{      
      if(to === undefined && from === undefined){
        res.status(200).json(rows[0])
      }else {
        var currentDate = new Date().getTime()
        var fromDate = (from === undefined) ? 0 : Date.parse(from)
        var toDate = (to === undefined) ? currentDate : Date.parse(to)
        var result = rows.filter((stock) => {
          const timestamp = new Date(stock.timestamp).getTime()
          return timestamp >= fromDate && timestamp <= toDate
        })
        if(result.length === 0){
          res.status(404).json({"error": true, "message": "No entries available for query symbol for supplied date range"})
        }else{
          res.status(200).json(result)
        }
      }
     }
   })
   .catch((err) => {
      res.status(404).json({"error": true, "message": "Error in MySQL database"})
   })  
}

/**
 * @endpoint - /stocks/symbols
 */
router.get('/symbols', getSymbols);

/**
 * @endpoint - /stocks/{symbol}
 */
router.get('/:symbol', checkSymbol, getSymbol);

/**
 * @endpoint - /stocks/auth/{symbol}
 */
router.get('/authed/:symbol', authorizeToken, checkSymbol, checkQuery, getPriceHistory)

module.exports = router;