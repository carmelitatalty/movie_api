
const aws_s3 = require('./aws-s3.js')
const fs = require("fs")

const BUCKET_NAME = '2-6-images';
const FILE_NAME = '/tmp/dune.jpg'
// aws_s3.uploadImage('/tmp/dune.jpg', '2-6-images', 'dune-temp.jpg', null)
const fileContent = fs.readFileSync(FILE_NAME);
await aws_s3.put(fileContent, BUCKET_NAME, 'put-dune-temp.jpg', null)

const result = await aws_s3.upload('upload-dune-temp.jpg', BUCKET_NAME, FILE_NAME)
console.log(JSON.stringify(result))

aws_s3.uploadImage(FILE_NAME, BUCKET_NAME, 'upload-image-dune-temp.jpg', null);