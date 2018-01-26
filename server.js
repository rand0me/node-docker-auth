const http = require('http');
const fs = require('fs');
const tar = require('tar-fs');
const zlib = require('zlib');

const ARCHIVE_FILE = 'docker.tar.gz';
const DOCKER_DIR = '.docker';
const DOCKER_FILE = 'config.json';
const REPO_URL  = process.env.REPO_URL;
const REPO_AUTH = process.env.REPO_AUTH;

const send404  = (res) => (res.statusCode = 404, res.end('Not found.'));
const sendFile = (path, res) => fs.createReadStream(path).pipe(res);
const requestHandler = (req, res) => req.url === `/${ARCHIVE_FILE}`
                     ? sendFile(`./${ARCHIVE_FILE}`, res)
                     : send404(res);
const createDockerAuth = () => new Promise((resolve, reject) => {
    fs.mkdir(DOCKER_DIR, () => fs.writeFile(`${DOCKER_DIR}/${DOCKER_FILE}`, JSON.stringify({
        auths: {
            [REPO_URL]: {
                auth: REPO_AUTH
            }
        }
    }, null, '  '), err => err ? reject(err) : resolve()));
});
const createTar = () => new Promise((resolve, reject) => {
    const archiveStream = fs.createWriteStream(ARCHIVE_FILE);
    const gzipStream = zlib.createGzip();
    archiveStream.on('end', resolve);
    tar.pack('./', { entries: [ `${DOCKER_DIR}/${DOCKER_FILE}`] }).pipe(gzipStream).pipe(archiveStream);
});


const server = http.createServer(requestHandler);
server.listen(process.env.PORT || 4040);

createDockerAuth()
    .then(createTar)
    .then(() => console.log(`Listening on ${process.env.PORT || 4040}`))
    .catch((err) => console.error(err));