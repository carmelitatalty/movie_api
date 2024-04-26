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
const USERNAME = "user20";
const PASSWORD = "password";
const EMAIL = "email@email.com";

const createUser = async () => {
  const customHeaders = {
    "Content-Type": "application/json",
  };
  const createUserResponse = await fetch(`http://localhost/api/users`, {
    method: "POST",
    headers: customHeaders,
    body: JSON.stringify({
      Username: USERNAME,
      Password: PASSWORD,
      Email: EMAIL,
    }),
  });
  if (createUserResponse.ok) {
    console.log(await createUserResponse.json());
  } else {
    console.log(`Response not ok ${createUserResponse.status}`);
    console.log(await createUserResponse.text());
  }
};

const uploadViaService = async () => {
  console.log("Uploading via service");
  const loginResponse = await fetch(`http://localhost/api/login?Username=${USERNAME}&Password=${PASSWORD}`, {
    method: "POST",
    body: {
      Username: USERNAME,
      Password: PASSWORD,
    },
  });
  console.log(loginResponse);
  const responseBody = await loginResponse.json();
  console.log(JSON.stringify(responseBody));

  const token = responseBody.token;

  // const fileName = "./sample.txt";
  const body = new FormData();
  const blob = new Blob([await fs.readFile(FILE_NAME)]);
  // const blob = new Blob([fileContent]);

  body.set("image", blob, FILE_NAME);

  const resp = await fetch("http://localhost/api/images", {
    method: "POST",
    body,
    headers: {
      Authorization: "Bearer " + token,
    },
  });

  console.log(
    "STATUS:",
    resp.status,
    "\nCONTENT TYPE:",
    resp.headers.get("content-type")
  );
  console.log("RAW BODY:", await resp.text());
};
// await uploadViaService()
// console.log("Done uploading via service")
// createUser().then(() => {
  uploadViaService().then(() => console.log("Done uploading via service"));
// });
// aws_s3
//   .upload("upload-dune-temp.jpg", BUCKET_NAME, FILE_NAME)
//   .then((result) => {
//     console.log(JSON.stringify(result));
//   });

// aws_s3.uploadImage(FILE_NAME, BUCKET_NAME, "upload-image-dune-temp.jpg", null);
