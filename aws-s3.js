const {
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    PutObjectCommand,
    S3Client,
  } = require("@aws-sdk/client-s3");
  const fs = require("fs")
  
  const twentyFiveMB = 25 * 1024 * 1024;
  
//   export const createString = (size = twentyFiveMB) => {
//     return "x".repeat(size);
//   };
  
const s3Client = new S3Client({
    region: "us-west-2",
    
});

   const upload = async (key, bucketName, tempPath) => {
    console.log(`Uploading ${tempPath} to ${bucketName} as ${key}`)
    // const bucketName = "test-bucket";
    // const str = createString();
    // const buffer = Buffer.from(str, "utf8");
    const fileContent = fs.readFileSync(tempPath);
  
    let uploadId;
  
    try {
      const multipartUpload = await s3Client.send(
        new CreateMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
        }),
      ).catch(e => {
        console.log('Could not create multiparet upload')
        console.log(e)
      });
  
      uploadId = multipartUpload.UploadId;
      console.log(`UploadId: ${uploadId}`)
  
      const uploadPromises = [];
      // Multipart uploads require a minimum size of 5 MB per part.
      const partSize = Math.ceil(fileContent.length / 5);
  
      // Upload each part.
      for (let i = 0; i < 5; i++) {
        const start = i * partSize;
        const end = start + partSize;
        uploadPromises.push(
          s3Client
            .send(
              new UploadPartCommand({
                Bucket: bucketName,
                Key: key,
                UploadId: uploadId,
                Body: fileContent.subarray(start, end),
                PartNumber: i + 1,
              }),
            )
            .then((d) => {
              console.log("Part", i + 1, "uploaded");
              return d;
            }).error(e => {
                console.log('Error uploading part')
                console.log(e)
                return e
            }),
        );
      }
  
      const uploadResults = await Promise.all(uploadPromises);
  
      return await s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: {
            Parts: uploadResults.map(({ ETag }, i) => ({
              ETag,
              PartNumber: i + 1,
            })),
          },
        }),
      );
  
      // Verify the output by downloading the file from the Amazon Simple Storage Service (Amazon S3) console.
      // Because the output is a 25 MB string, text editors might struggle to open the file.
    } catch (err) {
      console.error(err);
  
      if (uploadId) {
        const abortCommand = new AbortMultipartUploadCommand({
          Bucket: bucketName,
          Key: key,
          UploadId: uploadId,
        });
  
        await s3Client.send(abortCommand);
        return err;
      }
    }
  };

  const uploadImage = (tempPath, bucket, key, res) => {
    console.log(`Uploading ${tempPath} to ${bucket}/${key}`)
    const params = {
        Bucket: bucket,
        Key: `original/${key}`,
        Body: fs.createReadStream(tempPath)
    };
    
    // Upload the file to S3
    s3Client.upload(params, (err, data) => {
        if (err) {
            console.log('Error uploading file:', err);
            if (res) {
                res.status(500).send(err);
            }
        } else {
            console.log('File uploaded successfully. File location:', data.Location);
            if (res) {
                res.status(200).send({data:data, key:key})
            }
        }
    });
  }

  const put = async (fileContent, bucket, key, res) => {
    const uploadKey = `original/${key}`
    console.log(`Putting file to S3 bucket ${bucket} with key ${uploadKey} with filesize ${fileContent.length}`)
    return s3Client
    .send(
      new PutObjectCommand({
        Body: fileContent,
        Bucket: bucket,
        Key: uploadKey,
      })
    )
    .then((putObjectResponse) => {
      console.log(JSON.stringify(putObjectResponse));
      if (res) {
        res.status(200).send({ s3Response: putObjectResponse, key: key });
      }
    })
    .catch((e) => {
      console.log(e);
      if (res) {
        res.status(500).send(e.message);
      }
    });
  }
  
  module.exports = {
    upload, put, uploadImage
  }