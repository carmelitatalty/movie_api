
const aws_s3 = require('./aws-s3.js')
const fs = require("fs")

// aws_s3.uploadImage('/tmp/dune.jpg', '2-6-images', 'dune-temp.jpg', null)
const fileContent = fs.readFileSync(tempPath);
aws_s3.put(fileContent, '2-6-images', 'dune-temp.jpg', null)