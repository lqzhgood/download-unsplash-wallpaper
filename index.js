const Unsplash = require('unsplash-js').default;
const { toJson } = require('unsplash-js');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
global.fetch = require('node-fetch');
let request = require('request');

const Config = require(path.join(__dirname, './config'));
mkdirp.sync(Config.dir);
if (Config.proxy) request = request.defaults({ proxy: Config.proxy });

const unsplash = new Unsplash({
    AccessKey: Config.Unsplash.AccessKey,
    Secretkey: Config.Unsplash.Secretkey,
});

unsplash.photos
    .getRandomPhoto(Config.get)
    .then(toJson)
    .then(jsons => {
        let pArr = [];
        for (let i = 0; i < jsons.length; i++) {
            let pic = jsons[i];
            let custom = pic.urls.custom;
            pArr.push(downloadFile(custom, '_custom'));
            // let full = pic.urls.full;
            // downloadFile(full, '_full');
        }
        return Promise.all(pArr);
    })
    .then(d => {
        delExpire(Config.dir, Config.del.day, Config.del.num);
    })
    .catch(err => {
        console.log('err', err);
    });

function delExpire(dir, day, num) {
    try {
        let list = fs.readdirSync(dir);
        let arr = [];
        for (let i = 0; i < list.length; i++) {
            let file = path.join(dir, list[i]);
            let stat = fs.statSync(file);
            if (stat.ctimeMs > Date.now() + Config.del.day * 24 * 3600 * 1000) {
                fs.unlinkSync(file);
            } else {
                arr.push({
                    dir: file,
                    stat,
                });
            }
        }
        arr = arr.sort((a, b) => {
            return b.stat.ctimeMs - a.stat.ctimeMs;
        });
        arr.slice(num).forEach(f => {
            fs.unlinkSync(f.dir);
        });
    } catch (e) {
        console.log('delExpire Error', e.message);
    }
}

function downloadFile(uri, tag = '') {
    return new Promise((resolve, reject) => {
        request(uri)
            .on('response', res => {
                let filename = res.req.path.match(/[^/]+\w+?(?=\?)/)[0];
                let type = res.headers['content-type'].split('/')[1];
                console.log('res', `./${filename}${tag}.${type}`);
                res.pipe(fs.createWriteStream(path.join(Config.dir, `./${filename}${tag}.${type}`))).on('close', () => {
                    resolve();
                });
            })
            .on('error', err => {
                console.log('down', err);
                reject(err);
            });
    });
}
