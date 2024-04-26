const aws_s3 = require("./aws-s3.js");
const fs = require("fs");


// import { readFile } from "node:fs/promises";
// const readFile = require("node:fs/promises")

const BUCKET_NAME = "2-6-images";
const FILE_NAME = "/tmp/dune.jpg";
// aws_s3.uploadImage('/tmp/dune.jpg', '2-6-images', 'dune-temp.jpg', null)
const fileContent = fs.readFileSync(FILE_NAME);
// aws_s3.put(fileContent, BUCKET_NAME, "put-dune-temp.jpg", null).then(() => {
//   console.log(`Finished put`);
// });

const uploadViaService = async () => {
    console.log('Uploading via service')
    const loginResponse = await fetch("http://localhost/api/login", {method: "POST", body: {
        Username: 'user24',
        Password: 'myPassword'
    }})
    console.log(JSON.stringify(loginResponse))
    console.log(loginResponse)
    
    const token = loginResponse.token;
    
    // const fileName = "./sample.txt";
    const body = new FormData();
    // const blob = new Blob([await fs.readFile(FILE_NAME)]);
    const blob = new Blob([fileContent])
    
    body.set("image", blob, FILE_NAME);
    
    const resp = await fetch("http://localhost/api/images", {
      method: "POST",
      body,
      headers: {
        Authorization: 'Bearer ' + token,
      }
    });
    
    console.log(
        "STATUS:",
        resp.status,
        "\nCONTENT TYPE:",
        resp.headers.get("content-type"),
      );
      console.log("RAW BODY:", await resp.text());
}
// await uploadViaService()
// console.log("Done uploading via service")
uploadViaService().then(() => console.log("Done uploading via service"))
// aws_s3
//   .upload("upload-dune-temp.jpg", BUCKET_NAME, FILE_NAME)
//   .then((result) => {
//     console.log(JSON.stringify(result));
//   });

// aws_s3.uploadImage(FILE_NAME, BUCKET_NAME, "upload-image-dune-temp.jpg", null);
