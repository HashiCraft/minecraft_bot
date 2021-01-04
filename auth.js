module.exports = function (req, res, next) {

  const authToken = req.headers['authorization'] || ''
  const parts = authToken.split(' ')

  if(parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || parts[1] !== process.env.API_KEY) {
    res.status(401)
    res.send({message: 'Please specify the API token'})
    console.log('authentication error')
    return
  }

  console.log('authenticated')
  next()
}
