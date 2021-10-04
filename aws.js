const stream = require('stream');
const AWS = require('aws-sdk');
const fs = require('fs');

let accessKeyId, secretAccessKey;
let hasCacheSupport = false;
if (fs.existsSync('./config.json')){
  console.log('reading secrets from config.json...');
  accessKeyId = require('./config.json').accessKeyId;
  secretAccessKey = require('./config.json').secretAccessKey;
  if (accessKeyId && secretAccessKey) {
    console.log('read secrets from config.json ok');    
    hasCacheSupport = true;
  } else {
    throw new Error('read secrets from config.json failed');
  }
} else {
  console.log('reading secrets from env...');
  accessKeyId = process.env.accessKeyId;
  secretAccessKey = process.env.secretAccessKey;
  if (accessKeyId && secretAccessKey) {
    console.log('read secrets from env ok');    
    hasCacheSupport = true;
  } else {
    console.warn('read secrets from env failed');
  }
}

const awsConfig = new AWS.Config({
    credentials: new AWS.Credentials({
        accessKeyId,
        secretAccessKey,
    }),
    region: 'us-west-1',
});
const s3 = new AWS.S3(awsConfig);

const getObject = (bucket, key) => {
    return new Promise(async (resolve, reject) => {
        const params = { Bucket: bucket, Key: key };
        s3.getObject(params, (error, data) => {
            if (error) {
                reject(error)
            }
            else {
                resolve(data)
            }
        });
    })
}

const putObject = (bucket, key, data, type) => {
    return new Promise(async (resolve, reject) => {
        const params = { Body: data, Bucket: bucket, Key: key };
        if (type) {
          params['ContentType'] = type;
        }
        s3.putObject(params, (error, data) => {
            if (error) {
                reject(error)
            }
            else {
                resolve(data)
            }
        });
    })
}

const deleteObject = (bucket, key) => {
    return new Promise(async (resolve, reject) => {
        const params = { Bucket: bucket, Key: key };
        s3.deleteObject(params, (error, data) => {
            if (error) {
                reject(error)
            }
            else {
                console.log('got data', data);
                resolve(data)
            }
        });
    })
}

/* function uploadFromStream(bucket, key, type) {
  const pass = new stream.PassThrough();
  const params = { Bucket: bucket, Key: key, Body: pass };
  if (type) {
    params['ContentType'] = type;
  }
  s3.upload(params, function(err, data) {
    console.log('emit done', !!err, !!data);
    if (err) {
      pass.emit('error', err);
    } else {
      pass.emit('done', data);
    }
  });
  return pass;
} */

module.exports = {
  hasCacheSupport,
  getObject,
  putObject,
  deleteObject,
  // uploadFromStream,
}
