const path = require('path');
var fs = require('fs');
const express = require('express');
const app = express();
app.use(express.static('public'))
const port = process.env.PORT || 5501;


app.get('/', function (req, res) {
    console.log(path.join(__dirname, '/index.html'))
    res.sendFile(path.join(__dirname, '/index.html'));
});

app.listen(port);
console.log('Server started at http://localhost:' + port);